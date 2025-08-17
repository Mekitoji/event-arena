import * as path from 'path';
import { GameConfigSchema, ConfigLoadOptions, ProjectileType, WeaponType, DifficultyLevel, DeepPartial } from './types';
import { ConfigUtils } from './config-utils';
import { DEFAULT_CONFIG } from './defaults';

/**
 * Main Game Configuration Class
 * Hybrid approach combining defaults, file overrides, and environment variables
 */
export class GameConfig {
  private config: GameConfigSchema;
  private configPath: string;
  private isInitialized: boolean = false;

  constructor(options?: ConfigLoadOptions) {
    this.configPath = options?.configPath || path.join(process.cwd(), 'config', 'game.json');
    this.config = this.loadConfiguration(options);
    this.isInitialized = true;
  }

  // ===========================================
  // CONFIGURATION LOADING
  // ===========================================

  /**
   * Load configuration from multiple sources (layered approach)
   */
  private loadConfiguration(options?: ConfigLoadOptions): GameConfigSchema {
    // Layer 1: Start with defaults
    let config = ConfigUtils.deepClone(DEFAULT_CONFIG);
    
    // Layer 2: Load from JSON file if it exists
    const fileConfig = ConfigUtils.loadFromFile(this.configPath);
    if (fileConfig) {
      config = ConfigUtils.deepMerge(config, fileConfig);
      console.log(`📁 Loaded config overrides from ${this.configPath}`);
    }
    
    // Layer 3: Apply environment variable overrides
    if (options?.allowEnvironmentOverrides !== false) {
      config = ConfigUtils.applyEnvironmentOverrides(config);
    }
    
    // Layer 4: Validate configuration
    if (options?.validateOnLoad !== false) {
      const validation = ConfigUtils.validate(config);
      if (!validation.valid) {
        console.error('❌ Configuration validation failed:', validation.errors);
        throw new Error('Invalid game configuration');
      }
      
      if (validation.warnings?.length) {
        console.warn('⚠️ Configuration warnings:', validation.warnings);
      }
      
      console.log('✅ Game configuration validated successfully');
    }

    return config;
  }

  // ===========================================
  // PUBLIC API - GETTERS
  // ===========================================

  public get world() { 
    return this.config.world; 
  }
  
  public get player() { 
    return this.config.player; 
  }
  
  public get projectiles() { 
    return this.config.projectiles; 
  }
  
  public get explosions() { 
    return this.config.explosions; 
  }
  
  public get cooldowns() { 
    return this.config.cooldowns; 
  }
  
  public get buffs() { 
    return this.config.buffs; 
  }
  
  public get combat() { 
    return this.config.combat; 
  }
  
