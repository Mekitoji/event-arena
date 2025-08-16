import { Vec2 } from "../../core/types/vec2.type";

/**
 * Base interface for all effects that can be applied to a player
 */
export interface IEffect {
  readonly id: string;
  readonly type: EffectType;
  readonly startTime: number;
  readonly duration: number;
  readonly data: EffectData;

  /**
   * Update the effect. Returns false if the effect should be removed.
   */
  update(currentTime: number): boolean;

  /**
   * Check if the effect is expired
   */
  isExpired(currentTime: number): boolean;

  /**
   * Get the remaining duration in milliseconds
   */
  getRemainingDuration(currentTime: number): number;

  /**
   * Get the progress of the effect (0.0 to 1.0)
   */
  getProgress(currentTime: number): number;

  /**
   * Serialize the effect for network transmission
   */
  toJSON(): EffectJSON;
}

/**
 * Types of effects that can be applied to players
 */
export enum EffectType {
  DAMAGE_FLASH = 'damage_flash',
  DEATH_RING = 'death_ring',
  DASH_TRAIL = 'dash_trail',
  EXPLOSION = 'explosion',
  SPARK = 'spark',
  KNOCKBACK = 'knockback',
  CAMERA_SHAKE = 'camera_shake',
  HEAL_PULSE = 'heal_pulse',
  SHIELD_GLOW = 'shield_glow',
  HASTE_TRAIL = 'haste_trail',
  INVULNERABILITY = 'invulnerability'
}

/**
 * Base effect data interface
 */
export interface BaseEffectData {
  intensity?: number;
  color?: string;
  alpha?: number;
}

/**
 * Damage flash effect data
 */
export interface DamageFlashData extends BaseEffectData {
  damage: number;
  flashColor: string;
}

/**
 * Death ring effect data
 */
export interface DeathRingData extends BaseEffectData {
  position: Vec2;
  maxRadius: number;
  ringColor: string;
}

/**
 * Dash trail effect data
 */
export interface DashTrailData extends BaseEffectData {
  positions: Array<{ pos: Vec2; timestamp: number }>;
  trailColor: string;
  maxTrailLength: number;
}

/**
 * Explosion effect data
 */
export interface ExplosionData extends BaseEffectData {
  position: Vec2;
  radius: number;
  damage: number;
  explosionColor: string;
}

/**
 * Spark effect data (for projectile bounces)
 */
export interface SparkData extends BaseEffectData {
  position: Vec2;
  direction: Vec2;
  sparkColor: string;
}

/**
 * Knockback effect data
 */
export interface KnockbackData extends BaseEffectData {
  velocity: Vec2;
  power: number;
}

/**
 * Camera shake effect data
 */
export interface CameraShakeData extends BaseEffectData {
  amplitude: number;
  frequency: number;
}

/**
 * Heal pulse effect data
 */
export interface HealPulseData extends BaseEffectData {
  healAmount: number;
  pulseColor: string;
}

/**
 * Shield glow effect data
 */
export interface ShieldGlowData extends BaseEffectData {
  glowColor: string;
  pulseSpeed: number;
}

/**
 * Haste trail effect data
 */
export interface HasteTrailData extends BaseEffectData {
  trailColor: string;
  speedMultiplier: number;
}

/**
 * Invulnerability effect data
 */
export interface InvulnerabilityData extends BaseEffectData {
  flickerRate: number;
}

/**
 * Union type for all effect data types
 */
export type EffectData = 
  | DamageFlashData
  | DeathRingData
  | DashTrailData
  | ExplosionData
  | SparkData
  | KnockbackData
  | CameraShakeData
  | HealPulseData
  | ShieldGlowData
  | HasteTrailData
  | InvulnerabilityData
  | BaseEffectData;

/**
 * JSON representation of an effect for network transmission
 */
export interface EffectJSON {
  id: string;
  type: EffectType;
  startTime: number;
  duration: number;
  data: EffectData;
  progress: number;
  remainingDuration: number;
}

/**
 * Effect configuration for creating new effects
 */
export interface EffectConfig {
  type: EffectType;
  duration: number;
  data: EffectData;
  id?: string;
}

/**
 * Callback function type for effect events
 */
export type EffectEventCallback = (effect: IEffect) => void;

/**
 * Effect events that can be listened to
 */
export enum EffectEvent {
  ADDED = 'added',
  UPDATED = 'updated',
  EXPIRED = 'expired',
  REMOVED = 'removed'
}
