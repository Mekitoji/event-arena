/* eslint-disable @typescript-eslint/no-unused-vars */
// Example usage of SpawnManager class
import { SpawnManager } from '../core/spawn-manager';

// Example 1: Create a basic spawn manager with default settings
const basicSpawnManager = new SpawnManager();

// Example 2: Create a spawn manager with custom margins for specific scenarios
const pickupSpawnManager = new SpawnManager({
  margins: {
    left: 100,
    right: 100,
    top: 100,
    bottom: 100,
  },
  minDistanceFromPlayers: 180, // Pickups need more distance from players
  maxAttempts: 64,
});

// Example 3: Create a spawn manager for players with tighter margins
const playerSpawnManager = new SpawnManager({
  margins: {
    left: 80,
    right: 80,
    top: 80,
    bottom: 80,
  },
  minDistanceFromPlayers: 120, // Players can spawn closer to each other
  maxAttempts: 32,
});

// Example usage:
function demonstrateSpawnManager() {
  console.log('=== SpawnManager Demo ===');

  // Get safe spawn bounds
  const bounds = basicSpawnManager.getSafeSpawnBounds();
  console.log('Safe spawn area:', bounds);

  // Check if a position is within spawn bounds
  const testPos = { x: 50, y: 50 };
  console.log(`Position ${testPos.x},${testPos.y} is safe:`,
    basicSpawnManager.isWithinSpawnBounds(testPos));

  // Generate a random safe position
  const safePos = basicSpawnManager.getRandomSafePosition();
  console.log('Random safe position:', safePos);

  // Find a safe spawn position with all constraints
  const spawnPos = basicSpawnManager.findSafeSpawnPosition();
  console.log('Safe spawn position (with all constraints):', spawnPos);

  // Adjust existing spawn points to respect margins
  const originalSpawnPoints = [
    { x: 50, y: 50 },   // Too close to left/top margins
    { x: 1950, y: 1150 }, // Too close to right/bottom margins
    { x: 1000, y: 600 },  // Should be fine
  ];

  const adjustedPoints = basicSpawnManager.adjustSpawnPointsToMargins(originalSpawnPoints);
  console.log('Original spawn points:', originalSpawnPoints);
  console.log('Adjusted spawn points:', adjustedPoints);

  // Update spawn manager configuration dynamically
  basicSpawnManager.updateConfig({
    margins: {
      left: 120,
      right: 120,
      top: 120,
      bottom: 120,
    }
  });

  console.log('Updated configuration:', basicSpawnManager.getConfig());
}

// Example 4: Different configurations for different game objects
export const SpawnManagerConfigs = {
  // For power-ups and pickups (need more space from players)
  PICKUPS: {
    margins: { left: 100, right: 100, top: 100, bottom: 100 },
    minDistanceFromPlayers: 180,
    maxAttempts: 64,
  },

  // For player spawning (can be closer to boundaries and other players)
  PLAYERS: {
    margins: { left: 80, right: 80, top: 80, bottom: 80 },
    minDistanceFromPlayers: 120,
    maxAttempts: 32,
  },

  // For defensive structures or obstacles (minimal margins)
  STRUCTURES: {
    margins: { left: 50, right: 50, top: 50, bottom: 50 },
    minDistanceFromPlayers: 200,
    maxAttempts: 16,
  },

  // For temporary effects or visual elements (very minimal constraints)
  EFFECTS: {
    margins: { left: 20, right: 20, top: 20, bottom: 20 },
    minDistanceFromPlayers: 0,
    maxAttempts: 8,
  }
} as const;

// Example 5: Factory function for creating specialized spawn managers
export function createSpawnManager(type: keyof typeof SpawnManagerConfigs): SpawnManager {
  return new SpawnManager(SpawnManagerConfigs[type]);
}

// Export the demonstration function for testing
export { demonstrateSpawnManager };
