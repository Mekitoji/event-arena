/**
 * Game Configuration Module
 * Centralized configuration system with layered loading
 */

// Export types
export * from './types';

// Export utilities
export { ConfigUtils } from './config-utils';

// Export defaults
export { DEFAULT_CONFIG } from './defaults';

// Export main class
export { GameConfig } from './game-config';

// ===========================================
// SINGLETON INSTANCE
// ===========================================

// Import GameConfig for singleton
import { GameConfig } from './game-config';

// Create singleton instance for the game
export const Config = new GameConfig({
  validateOnLoad: true,
  allowEnvironmentOverrides: true,
});

// Initialize config file if it doesn't exist
Config.saveToFile();

// ===========================================
// CONVENIENCE EXPORTS
// ===========================================

// Export commonly used getters for easier access
export const getProjectileConfig = (type: 'bullet' | 'pellet' | 'rocket') =>
  Config.getProjectileConfig(type);

export const getCooldown = (weapon: 'shoot' | 'shotgun' | 'rocket' | 'dash') =>
  Config.getCooldown(weapon);

export const getExplosionRadius = () => Config.getExplosionRadius();
export const getExplosionDamage = () => Config.getExplosionDamage();
export const getKnockbackPower = () => Config.getKnockbackPower();

// ===========================================
// USAGE EXAMPLES IN COMMENTS
// ===========================================

/*
// Import the singleton
import { Config } from './config';

// Use configuration values
const bulletDamage = Config.projectiles.bullet.damage;
const worldSize = { width: Config.world.width, height: Config.world.height };

// Use utility methods
const bulletConfig = Config.getProjectileConfig('bullet');
const shootCooldown = Config.getCooldown('shoot');

// Modify configuration at runtime
Config.update({
  projectiles: {
    bullet: { damage: 30 }
  }
});

// Create scaled configurations
const hardConfig = Config.scaleForDifficulty('hard');
const testConfig = GameConfig.forTesting('fast');

// Environment variable examples:
// GAME_BULLET_DAMAGE=30 npm start
// GAME_EXPLOSION_RADIUS=100 npm start
// GAME_PLAYER_HP=150 npm start
*/
