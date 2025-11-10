import { BaseRenderer } from './base.renderer.js';
import { WORLD_TO_CANVAS } from './consts/index.js';

/**
 * PlayerRenderer - Renders all players with effects
 */
export class PlayerRenderer extends BaseRenderer {
  render() {
    const now = performance.now();

    for (const player of this.gameState.players.values()) {
      if (player.isDead) continue; // Skip dead players

      this.renderPlayer(player, now);
    }
  }

  renderPlayer(player, now) {
    const x = player.pos.x * WORLD_TO_CANVAS;
    const y = player.pos.y * WORLD_TO_CANVAS;

    // Base body
    this.ctx.fillStyle = '#111';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 8, 0, Math.PI * 2);
    this.ctx.fill();

    // Facing indicator (gun)
    const face = player.face || { x: 1, y: 0 };
    const mag = Math.hypot(face.x, face.y) || 1;
    const fx = face.x / mag;
    const fy = face.y / mag;
    this.ctx.strokeStyle = '#555';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x + fx * 14, y + fy * 14);
    this.ctx.stroke();

    // Damage flash overlay
    const dmg = this.gameState.effects.damage.get(player.id);
    if (dmg) {
      const alpha = Math.max(0, (dmg.until - now) / 180);
      this.ctx.fillStyle = `rgba(255,0,0,${0.6 * alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 10, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
}
