import { WebSocketServer } from "ws";
import { SourceEventType } from "../core/types/events.type";
import { eventBus } from "../core/event-bus";
import { TEvent } from "../core/types";

const SOURCE_EVENT_TYPES = [
  "player:join",
  "player:move",
  "player:aimed",
  "player:die",
  "player:kill",
  "player:leave",
  "projectile:spawned",
  "projectile:moved",
  "projectile:despawned",
  "projectile:bounced",
  "damage:applied",
  "explosion:spawned",
  "knockback:applied",
  "dash:started",
  "dash:ended",
  "pickup:spawned",
  "pickup:collected",
  "buff:applied",
  "buff:expired",
  "match:created",
  "match:started",
  "match:ended",
  "score:update",
  "feed:entry",
  "streak:changed",
] as const satisfies readonly SourceEventType[];

const broadcastTypes = new Set(...[SOURCE_EVENT_TYPES]);

let _wss: WebSocketServer | null = null;

export function attachBroadcaster(wss: WebSocketServer) {
  _wss = wss;
  for (const t of broadcastTypes) {
    eventBus.on(t, (e: TEvent) => {
      const payload = JSON.stringify(e);
      for (const client of wss.clients) {
        // 1 === Open connection
        if (client.readyState !== 1) continue;
        // Buffer is full
        if (client.bufferedAmount > 1_000_000) continue;

        client.send(payload);
      }
    })
  }
}

// Direct broadcast function for manual event sending
export function broadcast(message: object) {
  if (!_wss) {
    console.warn('Broadcaster not attached to WebSocket server');
    return;
  }

  const payload = JSON.stringify(message);
  for (const client of _wss.clients) {
    if (client.readyState === 1 && client.bufferedAmount <= 1_000_000) {
      try {
        client.send(payload);
      } catch (e) {
        console.error('Broadcast send error:', e);
      }
    }
  }
}
