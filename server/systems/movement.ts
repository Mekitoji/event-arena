import { eventBus } from "../core/event-bus";
import { TCmdLeaveEvent, TPlayerJoinEvent, TTickPreEvent } from "../core/types/events.type";
import { World } from "../core/world";
import {
  ProjectileDespawnedEvent,
  ProjectileMovedEvent,
  ProjectileBouncedEvent,
  DashEndedEvent,
  ExplosionSpawnedEvent,
  PlayerMovedEvent,
  PlayerAimedEvent
} from "../events";
import { Config } from "../config";

const EPS = Config.combat.movementThreshold; // Minimum movement threshold to broadcast
const lastBroadcastPos = new Map<string, { x: number; y: number }>();
const lastFace = new Map<string, { x: number; y: number }>();
const MAX_TURN_SPEED = Config.player.turnSpeed; // rad/s (from config)
const dashing = new Set<string>();

// Heartbeat (anti-stall): periodically rebroadcast positions to mitigate packet loss
const HB_INTERVAL_MS = Config.combat.heartbeatInterval; // ~250–300 ms
let hbAccumMs = 0;
const lastHBPos = new Map<string, { x: number; y: number }>();

function rotateToward(u: { x: number; y: number }, v: { x: number; y: number }, maxStep: number) {
  // assumes u is unit, v is unit
  const dot = Math.max(-1, Math.min(1, u.x * v.x + u.y * v.y));
  const ang = Math.acos(dot);
  if (ang <= maxStep) return { x: v.x, y: v.y };
  // perpendicular to u
  const n = { x: -u.y, y: u.x };
  const sign = (v.x * n.x + v.y * n.y) >= 0 ? 1 : -1;
  const cs = Math.cos(maxStep), sn = Math.sin(maxStep) * sign;
  return { x: cs * u.x + sn * n.x, y: cs * u.y + sn * n.y };
}

// basic AABB helpers
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function resolveCircleRect(px: number, py: number, r: number, rx: number, ry: number, rw: number, rh: number) {
  // find closest point on rect to circle center
  const cx = clamp(px, rx, rx + rw);
  const cy = clamp(py, ry, ry + rh);
  const dx = px - cx;
  const dy = py - cy;
  const dist2 = dx * dx + dy * dy;
  if (dist2 > r * r) return { px, py, collided: false };
  const dist = Math.sqrt(dist2) || 1;
  const nx = dx / dist, ny = dy / dist;
  // push out by penetration
  const pen = r - dist;
  return { px: px + nx * pen, py: py + ny * pen, collided: true };
}

function resolveCircleWorld(px: number, py: number, r: number) {
  let outx = px, outy = py; let hit = false;
  for (const ob of World.map.obstacles) {
    if (ob.type !== 'rect') continue;
    const res = resolveCircleRect(outx, outy, r, ob.x, ob.y, ob.w, ob.h);
    if (res.collided) { outx = res.px; outy = res.py; hit = true; }
  }
  return { x: outx, y: outy, hit };
}

function checkPointInRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number) {
  return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
}

function collideProjectile(pr: { pos: { x: number, y: number }, vel: { x: number, y: number }, kind?: string }) {
  // after position update, if inside any rect, compute normal and bounce/delete
  for (const ob of World.map.obstacles) {
    if (ob.type !== 'rect') continue;
    if (checkPointInRect(pr.pos.x, pr.pos.y, ob.x, ob.y, ob.w, ob.h)) {
      // normal by smallest penetration; sample distances to each side
      const leftPen = Math.abs(pr.pos.x - ob.x);
      const rightPen = Math.abs((ob.x + ob.w) - pr.pos.x);
      const topPen = Math.abs(pr.pos.y - ob.y);
      const botPen = Math.abs((ob.y + ob.h) - pr.pos.y);
      const minPen = Math.min(leftPen, rightPen, topPen, botPen);
      let nx = 0, ny = 0;
      if (minPen === leftPen) { nx = -1; ny = 0; pr.pos.x = ob.x - 0.01; }
      else if (minPen === rightPen) { nx = 1; ny = 0; pr.pos.x = ob.x + ob.w + 0.01; }
      else if (minPen === topPen) { nx = 0; ny = -1; pr.pos.y = ob.y - 0.01; }
      else { nx = 0; ny = 1; pr.pos.y = ob.y + ob.h + 0.01; }
      return { hit: true, normal: { x: nx, y: ny } };
    }
  }
  return { hit: false };
}

