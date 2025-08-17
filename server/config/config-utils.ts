import * as fs from 'fs';
import * as path from 'path';
import { 
  GameConfigSchema, 
  ConfigValidationResult, 
  DifficultyLevel, 
  DifficultyMultipliers,
  ProjectileType,
  WeaponType,
  DeepPartial
} from './types';

/**
 * Configuration Utilities
 * Helper functions for configuration management, validation, and manipulation
 */
export class ConfigUtils {

  // ===========================================
  // OBJECT MANIPULATION UTILITIES
  // ===========================================

  /**
   * Deep merge two configuration objects
   */
  static deepMerge<T>(target: T, source: DeepPartial<T>): T {
    const result = { ...target } as any;
    
    for (const key in source) {
      const sourceValue = source[key];
      const targetValue = (target as any)[key];
      
      if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
        result[key] = this.deepMerge(targetValue || {}, sourceValue);
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue;
      }
    }
    
    return result;
  }

  /**
   * Deep clone a configuration object
   */
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Get nested property value by path (e.g., "projectiles.bullet.damage")
   */
  static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested property value by path
   */
  static setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  // ===========================================
  // FILE SYSTEM UTILITIES
  // ===========================================

  /**
   * Load configuration from JSON file
   */
  static loadFromFile(filePath: string): Partial<GameConfigSchema> | null {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (error) {
      console.warn(`⚠️ Failed to load config from ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Save configuration to JSON file
   */
  static saveToFile(config: GameConfigSchema, filePath: string): boolean {
    try {
      const configDir = path.dirname(filePath);
      
      // Ensure directory exists
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
      console.log(`💾 Configuration saved to ${filePath}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to save config to ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Ensure config directory exists
   */
  static ensureConfigDirectory(configPath: string): void {
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
  }

  // ===========================================
  // ENVIRONMENT VARIABLE UTILITIES
  // ===========================================

  /**
   * Apply environment variable overrides to configuration
   */
  static applyEnvironmentOverrides(config: GameConfigSchema): GameConfigSchema {
    const result = this.deepClone(config);
    const env = process.env;

    // Define environment variable mappings
    const envMappings = {
      // World settings
      'GAME_WORLD_WIDTH': 'world.width',
      'GAME_WORLD_HEIGHT': 'world.height',
      
      // Player settings
      'GAME_PLAYER_HP': 'player.hp',
      'GAME_PLAYER_SPEED': 'player.speed',
      'GAME_PLAYER_RADIUS': 'player.radius',
      
      // Projectile settings
      'GAME_BULLET_DAMAGE': 'projectiles.bullet.damage',
      'GAME_PELLET_DAMAGE': 'projectiles.pellet.damage',
      'GAME_ROCKET_DAMAGE': 'projectiles.rocket.damage',
      'GAME_PROJECTILE_SPEED': 'projectiles.baseSpeed',
      
      // Explosion settings
      'GAME_EXPLOSION_RADIUS': 'explosions.radius',
      'GAME_EXPLOSION_DAMAGE': 'explosions.damage',
      'GAME_KNOCKBACK_POWER': 'explosions.knockbackPower',
      
      // Cooldowns
      'GAME_SHOOT_COOLDOWN': 'cooldowns.shoot',
      'GAME_SHOTGUN_COOLDOWN': 'cooldowns.shotgun',
      'GAME_ROCKET_COOLDOWN': 'cooldowns.rocket',
      'GAME_DASH_COOLDOWN': 'cooldowns.dash',
      
      // Combat settings
      'GAME_ASSIST_TIME': 'combat.assistTimeWindow',
      'GAME_HEARTBEAT_INTERVAL': 'combat.heartbeatInterval',
    };

    // Apply environment overrides
    for (const [envVar, configPath] of Object.entries(envMappings)) {
      const envValue = env[envVar];
      if (envValue !== undefined) {
        const numValue = parseFloat(envValue);
        if (!isNaN(numValue)) {
          this.setNestedValue(result, configPath, numValue);
          console.log(`🔧 Environment override: ${configPath} = ${numValue}`);
        }
      }
    }

    return result;
  }

  // ===========================================
  // VALIDATION UTILITIES
  // ===========================================

  /**
   * Validate game configuration
   */
  static validate(config: GameConfigSchema): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // World validation
    if (config.world.width <= 0) {
      errors.push('World width must be positive');
    }
    if (config.world.height <= 0) {
      errors.push('World height must be positive');
    }
    
    // Player validation
    if (config.player.hp <= 0) {
      errors.push('Player HP must be positive');
    }
    if (config.player.speed <= 0) {
      errors.push('Player speed must be positive');
    }
    if (config.player.radius <= 0) {
      errors.push('Player radius must be positive');
    }
    
    // Projectile validation
    this.validateProjectileConfig(config.projectiles.bullet, 'bullet', errors, warnings);
    this.validateProjectileConfig(config.projectiles.pellet, 'pellet', errors, warnings);
    this.validateProjectileConfig(config.projectiles.rocket, 'rocket', errors, warnings);
    
    // Explosion validation
    if (config.explosions.radius <= 0) {
      errors.push('Explosion radius must be positive');
    }
    if (config.explosions.damage <= 0) {
      errors.push('Explosion damage must be positive');
    }
    if (config.explosions.knockbackPower <= 0) {
      warnings.push('Explosion knockback power is very low or negative');
    }
    
    // Cooldown validation
    for (const [weapon, cooldown] of Object.entries(config.cooldowns)) {
      if (cooldown <= 0) {
        errors.push(`${weapon} cooldown must be positive`);
      }
      if (cooldown > 10000) {
        warnings.push(`${weapon} cooldown is very high (${cooldown}ms)`);
      }
    }
    
    // Combat validation
    if (config.combat.assistTimeWindow <= 0) {
      errors.push('Assist time window must be positive');
    }
    if (config.combat.heartbeatInterval <= 0) {
      errors.push('Heartbeat interval must be positive');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Validate individual projectile configuration
   */
  private static validateProjectileConfig(
    projectile: any, 
    type: string, 
    errors: string[], 
    warnings: string[]
  ): void {
    if (projectile.damage <= 0) {
      errors.push(`${type} damage must be positive`);
    }
    if (projectile.lifetime <= 0) {
      errors.push(`${type} lifetime must be positive`);
    }
    
    if ('damageDropoff' in projectile) {
      if (projectile.damageDropoff < 0 || projectile.damageDropoff > 1) {
        errors.push(`${type} damage dropoff must be between 0 and 1`);
      }
    }
    
    if ('velocityRetention' in projectile) {
      if (projectile.velocityRetention < 0 || projectile.velocityRetention > 1) {
        errors.push(`${type} velocity retention must be between 0 and 1`);
      }
    }
    
    if (type === 'pellet' && projectile.count <= 0) {
      errors.push('Pellet count must be positive');
    }
    
    if (projectile.damage > 100) {
      warnings.push(`${type} damage is very high (${projectile.damage})`);
    }
  }

  // ===========================================
  // SCALING AND MODIFICATION UTILITIES
  // ===========================================

  /**
   * Scale configuration for different difficulty levels
   */
  static scaleForDifficulty(
    config: GameConfigSchema, 
    difficulty: DifficultyLevel
  ): GameConfigSchema {
    const multipliers: Record<DifficultyLevel, DifficultyMultipliers> = {
      easy: {
        playerHp: 1.5,
        damage: 0.8,
        cooldowns: 1.2,
        projectileSpeed: 0.9,
        explosionRadius: 0.9
      },
      normal: {
        playerHp: 1.0,
        damage: 1.0,
        cooldowns: 1.0,
        projectileSpeed: 1.0,
        explosionRadius: 1.0
      },
      hard: {
        playerHp: 0.7,
        damage: 1.3,
        cooldowns: 0.8,
        projectileSpeed: 1.1,
        explosionRadius: 1.1
      }
    };

    const mult = multipliers[difficulty];
    const scaled = this.deepClone(config);
    
    // Scale player stats
    scaled.player.hp = Math.round(scaled.player.hp * mult.playerHp);
    
    // Scale projectile damage and speed
    scaled.projectiles.bullet.damage = Math.round(scaled.projectiles.bullet.damage * mult.damage);
    scaled.projectiles.pellet.damage = Math.round(scaled.projectiles.pellet.damage * mult.damage);
    scaled.projectiles.rocket.damage = Math.round(scaled.projectiles.rocket.damage * mult.damage);
    
    if (mult.projectileSpeed) {
      scaled.projectiles.baseSpeed = Math.round(scaled.projectiles.baseSpeed * mult.projectileSpeed);
      scaled.projectiles.rocket.speed = Math.round(scaled.projectiles.rocket.speed * mult.projectileSpeed);
    }
    
    // Scale cooldowns
    scaled.cooldowns.shoot = Math.round(scaled.cooldowns.shoot * mult.cooldowns);
    scaled.cooldowns.shotgun = Math.round(scaled.cooldowns.shotgun * mult.cooldowns);
    scaled.cooldowns.rocket = Math.round(scaled.cooldowns.rocket * mult.cooldowns);
    scaled.cooldowns.dash = Math.round(scaled.cooldowns.dash * mult.cooldowns);
    
    // Scale explosion
    if (mult.explosionRadius) {
      scaled.explosions.radius = Math.round(scaled.explosions.radius * mult.explosionRadius);
    }
    scaled.explosions.damage = Math.round(scaled.explosions.damage * mult.damage);

    return scaled;
  }

  /**
   * Create a preset configuration for testing/development
   */
  static createTestConfig(preset: 'fast' | 'powerful' | 'chaos'): DeepPartial<GameConfigSchema> {
    const presets: Record<string, DeepPartial<GameConfigSchema>> = {
      fast: {
        cooldowns: { shoot: 100, shotgun: 200, rocket: 300, dash: 200 },
        player: { speed: 500 },
        projectiles: { baseSpeed: 1000 }
      },
      powerful: {
        projectiles: {
          bullet: { damage: 50 },
          pellet: { damage: 35 },
          rocket: { damage: 80 }
        },
        explosions: { damage: 80, radius: 120 }
      },
      chaos: {
        projectiles: { 
          pellet: { count: 10, spread: 0.5 },
          bullet: { maxBounces: 10 }
        },
        explosions: { knockbackPower: 5.0 }
      }
    };

    return presets[preset] || {};
  }

  // ===========================================
  // GETTER UTILITIES
  // ===========================================

  /**
   * Get projectile configuration by type
   */
  static getProjectileConfig(config: GameConfigSchema, type: ProjectileType) {
    switch (type) {
      case 'bullet': return config.projectiles.bullet;
      case 'pellet': return config.projectiles.pellet;
      case 'rocket': return config.projectiles.rocket;
      default: throw new Error(`Unknown projectile type: ${type}`);
    }
  }

  /**
   * Get weapon cooldown by type
   */
  static getCooldown(config: GameConfigSchema, weapon: WeaponType): number {
    return config.cooldowns[weapon] || 0;
  }

  // ===========================================
  // COMPARISON UTILITIES
  // ===========================================

  /**
   * Compare two configurations and return differences
   */
  static compareConfigs(
    config1: GameConfigSchema, 
    config2: GameConfigSchema
  ): Record<string, { old: any; new: any }> {
    const differences: Record<string, { old: any; new: any }> = {};
    
    this.compareObjects(config1, config2, '', differences);
    
    return differences;
  }

  private static compareObjects(
    obj1: any, 
    obj2: any, 
    path: string, 
    differences: Record<string, { old: any; new: any }>
  ): void {
    for (const key in obj1) {
      const fullPath = path ? `${path}.${key}` : key;
      const value1 = obj1[key];
      const value2 = obj2[key];
      
      if (typeof value1 === 'object' && typeof value2 === 'object' && 
          value1 !== null && value2 !== null) {
        this.compareObjects(value1, value2, fullPath, differences);
      } else if (value1 !== value2) {
        differences[fullPath] = { old: value1, new: value2 };
      }
    }
  }
}
