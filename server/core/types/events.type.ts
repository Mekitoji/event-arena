import { Vec2 } from "./vec2.type";
import { ESkills } from "./cmd.type";

export const EventSource = {
  PLAYER: 'player',
  PROJECTILE: 'projectile',
  DAMAGE: 'damage',
  TICK: 'tick',
  SESSION: 'session',
  MATCH: 'match',
  PICKUP: 'pickup',
  BUFF: 'buff',
  EXPLOSION: 'explosion',
  KNOCKBACK: 'knockback',
  DASH: 'dash',
  MAP: 'map',
  SCORE: 'score',
  FEED: 'feed',
  STREAK: 'streak',
  CMD: 'cmd'
} as const;

export type ESource = typeof EventSource[keyof typeof EventSource];

export type TSourceEvent = `${ESource}:${string}`;

export type PlayerInfo = { id: string; name: string; pos: Vec2 };

export type BaseSourceEvent<T extends TSourceEvent, O extends object = object> = { type: T } & O;

// Player events
export type TPlayerJoinEvent = BaseSourceEvent<`player:join`, { playerId: string, name: string }>;
export type TPlayerMoveEvent = BaseSourceEvent<`player:move`, { playerId: string, pos: Vec2, dir?: Vec2 }>;
export type TPlayerAimedEvent = BaseSourceEvent<'player:aimed', { playerId: string, dir: Vec2 }>;
export type TPlayerDieEvent = BaseSourceEvent<'player:die', { playerId: string }>;
export type TPlayerLeaveEvent = BaseSourceEvent<'player:leave', { playerId: string }>;
export type TKillEvent = BaseSourceEvent<'player:kill', { killerId: string, victimId: string, assistIds?: string[] }>

// Projectile events
export type TProjectileSpawnedEvent = BaseSourceEvent<"projectile:spawned", { id: string, ownerId: string, pos: Vec2, vel: Vec2, kind?: 'bullet' | 'pellet' | 'rocket' }>;
export type TProjectileMovedEvent = BaseSourceEvent<'projectile:moved', { id: string, pos: Vec2 }>;
export type TProjectileDespawnedEvent = BaseSourceEvent<'projectile:despawned', { id: string }>;
export type TProjectileBouncedEvent = BaseSourceEvent<'projectile:bounced', { id: string, normal: Vec2 }>;

// Pickup events
export type TPickupSpawnedEvent = BaseSourceEvent<'pickup:spawned', { id: string, pos: Vec2, kind: 'heal' | 'haste' | 'shield' }>;
export type TPickupCollectedEvent = BaseSourceEvent<'pickup:collected', { id: string, by: string }>;

// Buff effect events
export type TBuffAppliedEvent = BaseSourceEvent<'buff:applied', { playerId: string, kind: 'heal' | 'haste' | 'shield', duration: number }>;
export type TBuffExpiredEvent = BaseSourceEvent<'buff:expired', { playerId: string, kind: 'haste' | 'shield' }>;

// Damage events
export type TDamageAppliedEvent = BaseSourceEvent<'damage:applied', { targetId: string, amount: number, source?: string, weapon?: 'bullet' | 'pellet' | 'rocket' | 'explosion' }>

// Explosion events
export type TExplosionSpawnedEvent = BaseSourceEvent<'explosion:spawned', { pos: Vec2, radius: number, dmg: number }>;

// Knockback effect events
export type TKnockbackAppliedEvent = BaseSourceEvent<'knockback:applied', { targetId: string, vec: Vec2, power: number }>;

// Dash skill events
export type TDashStartedEvent = BaseSourceEvent<'dash:started', { playerId: string, duration: number, iframes: boolean }>;
export type TDashEndedEvent = BaseSourceEvent<'dash:ended', { playerId: string }>;

// Session events
export type TSessionStartedEvent = BaseSourceEvent<'session:started', { playerId: string, name: string, players: PlayerInfo[], match?: { id: string, mode: string, phase: 'idle' | 'countdown' | 'active' | 'ended', startsAt?: number, endsAt?: number } }>

// Map events
export type TMapLoadedEvent = BaseSourceEvent<'map:loaded', { obstacles: Array<{ type: 'rect', x: number, y: number, w: number, h: number }> }>

// Match events
export type TMatchCreatedEvent = BaseSourceEvent<'match:created', { id: string, mode: string, startsAt?: number, countdownMs?: number }>
export type TMatchStartedEvent = BaseSourceEvent<'match:started', { id: string, endsAt?: number, durationMs?: number }>
export type TMatchEndedEvent = BaseSourceEvent<'match:ended', { id: string, at?: number }>

// Score events
export type TScoreUpdateEvent = BaseSourceEvent<'score:update', { playerId: string, kills: number, deaths: number, assists: number }>

// Kill feed and streak events
export type TKillFeedEvent = BaseSourceEvent<'feed:entry', { killer: string, victim: string, weapon: 'bullet' | 'pellet' | 'rocket' | 'explosion', assistIds?: string[], timestamp: number }>
export type TStreakEvent = BaseSourceEvent<'streak:changed', { playerId: string, streak: number, previousStreak: number }>

// Command events
export type TCmdMoveEvent = BaseSourceEvent<'cmd:move', { playerId: string, dir: Vec2 }>
export type TCmdCastEvent = BaseSourceEvent<'cmd:cast', { playerId: string, skill: ESkills }>
export type TCmdLeaveEvent = BaseSourceEvent<'cmd:leave', { playerId: string }>
export type TCmdAimEvent = BaseSourceEvent<'cmd:aim', { playerId: string, dir: Vec2 }>
export type TCmdRespawnEvent = BaseSourceEvent<'cmd:respawn', { playerId: string }>

// Tick events
export type TTickPreEvent = BaseSourceEvent<'tick:pre', { dt: number }>;
export type TTickPostEvent = BaseSourceEvent<'tick:post', { dt: number }>;

// All events
export type SourceEvents = TPlayerJoinEvent | TPlayerMoveEvent | TPlayerAimedEvent | TPlayerDieEvent | TProjectileSpawnedEvent | TProjectileMovedEvent | TProjectileDespawnedEvent | TProjectileBouncedEvent | TPickupSpawnedEvent | TPickupCollectedEvent | TBuffAppliedEvent | TBuffExpiredEvent | TDamageAppliedEvent | TExplosionSpawnedEvent | TKnockbackAppliedEvent | TDashStartedEvent | TDashEndedEvent | TTickPostEvent | TTickPreEvent | TPlayerLeaveEvent | TSessionStartedEvent | TMapLoadedEvent | TMatchCreatedEvent | TMatchStartedEvent | TMatchEndedEvent | TScoreUpdateEvent | TKillEvent | TKillFeedEvent | TStreakEvent | TCmdMoveEvent | TCmdCastEvent | TCmdLeaveEvent | TCmdAimEvent | TCmdRespawnEvent;

// All events types
export type SourceEventType = SourceEvents['type'];