eventBus.on('tick:pre', ({ dt }: TTickPreEvent) => {
  for (const p of World.players.values()) {
    if (p.isDeadPlayer()) continue; // Skip movement for dead players
    const oldX = p.pos.x, oldY = p.pos.y;

    // Effective speed (movement + knockback if active)
    let vx = p.vel.x, vy = p.vel.y;
    // dash boost
    const now = Date.now();
    const dashActive = p.dashUntil && p.dashUntil > now;
    if (dashActive && p.dashFactor) {
      vx *= p.dashFactor;
      vy *= p.dashFactor;
    }
    // Emit dash ended when state transitions
    if (!dashActive && dashing.has(p.id)) {
      dashing.delete(p.id);
      eventBus.emit(new DashEndedEvent(p.id).toEmit());
    } else if (dashActive && !dashing.has(p.id)) {
      dashing.add(p.id);
    }
    if (p.kb && p.kb.until > Date.now()) {
      vx += p.kb.vx;
      vy += p.kb.vy;
    } else if (p.kb && p.kb.until <= Date.now()) {
      p.kb = undefined;
    }

    // Integration + collisions with obstacles (player radius ~16)
    // Use substeps to avoid tunneling at higher speeds (e.g., with haste/dash)
    const rr = Config.player.radius; // player radius in world units
    const moveDist = Math.hypot(vx, vy) * dt;
    const MAX_STEP = 6; // world units per substep
    const steps = Math.max(1, Math.ceil(moveDist / MAX_STEP));
    const subDt = dt / steps;
    for (let i = 0; i < steps; i++) {
      p.pos.x = Math.max(0, Math.min(World.bounds.w, p.pos.x + vx * subDt));
      p.pos.y = Math.max(0, Math.min(World.bounds.h, p.pos.y + vy * subDt));
      const solved = resolveCircleWorld(p.pos.x, p.pos.y, rr);
      p.pos.x = solved.x; p.pos.y = solved.y;
    }

    // Rotate face toward the target direction with limited speed
    if (p.face && p.faceTarget) {
      // normalize current just in case
      const fm = Math.hypot(p.face.x, p.face.y) || 1;
      const f = { x: p.face.x / fm, y: p.face.y / fm };
      const tm = Math.hypot(p.faceTarget.x, p.faceTarget.y) || 1;
      const t = { x: p.faceTarget.x / tm, y: p.faceTarget.y / tm };
      const step = MAX_TURN_SPEED * dt;
      const nf = rotateToward(f, t, step);
      p.face = nf;
    }

    // If actually moved — check against the last broadcast position
    const lb = lastBroadcastPos.get(p.id);
    const movedNow = Math.abs(p.pos.x - oldX) > EPS || Math.abs(p.pos.y - oldY) > EPS;
    const changedSinceLastSend =
      !lb ||
      Math.abs(p.pos.x - lb.x) > EPS ||
      Math.abs(p.pos.y - lb.y) > EPS;

    const lf = lastFace.get(p.id);
    const faceChanged =
      !lf || Math.abs((p.face?.x ?? 0) - lf.x) > 1e-3 || Math.abs((p.face?.y ?? 0) - lf.y) > 1e-3;

    if (movedNow && changedSinceLastSend) {
      lastBroadcastPos.set(p.id, { x: p.pos.x, y: p.pos.y });
      eventBus.emit(new PlayerMovedEvent(p.id, { ...p.pos }).toEmit());
    }
    if (faceChanged && p.face) {
      lastFace.set(p.id, { x: p.face.x, y: p.face.y });
      eventBus.emit(new PlayerAimedEvent(p.id, { x: p.face.x, y: p.face.y }).toEmit());
    }
  }

  // Heartbeat: rebroadcast positions every HB_INTERVAL_MS for players that changed since last heartbeat
  hbAccumMs += dt * 1000;
  if (hbAccumMs >= HB_INTERVAL_MS) {
    hbAccumMs = 0;
    for (const p of World.players.values()) {
      if (p.isDeadPlayer()) continue; // Skip heartbeat for dead players
      const prev = lastHBPos.get(p.id);
      if (!prev || Math.abs(prev.x - p.pos.x) > 0.01 || Math.abs(prev.y - p.pos.y) > 0.01) {
        eventBus.emit(new PlayerMovedEvent(p.id, { ...p.pos }).toEmit());
        lastHBPos.set(p.id, { x: p.pos.x, y: p.pos.y });
      }
    }
  }

  // Projectiles logic
  const projectilesToRemove: string[] = [];

  for (const pr of World.projectiles.values()) {
    // Update projectile position using class method
    pr.update(dt);

    // Check for expiration due to lifetime
    if (pr.isExpired()) {
      // If a rocket expires (i.e., reached its max lifetime without hitting), explode at its current position
      if (pr.kind === 'rocket') {
        eventBus.emit(new ExplosionSpawnedEvent({ ...pr.pos }, Config.getExplosionRadius(), Config.getExplosionDamage()).toEmit());
      }
      projectilesToRemove.push(pr.id);
      continue;
    }

    // Collision with obstacles
    const col = collideProjectile(pr);
    if (col.hit) {
      if (pr.shouldExplodeOnCollision()) {
        // rocket handled in combat loop when colliding with players; for walls, explode here
        // emulate tick:post logic: remove projectile and emit explosion (reuse damage system by emitting event)
        projectilesToRemove.push(pr.id);
        eventBus.emit(new ExplosionSpawnedEvent({ ...pr.pos }, Config.getExplosionRadius(), Config.getExplosionDamage()).toEmit());
        continue;
      } else {
        // Try to bounce using class method
        const n = col.normal!;
        const bounced = pr.bounce(n);
        if (bounced) {
          eventBus.emit(new ProjectileBouncedEvent(pr.id, n).toEmit());
        } else {
          // Can't bounce anymore, remove projectile
          projectilesToRemove.push(pr.id);
          continue;
        }
      }
    }

    // If went out of bounds — remove and notify
    if (pr.isOutOfBounds(World.bounds.w, World.bounds.h)) {
      projectilesToRemove.push(pr.id);
    } else {
      // Otherwise send new position
      eventBus.emit(new ProjectileMovedEvent(pr.pos, pr.id).toEmit());
    }
  }

  // Remove expired/out-of-bounds projectiles
  for (const id of projectilesToRemove) {
    World.projectiles.delete(id);
    eventBus.emit(new ProjectileDespawnedEvent(id).toEmit());
  }
});

// Reset per-player caches on join
eventBus.on('player:join', (e: TPlayerJoinEvent) => {
  lastBroadcastPos.delete(e.playerId);
  lastFace.delete(e.playerId);
  lastHBPos.delete(e.playerId);
});

// Clean up tracking data when players leave
eventBus.on('cmd:leave', (e: TCmdLeaveEvent) => {
  lastBroadcastPos.delete(e.playerId);
  lastFace.delete(e.playerId);
  lastHBPos.delete(e.playerId);
  dashing.delete(e.playerId);
});
