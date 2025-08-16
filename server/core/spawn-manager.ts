import { Vec2 } from "./types/vec2.type";
import { World } from "./world";

export interface SpawnMargins {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface SpawnConfig {
  margins: SpawnMargins;
  minDistanceFromPlayers: number;
  maxAttempts: number;
}

export class SpawnManager {
  private config: SpawnConfig;

  constructor(config?: Partial<SpawnConfig>) {
    this.config = {
      margins: {
        left: 80,
        right: 80,
        top: 80,
        bottom: 80,
      },
      minDistanceFromPlayers: 180,
      maxAttempts: 64,
      ...config,
    };
  }

  /**
   * Check if a position is within the safe spawn area (not in margins)
   */
  isWithinSpawnBounds(pos: Vec2): boolean {
    return (
      pos.x >= this.config.margins.left &&
      pos.x <= World.bounds.w - this.config.margins.right &&
      pos.y >= this.config.margins.top &&
      pos.y <= World.bounds.h - this.config.margins.bottom
    );
  }

  /**
   * Generate a random position within the safe spawn area
   */
  getRandomSafePosition(): Vec2 {
    const safeWidth = World.bounds.w - this.config.margins.left - this.config.margins.right;
    const safeHeight = World.bounds.h - this.config.margins.top - this.config.margins.bottom;
    
    return {
      x: this.config.margins.left + Math.random() * safeWidth,
      y: this.config.margins.top + Math.random() * safeHeight,
    };
  }

  /**
   * Check if position is blocked by obstacles
   */
  isPositionBlocked(pos: Vec2): boolean {
    for (const obstacle of World.map.obstacles) {
      if (obstacle.type !== 'rect') continue;
      if (
        pos.x >= obstacle.x &&
        pos.x <= obstacle.x + obstacle.w &&
        pos.y >= obstacle.y &&
        pos.y <= obstacle.y + obstacle.h
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Calculate distance from position to nearest player
   */
  getDistanceToNearestPlayer(pos: Vec2): number {
    let minDistance = Infinity;
    for (const player of World.players.values()) {
      const distance = Math.hypot(pos.x - player.pos.x, pos.y - player.pos.y);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }
    return minDistance === Infinity ? 0 : minDistance;
  }

  /**
   * Find a safe spawn position with multiple constraints:
   * - Within spawn margins
   * - Not blocked by obstacles
   * - Minimum distance from players
   */
  findSafeSpawnPosition(customMinDistance?: number): Vec2 {
    const minDistance = customMinDistance ?? this.config.minDistanceFromPlayers;
    
    for (let tries = 0; tries < this.config.maxAttempts; tries++) {
      const pos = this.getRandomSafePosition();
      
      // Check not inside obstacle rects
      if (this.isPositionBlocked(pos)) continue;
      
      // Check not too close to players
      if (this.getDistanceToNearestPlayer(pos) < minDistance) continue;
      
      return pos;
    }
    
    // Fallback: pick the farthest safe position from players among samples
    return this.findBestFallbackPosition();
  }

  /**
   * Fallback method to find the best position when all attempts fail
   */
  private findBestFallbackPosition(): Vec2 {
    let best = { x: 100, y: 100, score: -1 };
    const fallbackSamples = 16;
    
    for (let i = 0; i < fallbackSamples; i++) {
      const pos = this.getRandomSafePosition();
      
      // Skip positions that are blocked by obstacles
      if (this.isPositionBlocked(pos)) continue;
      
      const distanceToNearest = this.getDistanceToNearestPlayer(pos);
      
      if (distanceToNearest > best.score) {
        best = { x: pos.x, y: pos.y, score: distanceToNearest };
      }
    }
    
    // If no unblocked position found, use emergency fallback
    if (best.score === -1) {
      return this.getEmergencyFallbackPosition();
    }
    
    return { x: best.x, y: best.y };
  }

  /**
   * Emergency fallback when no safe position can be found
   * Returns a position that respects margins but may ignore other constraints
   */
  private getEmergencyFallbackPosition(): Vec2 {
    // Try predefined safe spots in corners/center
    const emergencySpots = [
      // Center of map
      { 
        x: World.bounds.w / 2, 
        y: World.bounds.h / 2 
      },
      // Four corners (with margins)
      { 
        x: this.config.margins.left + 50, 
        y: this.config.margins.top + 50 
      },
      { 
        x: World.bounds.w - this.config.margins.right - 50, 
        y: this.config.margins.top + 50 
      },
      { 
        x: this.config.margins.left + 50, 
        y: World.bounds.h - this.config.margins.bottom - 50 
      },
      { 
        x: World.bounds.w - this.config.margins.right - 50, 
        y: World.bounds.h - this.config.margins.bottom - 50 
      },
    ];

    // Find first unblocked emergency spot
    for (const spot of emergencySpots) {
      if (!this.isPositionBlocked(spot)) {
        return spot;
      }
    }

    // Ultimate fallback: return center of map (even if blocked)
    console.warn('SpawnManager: No safe position found, using center of map');
    return { 
      x: World.bounds.w / 2, 
      y: World.bounds.h / 2 
    };
  }

  /**
   * Adjust existing spawn points to respect margins
   */
  adjustSpawnPointsToMargins(spawnPoints: Vec2[]): Vec2[] {
    return spawnPoints.map(point => {
      const adjusted = { ...point };
      
      // Adjust x coordinate
      if (adjusted.x < this.config.margins.left) {
        adjusted.x = this.config.margins.left;
      } else if (adjusted.x > World.bounds.w - this.config.margins.right) {
        adjusted.x = World.bounds.w - this.config.margins.right;
      }
      
      // Adjust y coordinate
      if (adjusted.y < this.config.margins.top) {
        adjusted.y = this.config.margins.top;
      } else if (adjusted.y > World.bounds.h - this.config.margins.bottom) {
        adjusted.y = World.bounds.h - this.config.margins.bottom;
      }
      
      return adjusted;
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): SpawnConfig {
    return { ...this.config };
  }

  /**
   * Update spawn configuration
   */
  updateConfig(newConfig: Partial<SpawnConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get safe spawn bounds as a rectangle
   */
  getSafeSpawnBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.config.margins.left,
      y: this.config.margins.top,
      width: World.bounds.w - this.config.margins.left - this.config.margins.right,
      height: World.bounds.h - this.config.margins.top - this.config.margins.bottom,
    };
  }
}
