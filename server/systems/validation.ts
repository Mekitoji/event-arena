import { eventBus } from "../core/event-bus";
import { CmdJoin, Skills } from "../core/types/cmd.type";
import { TCmdMoveEvent, TCmdCastEvent, TCmdLeaveEvent } from "../core/types/events.type";
import { Vec2 } from "../core/types/vec2.type";
import { World } from "../core/world";
import { Player } from "../entities/player";
import { Projectile } from "../entities/projectile";
import {
  PlayerDiedEvent,
  PlayerJoinedEvent,
  ProjectileSpawnedEvent,
  DashStartedEvent
} from "../events";

const DEFAULT_POS: Vec2 = { x: 100, y: 100 };
const DEFAULT_VEL: Vec2 = { x: 0, y: 0 };
const DEFAULT_FACE: Vec2 = { x: 0, y: 0 };
// const DEFAULT_HP = 100; // Currently unused but kept for future use
const DEFAULT_SPEED = 300;


eventBus.on('cmd:join', (e: CmdJoin) => {
  const id = crypto.randomUUID();

  const { name = 'Anon' } = e;

  const player = new Player(
    id,
    name,
    { ...DEFAULT_POS },
    { ...DEFAULT_VEL },
    { ...DEFAULT_FACE }
  );
  
  World.players.set(id, player);
  eventBus.emit(new PlayerJoinedEvent(id, name).toEmit());
});

eventBus.on('cmd:move', (e: TCmdMoveEvent) => {
  const player = World.players.get(e.playerId);
  if (!player || player.isDeadPlayer()) return;

  const { x, y } = e.dir;

  const len = Math.hypot(x, y) || 1;
  // update velocity with haste if active
  const speed = (player.hasteUntil && player.hasteUntil > Date.now() && player.hasteFactor) ? DEFAULT_SPEED * player.hasteFactor : DEFAULT_SPEED;
  player.vel = { x: (x / len) * speed, y: (y / len) * speed };
});

// systems/validation.ts
eventBus.on('cmd:cast', (e: TCmdCastEvent) => {
  const p = World.players.get(e.playerId);
  if (!p || p.isDeadPlayer()) return;

  const now = Date.now();
  const cdKey = `cd:${e.skill}`;

  // параметры по умолчанию
  const baseSpeed = 600;

  if (e.skill === Skills.SHOOT) {
    // проверка кулдауна
    if ((p.cd[cdKey] ?? 0) > now) return;
    p.cd[cdKey] = now + 500; // 0,5с кулдаун

    // расчёт направления выстрела
    const dir = p.face ?? (p.vel.x || p.vel.y ? p.vel : { x: 1, y: 0 });
    const mag = Math.hypot(dir.x, dir.y) || 1;
    const vel = { x: (dir.x / mag) * baseSpeed, y: (dir.y / mag) * baseSpeed };

    const id = crypto.randomUUID();
    const pos = { ...p.pos };
    const projectile = new Projectile({
      id,
      owner: p.id,
      pos,
      vel,
      kind: 'bullet'
    });
    World.projectiles.set(id, projectile);
    eventBus.emit(new ProjectileSpawnedEvent(id, p.id, pos, vel, 'bullet').toEmit());
    
    // Track shot fired for accuracy
    p.addShotFired();
    return;
  }

  if (e.skill === Skills.SHOTGUN) {
    // более длинный кулдаун для дробовика
    if ((p.cd[cdKey] ?? 0) > now) return;
    p.cd[cdKey] = now + 1000; // 1с кулдаун

    // направление взгляда
    const face = p.face ?? { x: 1, y: 0 };
    const fmag = Math.hypot(face.x, face.y) || 1;
    const fx = face.x / fmag, fy = face.y / fmag;

    // база ортогонали для смещения угла
    const pelletCount = 5;
    const maxSpread = 0.25; // радиан +- ~14°

    for (let i = 0; i < pelletCount; i++) {
      // равномерное распределение углов внутри [-maxSpread, +maxSpread]
      const t = pelletCount <= 1 ? 0 : (i / (pelletCount - 1)) * 2 - 1; // [-1,1]
      const ang = t * maxSpread;
      const cs = Math.cos(ang), sn = Math.sin(ang);
      const dx = cs * fx - sn * fy;
      const dy = sn * fx + cs * fy;

      const vel = { x: dx * baseSpeed, y: dy * baseSpeed };
      const id = crypto.randomUUID();
      const pos = { ...p.pos };
      const projectile = new Projectile({
        id,
        owner: p.id,
        pos,
        vel,
        kind: 'pellet'
      });
      World.projectiles.set(id, projectile);
      eventBus.emit(new ProjectileSpawnedEvent(id, p.id, pos, vel, 'pellet').toEmit());
      
      // Each pellet counts as a shot fired for accuracy
      p.addShotFired();
    }
    return;
  }

  if (e.skill === Skills.ROCKET) {
    // Allow casting via enum or raw string if sent
    if ((p.cd[cdKey] ?? 0) > now) return;
    p.cd[cdKey] = now + 1200; // 1.2s cooldown

    const face = p.face ?? { x: 1, y: 0 };
    const fmag = Math.hypot(face.x, face.y) || 1;
    const fx = face.x / fmag, fy = face.y / fmag;
    const speed = 300; // slower rocket
    const vel = { x: fx * speed, y: fy * speed };

    const id = crypto.randomUUID();
    const pos = { ...p.pos };
    const projectile = new Projectile({
      id,
      owner: p.id,
      pos,
      vel,
      kind: 'rocket',
      hitRadius: 28
    });
    World.projectiles.set(id, projectile);
    eventBus.emit(new ProjectileSpawnedEvent(id, p.id, pos, vel, 'rocket').toEmit());
    
    // Track rocket shot for accuracy
    p.addShotFired();
    return;
  }

  if (e.skill === Skills.DASH) {
    // Dash: short i-frames and speed boost
    if ((p.cd[cdKey] ?? 0) > now) return;
    const duration = 220; // ms
    p.cd[cdKey] = now + 800; // dash cooldown
    p.iframeUntil = now + duration;
    p.dashUntil = now + duration;
    p.dashFactor = 2.5; // 2.5x speed while active
    eventBus.emit(new DashStartedEvent(p.id, duration, true).toEmit());
    return;
  }
});

eventBus.on('cmd:leave', (e: TCmdLeaveEvent) => {
  World.players.delete(e.playerId);
  eventBus.emit(new PlayerDiedEvent(e.playerId).toEmit());
});
