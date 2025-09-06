import { eventBus } from "../core/event-bus";
import { CmdCast, CmdJoin, CmdMove, CmdType } from "../core/types/cmd.type";
import { World } from "../core/world";
import { Vec2 } from "../core/types/vec2.type";
import { SpawnManager } from "../core/spawn-manager";
import { Player } from "../entities/player";
import {
  PlayerJoinedEvent,
  SessionStartedEvent,
  PlayerMoveCmdEvent,
  PlayerCastCmdEvent,
  PlayerLeaveCmdEvent,
  PlayerAimCmdEvent,
  PlayerRespawnCmdEvent
} from "../events";
import { matchSystem } from "../systems/match.js";
import WebSocket, { WebSocketServer } from "ws";
import { hudClear, hudSubscribe, hudUnsubscribe } from "../net/broadcaster";
import { hudSystem } from "../hud/hud-system";
import type { WidgetKey } from "../hud/types";

const DEFAULT_WS_PORT = 8081;

// Original spawn points adjusted to respect margins
const ORIGINAL_SPAWN_POINTS: Vec2[] = [
  { x: 100, y: 100 },
  { x: 1800, y: 100 },
  { x: 100, y: 1000 },
  { x: 1800, y: 1000 },
];

// Create spawn manager for players with smaller margins since they are more strategic
const playerSpawnManager = new SpawnManager({
  minDistanceFromPlayers: 120, // Less distance required for players
  margins: {
    left: 80,
    right: 80,
    top: 80,
    bottom: 80,
  },
});

// Adjust original spawn points to respect margins and use as fallbacks
const SAFE_SPAWN_POINTS = playerSpawnManager.adjustSpawnPointsToMargins(ORIGINAL_SPAWN_POINTS);

function randomSpawn(): Vec2 { 
  // Try to find a safe position first
  const safePos = playerSpawnManager.findSafeSpawnPosition();
  
  // If safe position found, use it, otherwise fallback to adjusted spawn points
  if (playerSpawnManager.isWithinSpawnBounds(safePos) && !playerSpawnManager.isPositionBlocked(safePos)) {
    return safePos;
  }
  
  // Fallback to one of the safe spawn points
  return { ...SAFE_SPAWN_POINTS[Math.floor(Math.random() * SAFE_SPAWN_POINTS.length)] };
}

const START_VEL: Vec2 = { x: 0, y: 0 };

const connToPlayer = new WeakMap<WebSocket, string>();
const playerToConn = new Map<string, WebSocket>();
const playerNames = new Map<string, string>();
const deadUntil = new Map<string, number>();

