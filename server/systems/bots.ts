import { eventBus } from '../core/event-bus';
import { World } from '../core/world';
import { Player } from '../entities/player';
import { SpawnManager } from '../core/spawn-manager';
import { Vec2 } from '../core/types/vec2.type';
import { Skills } from '../core/types/cmd.type';
import { Config } from '../config';
import {
  PlayerJoinedEvent,
  PlayerAimCmdEvent,
  PlayerMoveCmdEvent,
  PlayerCastCmdEvent,
} from '../events';
import { TCmdLeaveEvent, TPlayerDieEvent } from '../core/types/events.type';

interface BotState {
  id: string;
  name: string;
  nextThinkAt: number;
  nextFireAt: number;
  lastMoveDir?: Vec2; // Track last movement direction to avoid spam
  lastAimDir?: Vec2; // Track last aim direction to avoid spam
}

export class BotManager {
  private readonly BOT_COUNT = 2;
  private readonly THINK_INTERVAL_MS = 500;
  private readonly FIRE_COOLDOWN_MS = Config.cooldowns.shoot;
  private readonly MAX_SHOOT_RANGE = 800;
  private readonly SEP_RADIUS = 120;
  private readonly SEP_STRENGTH = 0.7;

  private readonly spawnManager = new SpawnManager({
    minDistanceFromPlayers: 220,
  });
  private readonly botIds = new Set<string>();
  private readonly bots = new Map<string, BotState>();

  constructor() {
    // Defer initial spawn so World is populated
    setTimeout(() => this.ensureBots(), 1500);

    // Respawn on death
    eventBus.on('player:die', (e: TPlayerDieEvent) => {
      if (!this.botIds.has(e.playerId)) return;
      const p = World.players.get(e.playerId);
      if (!p) return;
      setTimeout(() => {
        const still = World.players.get(e.playerId);
        if (!still) return;
        const pos = this.spawnManager.findSafeSpawnPosition();
        still.respawn(pos);
        eventBus.emit(new PlayerJoinedEvent(still.id, still.name).toEmit());
      }, 5000);
    });

    // AI loop
    eventBus.on('tick:pre', () => this.onTick());

    // Clean up bot tracking on leave
    eventBus.on('cmd:leave', (e: TCmdLeaveEvent) => {
      if (this.botIds.has(e.playerId)) {
        this.botIds.delete(e.playerId);
        this.bots.delete(e.playerId);
      }
    });
  }

  private randomName(): string {
    const n = Math.floor(Math.random() * 900) + 100;
    return `Bot-${n}`;
  }

  private spawnBot(): string {
    const id = crypto.randomUUID();
    const name = this.randomName();
    const pos = this.spawnManager.findSafeSpawnPosition();
    const player = new Player(id, name, pos, { x: 0, y: 0 }, { x: 1, y: 0 });
    World.players.set(id, player);
    eventBus.emit(new PlayerJoinedEvent(id, name).toEmit());

    const now = Date.now();
    this.botIds.add(id);
    this.bots.set(id, {
      id,
      name,
      nextThinkAt: now + Math.floor(Math.random() * this.THINK_INTERVAL_MS),
      nextFireAt: now + this.FIRE_COOLDOWN_MS,
    });
    return id;
  }

  private ensureBots() {
    const current = Array.from(this.botIds).filter((id) =>
      World.players.has(id),
    ).length;
    for (let i = current; i < this.BOT_COUNT; i++) this.spawnBot();
  }

  private findNearestHuman(fromId: string): { id: string; pos: Vec2 } | null {
    const me = World.players.get(fromId);
    if (!me) return null;
    let best: { id: string; pos: Vec2 } | null = null;
    let bestDist = Infinity;
    for (const [pid, p] of World.players) {
      if (pid === fromId) continue;
      if (this.botIds.has(pid)) continue;
      if (p.isDeadPlayer()) continue;
      const d = Math.hypot(p.pos.x - me.pos.x, p.pos.y - me.pos.y);
      if (d < bestDist) {
        bestDist = d;
        best = { id: pid, pos: p.pos };
      }
    }
    return best;
  }

  private sameDir(a: Vec2, b: Vec2): boolean {
    const EPSILON = 0.001;
    return Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON;
  }

