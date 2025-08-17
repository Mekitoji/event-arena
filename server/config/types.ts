/**
 * Game Configuration Types
 * All interfaces and types for the game configuration system
 */

// ===========================================
// CORE CONFIGURATION SCHEMA
// ===========================================

export interface GameConfigSchema {
  world: WorldConfig;
  player: PlayerConfig;
  projectiles: ProjectilesConfig;
  explosions: ExplosionsConfig;
  cooldowns: CooldownsConfig;
  buffs: BuffsConfig;
  combat: CombatConfig;
  effects: EffectsConfig;
}

// ===========================================
// SECTION INTERFACES
// ===========================================

export interface WorldConfig {
  width: number;
  height: number;
}

export interface PlayerConfig {
  hp: number;
  speed: number;
  radius: number;
  turnSpeed: number;
}

export interface ProjectilesConfig {
  hitRadius: number;
  baseSpeed: number;
  bullet: BulletConfig;
  pellet: PelletConfig;
  rocket: RocketConfig;
}

export interface BulletConfig {
  damage: number;
  lifetime: number;
  maxBounces: number;
  damageDropoff: number;
  velocityRetention: number;
}

export interface PelletConfig {
  damage: number;
  lifetime: number;
  maxBounces: number;
  damageDropoff: number;
  velocityRetention: number;
  count: number;
  spread: number;
}

export interface RocketConfig {
  damage: number;
  speed: number;
  lifetime: number;
  hitRadius: number;
}

export interface ExplosionsConfig {
  radius: number;
  damage: number;
  knockbackPower: number;
}

export interface CooldownsConfig {
  shoot: number;
  shotgun: number;
  rocket: number;
  dash: number;
}

export interface BuffsConfig {
  hasteMultiplier: number;
  shieldReduction: number;
  hasteDefaultDuration: number;
  shieldDefaultDuration: number;
}

export interface CombatConfig {
  knockbackDuration: number;
  assistTimeWindow: number;
  heartbeatInterval: number;
  movementThreshold: number;
}

export interface EffectsConfig {
  damageFlash: DamageFlashEffectConfig;
  deathRing: DeathRingEffectConfig;
  explosion: EffectConfig;
  spark: SparkEffectConfig;
}

export interface EffectConfig {
  duration: number;
}

export interface DamageFlashEffectConfig extends EffectConfig {
  alpha: number;
}

export interface DeathRingEffectConfig extends EffectConfig {
  maxRadius: number;
}

export interface SparkEffectConfig extends EffectConfig {
  color: string;
}

// ===========================================
// UTILITY TYPES
// ===========================================

export type ProjectileType = 'bullet' | 'pellet' | 'rocket';
export type WeaponType = 'shoot' | 'shotgun' | 'rocket' | 'dash';
export type DifficultyLevel = 'easy' | 'normal' | 'hard';
export type ConfigEnvironment = 'development' | 'production' | 'test';

// ===========================================
// CONFIGURATION OPTIONS
// ===========================================

export interface ConfigLoadOptions {
  configPath?: string;
  environment?: ConfigEnvironment;
  validateOnLoad?: boolean;
  allowEnvironmentOverrides?: boolean;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

// ===========================================
// SCALING/MODIFICATION TYPES
// ===========================================

export interface DifficultyMultipliers {
  playerHp: number;
  damage: number;
  cooldowns: number;
  projectileSpeed?: number;
  explosionRadius?: number;
}

// ===========================================
// UTILITY TYPE HELPERS
// ===========================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ===========================================
// TYPE GUARDS
// ===========================================

export function isProjectileType(value: string): value is ProjectileType {
  return ['bullet', 'pellet', 'rocket'].includes(value);
}

export function isWeaponType(value: string): value is WeaponType {
  return ['shoot', 'shotgun', 'rocket', 'dash'].includes(value);
}

export function isDifficultyLevel(value: string): value is DifficultyLevel {
  return ['easy', 'normal', 'hard'].includes(value);
}