export function createWsServer(serverOrPort: number | import('node:http').Server = DEFAULT_WS_PORT) {
  let wss: WebSocketServer;
  if (typeof serverOrPort === 'number') {
    wss = new WebSocketServer({ port: serverOrPort });
  } else {
    wss = new WebSocketServer({ server: serverOrPort });
  }

  // Track death timestamps and notify the dead player with a respawn timestamp
  eventBus.on('player:die', (e: { type: 'player:die'; playerId: string }) => {
    const until = Date.now() + 5000;
    deadUntil.set(e.playerId, until);
    const ws = playerToConn.get(e.playerId);
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'player:dead', until }));
    }
  });

  // Log listening info only when port is passed directly (attached server logs from HTTP module)
  if (typeof serverOrPort === 'number') {
    console.log(`WS listening ws://localhost:${serverOrPort}`);
  }

  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (raw) => {
      let msg: { type: CmdType };
      try { msg = JSON.parse(String(raw)); } catch { return; }

      // HUD subscription commands (connection-scoped)
      if (msg.type === 'cmd:hud:subscribe') {
        const maybe = (msg as { widgets?: unknown }).widgets;
        const widgets = Array.isArray(maybe) && maybe.every((s): s is string => typeof s === 'string') ? maybe : [];
        const ALLOWED_WIDGET_KEYS = new Set<WidgetKey>(['scoreboard','match','feed','streaks','announcements']);
        const keys = widgets.filter((w): w is WidgetKey => ALLOWED_WIDGET_KEYS.has(w as WidgetKey));
        hudSubscribe(ws, keys);
        // Send immediate snapshots for each requested widget
        for (const w of keys) hudSystem.pushInitialFor(w, ws);
        return;
      }
      if (msg.type === 'cmd:hud:unsubscribe') {
        const maybe = (msg as { widgets?: unknown }).widgets;
        const widgets = Array.isArray(maybe) && maybe.every((s): s is string => typeof s === 'string') ? maybe : [];
        const ALLOWED_WIDGET_KEYS = new Set<WidgetKey>(['scoreboard','match','feed','streaks','announcements']);
        const keys = widgets.filter((w): w is WidgetKey => ALLOWED_WIDGET_KEYS.has(w as WidgetKey));
        hudUnsubscribe(ws, keys);
        return;
      }

      // if (msg?.type?.startsWith('cmd:')) eventBus.emit({ ...msg, _ws: ws });
      if (msg.type === 'cmd:join') {
        const cmd = msg as CmdJoin;
        const id = crypto.randomUUID();
        const name = cmd.name || 'Anon';

        const spawn = randomSpawn();
        const player = new Player(id, name, spawn, START_VEL);
        World.players.set(id, player);

        connToPlayer.set(ws, id);
        playerToConn.set(id, ws);
        playerNames.set(id, name);
        deadUntil.delete(id);
        const playersInfo: { id: string; name: string; pos: Vec2 }[] = [];

        // Send information about other players only to this client

        for (const [pid, player] of World.players.entries()) {
          if (pid === id) continue;
          ws.send(new PlayerJoinedEvent(pid, player.name).toString());
          if (pid !== id) {
            playersInfo.push({ id: pid, name: player.name, pos: { ...player.pos } });
          }
        }

        // Get current match info for the session
        const currentMatch = matchSystem.getCurrentMatch();
        const matchInfo = currentMatch ? {
          id: currentMatch.id,
          mode: currentMatch.mode,
          phase: currentMatch.phase,
          startsAt: currentMatch.startsAt,
          endsAt: currentMatch.endsAt,
        } : undefined;

        // Always send session:started to the joining client (players list may be empty)
        ws.send(new SessionStartedEvent(name, id, playersInfo, matchInfo).toString());

        eventBus.emit(new PlayerJoinedEvent(id, name).toEmit());
        return;
      }

      const id = connToPlayer.get(ws);
      if (!id) return;

      if (msg.type === 'cmd:move') {
        const cmd = msg as CmdMove;
        eventBus.emit(new PlayerMoveCmdEvent(id, cmd.dir).toEmit());
        return
      }

      if (msg.type === 'cmd:cast') {
        const cmd = msg as CmdCast;
        eventBus.emit(new PlayerCastCmdEvent(id, cmd.skill).toEmit());
        return
      }

      if (msg.type === 'cmd:respawn') {
        // First emit the respawn command event
        eventBus.emit(new PlayerRespawnCmdEvent(id).toEmit());
        
        const now = Date.now();
        const until = deadUntil.get(id) ?? 0;
        const existingPlayer = World.players.get(id);
        if (existingPlayer && !existingPlayer.isDead) return; // already alive
        if (now < until) return; // cooldown not finished
        const name = playerNames.get(id) || 'Anon';
        const spawn = randomSpawn();
        
        if (existingPlayer) {
          // Use the Player class respawn method (preserves scores automatically)
          existingPlayer.respawn(spawn);
        } else {
          // Create new player (shouldn't happen but failsafe)
          const newPlayer = new Player(id, name, spawn, START_VEL);
          World.players.set(id, newPlayer);
        }
        
        deadUntil.delete(id);
        // Broadcast as a normal join so all clients (including self) re-add the player
        eventBus.emit(new PlayerJoinedEvent(id, name).toEmit());
        return;
      }

      if (msg.type === 'cmd:aim') {
        const data = msg as { type: 'cmd:aim'; dir: Vec2 };
        const p = World.players.get(id);
        if (!p) return;
        
        // Use Player class method to set face direction
        p.setFaceDirection(data.dir);
        
        // Emit the aim command event
        eventBus.emit(new PlayerAimCmdEvent(id, p.faceTarget!).toEmit());
        return;
      }

      if (msg.type?.startsWith('cmd:')) console.log(`Unhandled command ${msg.type}: ${msg}`); // TODO What to do here

    });

    ws.on('close', () => {
      const id = connToPlayer.get(ws);
      // clear HUD subscriptions for this socket
      hudClear(ws);
      if (id) {
        connToPlayer.delete(ws);
        playerToConn.delete(id);
        playerNames.delete(id);
        deadUntil.delete(id);
        eventBus.emit(new PlayerLeaveCmdEvent(id).toEmit());
      }
    });

    ws.send(JSON.stringify({ type: 'connected', ts: Date.now() }));
    // Send map to this client
    try {
      ws.send(JSON.stringify({ type: 'map:loaded', obstacles: World.map.obstacles }));
      // also send currently spawned pickups so late joiners see them
      for (const pk of World.pickups.values()) {
        ws.send(JSON.stringify({ type: 'pickup:spawned', id: pk.id, pos: pk.pos, kind: pk.kind }));
      }
    } catch (err) {
      console.warn('Failed to send map/pickups:', err);
    }
  });

  return wss;
}
