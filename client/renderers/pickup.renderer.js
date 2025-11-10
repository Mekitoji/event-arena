import { BaseRenderer } from './base.renderer.js';
import { WORLD_TO_CANVAS } from './consts/index.js';

/**
 * PickupRenderer - Renders pickups with labels
 */
export class PickupRenderer extends BaseRenderer {
  render() {
    for (const pickup of this.gameState.pickups.values()) {
      this.renderPickup(pickup);
    }
  }

  renderPickup(pickup) {
    const x = pickup.pos.x * WORLD_TO_CANVAS;
    const y = pickup.pos.y * WORLD_TO_CANVAS;

    let color = '#ccc';
    let label = '?';

    if (pickup.kind === 'heal') {
      color = '#3c3';
      label = '+';
    } else if (pickup.kind === 'haste') {
      color = '#39c';
      label = 'h';
    } else if (pickup.kind === 'shield') {
      color = '#cc3';
      label = 'S';
    }

    // Circle
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 7, 0, Math.PI * 2);
    this.ctx.fill();

    // Outline
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 7, 0, Math.PI * 2);
    this.ctx.stroke();

    // Label
    this.ctx.fillStyle = '#000';
    this.ctx.font = '10px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(label, x, y + 0.5);
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
  }
}
