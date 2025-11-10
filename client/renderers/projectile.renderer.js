import { BaseRenderer } from './base.renderer.js';
import { WORLD_TO_CANVAS } from './consts/index.js';

/**
 * ProjectileRenderer - Renders projectiles
 */
export class ProjectileRenderer extends BaseRenderer {
  render() {
    for (const projectile of this.gameState.projectiles.values()) {
      this.renderProjectile(projectile);
    }
  }

  renderProjectile(projectile) {
    let radius = 4;
    let color = '#333';

    if (projectile.kind === 'pellet') {
      radius = 3;
      color = '#555';
    } else if (projectile.kind === 'rocket') {
      radius = 6;
      color = '#d33';
    }

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(
      projectile.pos.x * WORLD_TO_CANVAS,
      projectile.pos.y * WORLD_TO_CANVAS,
      radius,
      0,
      Math.PI * 2,
    );
    this.ctx.fill();
  }
}