  public get effects() { 
    return this.config.effects; 
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  /**
   * Get projectile configuration by type
   */
  public getProjectileConfig(type: ProjectileType) {
    return ConfigUtils.getProjectileConfig(this.config, type);
  }

  /**
   * Get weapon cooldown by type
   */
  public getCooldown(weapon: WeaponType): number {
    return ConfigUtils.getCooldown(this.config, weapon);
  }

  /**
   * Get explosion radius
   */
  public getExplosionRadius(): number {
    return this.config.explosions.radius;
  }

  /**
   * Get explosion damage
   */
  public getExplosionDamage(): number {
    return this.config.explosions.damage;
  }

  /**
   * Get knockback power multiplier
   */
  public getKnockbackPower(): number {
    return this.config.explosions.knockbackPower;
  }

  // ===========================================
  // CONFIGURATION MANAGEMENT
  // ===========================================

  /**
   * Reload configuration from disk
   */
  public reload(options?: ConfigLoadOptions): void {
    const newConfig = this.loadConfiguration(options);
    
    // Compare configurations for logging
    const differences = ConfigUtils.compareConfigs(this.config, newConfig);
    if (Object.keys(differences).length > 0) {
      console.log('🔄 Configuration changes detected:', differences);
    }
    
    this.config = newConfig;
    console.log('🔄 Configuration reloaded successfully');
  }

  /**
   * Validate current configuration
   */
  public validate() {
    return ConfigUtils.validate(this.config);
  }

  /**
   * Export current configuration as JSON
   */
  public toJSON(): GameConfigSchema {
    return ConfigUtils.deepClone(this.config);
  }

  /**
   * Save current configuration to file
   */
  public saveToFile(filePath?: string): boolean {
    const outputPath = filePath || this.configPath;
    return ConfigUtils.saveToFile(this.config, outputPath);
  }

  /**
   * Update configuration with partial changes
   */
  public update(changes: DeepPartial<GameConfigSchema>): void {
    const oldConfig = ConfigUtils.deepClone(this.config);
    this.config = ConfigUtils.deepMerge(this.config, changes);
    
    // Validate after changes
    const validation = this.validate();
    if (!validation.valid) {
      // Rollback on validation failure
      this.config = oldConfig;
      throw new Error(`Configuration update failed validation: ${validation.errors.join(', ')}`);
    }
    
    console.log('🔧 Configuration updated successfully');
  }

  // ===========================================
  // SCALING AND MODIFICATION
  // ===========================================

  /**
   * Create a copy scaled for difficulty level
   */
  public scaleForDifficulty(difficulty: DifficultyLevel): GameConfig {
    const scaledConfigData = ConfigUtils.scaleForDifficulty(this.config, difficulty);
    const scaledConfig = new GameConfig({ validateOnLoad: false });
    scaledConfig.config = scaledConfigData;
    return scaledConfig;
  }

  /**
   * Create a copy with overrides applied
   */
  public clone(overrides?: DeepPartial<GameConfigSchema>): GameConfig {
    const clonedConfig = new GameConfig({ validateOnLoad: false });
    clonedConfig.config = ConfigUtils.deepMerge(
      ConfigUtils.deepClone(this.config), 
      overrides || {}
    );
    return clonedConfig;
  }

  /**
   * Apply a test preset configuration
   */
  public applyTestPreset(preset: 'fast' | 'powerful' | 'chaos'): void {
    const presetChanges = ConfigUtils.createTestConfig(preset);
    this.update(presetChanges);
    console.log(`🧪 Applied test preset: ${preset}`);
  }

  // ===========================================
  // COMPARISON AND DEBUGGING
  // ===========================================

  /**
   * Compare this configuration with another
   */
  public compare(other: GameConfig | GameConfigSchema) {
    const otherConfig = other instanceof GameConfig ? other.config : other;
    return ConfigUtils.compareConfigs(this.config, otherConfig);
  }

  /**
   * Get a summary of the current configuration
   */
  public getSummary() {
    return {
      world: `${this.config.world.width}x${this.config.world.height}`,
      playerHp: this.config.player.hp,
      weaponDamage: {
        bullet: this.config.projectiles.bullet.damage,
        pellet: this.config.projectiles.pellet.damage,
        rocket: this.config.projectiles.rocket.damage,
      },
      explosions: `${this.config.explosions.radius}r ${this.config.explosions.damage}dmg`,
      cooldowns: this.config.cooldowns,
    };
  }

  /**
   * Get debug information about the configuration
   */
  public getDebugInfo() {
    return {
      configPath: this.configPath,
      isInitialized: this.isInitialized,
      validation: this.validate(),
      summary: this.getSummary(),
    };
  }

  // ===========================================
  // STATIC FACTORY METHODS
  // ===========================================

  /**
   * Create configuration from JSON data
   */
  static fromJSON(data: GameConfigSchema, options?: ConfigLoadOptions): GameConfig {
    const config = new GameConfig({ ...options, validateOnLoad: false });
    config.config = data;
    
    if (options?.validateOnLoad !== false) {
      const validation = config.validate();
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }
    }
    
    return config;
  }

  /**
   * Create configuration for testing with preset
   */
  static forTesting(preset: 'fast' | 'powerful' | 'chaos' = 'fast'): GameConfig {
    const config = new GameConfig({ validateOnLoad: false });
    const presetChanges = ConfigUtils.createTestConfig(preset);
    config.config = ConfigUtils.deepMerge(DEFAULT_CONFIG, presetChanges);
    return config;
  }

  /**
   * Create default configuration
   */
  static default(): GameConfig {
    return new GameConfig({ validateOnLoad: false });
  }
}
