import { GameConfigSchema } from './types';

/**
 * Default Game Configuration
 * Base configuration values used as defaults
 */

export const DEFAULT_CONFIG: GameConfigSchema = {
  world: {
    width: 2000,
    height: 1200,
  },

  player: {
    hp: 100,
    speed: 300,
    radius: 16,
    turnSpeed: Math.PI * 4, // 720°/s
  },

  projectiles: {
    hitRadius: 20,
    baseSpeed: 600,

    bullet: {
      damage: 25,
      lifetime: 3000, // 3 seconds
      maxBounces: 3,
      damageDropoff: 0.8, // 20% damage loss per bounce
      velocityRetention: 0.9, // 10% velocity loss per bounce
    },

    pellet: {
      damage: 17,
      lifetime: 2000, // 2 seconds
      maxBounces: 2,
      damageDropoff: 0.7, // 30% damage loss per bounce
      velocityRetention: 0.85, // 15% velocity loss per bounce
      count: 5, // pellets per shotgun blast
      spread: 0.25, // radians +/- ~14°
    },

    rocket: {
      damage: 40,
      speed: 300, // slower than bullets/pellets
      lifetime: 4000, // 4 seconds
      hitRadius: 28,
    },
  },

  explosions: {
    radius: 80,
    damage: 40,
    knockbackPower: 2.0,
  },

  cooldowns: {
    shoot: 500, // ms
    shotgun: 1000, // ms
    rocket: 1200, // ms
    dash: 800, // ms
  },

  buffs: {
    hasteMultiplier: 1.6,
    shieldReduction: 0.5, // 50% damage reduction
    hasteDefaultDuration: 5000, // ms
    shieldDefaultDuration: 8000, // ms
  },

  combat: {
    knockbackDuration: 120, // ms
    assistTimeWindow: 5000, // ms - time window for assists
    heartbeatInterval: 280, // ms - anti-stall position rebroadcast
    movementThreshold: 0.5, // minimum movement for position broadcast
  },

  effects: {
    damageFlash: {
      duration: 180, // ms
      alpha: 0.6,
    },
    deathRing: {
      duration: 450, // ms
      maxRadius: 26,
    },
    explosion: {
      duration: 350, // ms
    },
    spark: {
      duration: 150, // ms
      color: '#ffc864',
    },
  },
};
