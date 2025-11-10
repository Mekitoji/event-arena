import { BaseRenderer } from './base.renderer.js';
import { WORLD_TO_CANVAS } from './consts/index.js';

/**
 * MapRenderer - Renders the game map (obstacles)
 */
export class MapRenderer extends BaseRenderer {
  render() {
    if (!this.gameState.map || !Array.isArray(this.gameState.map.obstacles)) {
      return;
    }

    this.ctx.fillStyle = '#777';
    for (const obstacle of this.gameState.map.obstacles) {
      if (obstacle.type === 'rect') {
        this.ctx.fillRect(
          obstacle.x * WORLD_TO_CANVAS,
          obstacle.y * WORLD_TO_CANVAS,
          obstacle.w * WORLD_TO_CANVAS,
          obstacle.h * WORLD_TO_CANVAS,
        );
      }
    }
  }
}