  private emitMoveIfChanged(botId: string, dir: Vec2) {
    const state = this.bots.get(botId);
    if (!state) return;

    // Only emit if direction actually changed
    if (!state.lastMoveDir || !this.sameDir(dir, state.lastMoveDir)) {
      eventBus.emit(new PlayerMoveCmdEvent(botId, dir).toEmit());
      state.lastMoveDir = { ...dir };
    }
  }

  private emitAimIfChanged(botId: string, dir: Vec2) {
    const state = this.bots.get(botId);
    if (!state) return;
    if (!state.lastAimDir || !this.sameDir(dir, state.lastAimDir)) {
      eventBus.emit(new PlayerAimCmdEvent(botId, dir).toEmit());
      state.lastAimDir = { ...dir };
    }
  }

  private separationVector(botId: string): Vec2 {
    const me = World.players.get(botId);
    if (!me) return { x: 0, y: 0 };
    let sx = 0,
      sy = 0;
    for (const otherId of this.botIds) {
      if (otherId === botId) continue;
      const other = World.players.get(otherId);
      if (!other || other.isDeadPlayer()) continue;
      const dx = me.pos.x - other.pos.x;
      const dy = me.pos.y - other.pos.y;
      const d = Math.hypot(dx, dy);
      if (d > 0 && d < this.SEP_RADIUS) {
        const w = (this.SEP_RADIUS - d) / this.SEP_RADIUS;
        sx += (dx / d) * w;
        sy += (dy / d) * w;
      }
    }
    return { x: sx, y: sy };
  }

  private aimAndMoveTowards(botId: string, targetPos: Vec2) {
    const me = World.players.get(botId);
    if (!me) return;
    const dx = targetPos.x - me.pos.x;
    const dy = targetPos.y - me.pos.y;
    const mag = Math.hypot(dx, dy) || 1;
    let dir = { x: dx / mag, y: dy / mag };

    const sep = this.separationVector(botId);
    const mixx = dir.x + this.SEP_STRENGTH * sep.x;
    const mixy = dir.y + this.SEP_STRENGTH * sep.y;
    const mixmag = Math.hypot(mixx, mixy) || 1;
    dir = { x: mixx / mixmag, y: mixy / mixmag };

    const aimDir = { x: dx / mag, y: dy / mag };
    this.emitAimIfChanged(botId, aimDir);
    this.emitMoveIfChanged(botId, dir);
  }

  private maybeShoot(botId: string, targetPos: Vec2, now: number) {
    const me = World.players.get(botId);
    if (!me) return;
    const b = this.bots.get(botId);
    if (!b) return;
    if (now < b.nextFireAt) return;

    const dx = targetPos.x - me.pos.x;
    const dy = targetPos.y - me.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist > this.MAX_SHOOT_RANGE) return;

    const aim = me.faceTarget ?? me.face;
    const amag = Math.hypot(aim.x, aim.y) || 1;
    const ax = aim.x / amag,
      ay = aim.y / amag;
    const nx = dx / (dist || 1),
      ny = dy / (dist || 1);
    const dot = ax * nx + ay * ny;
    if (dot < 0.7) return;

    eventBus.emit(new PlayerCastCmdEvent(botId, Skills.SHOOT).toEmit());
    b.nextFireAt = now + this.FIRE_COOLDOWN_MS;
  }

  private onTick() {
    const now = Date.now();
    for (const id of this.botIds) {
      const me = World.players.get(id);
      if (!me || me.isDeadPlayer()) continue;

      const state = this.bots.get(id);
      if (!state) continue;

      if (now >= state.nextThinkAt) {
        state.nextThinkAt = now + this.THINK_INTERVAL_MS;
        const target = this.findNearestHuman(id);
        if (target) {
          this.aimAndMoveTowards(id, target.pos);
          if (now >= state.nextFireAt) this.maybeShoot(id, target.pos, now);
        } else {
          // Only emit stop movement if direction changed
          this.emitMoveIfChanged(id, { x: 0, y: 0 });
        }
      } else {
        // Only attempt to shoot if we're off cooldown to avoid unnecessary target search
        if (now >= state.nextFireAt) {
          const target = this.findNearestHuman(id);
          if (target) this.maybeShoot(id, target.pos, now);
        }
      }
    }
  }
}

// Singleton instance
export const botManager = new BotManager();
