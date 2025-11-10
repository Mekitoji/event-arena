import {
  EffectsRenderer,
  MapRenderer,
  PlayerRenderer,
  ProjectileRenderer,
  PickupRenderer,
  HUDRenderer,
} from '../renderers/index.js';

/**
 * RenderManager - Single Responsibility: Orchestrate the rendering pipeline
 * Composition over Inheritance: Composes multiple specialized renderers
 */
export class RenderManager {
  constructor(canvas, gameState) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.gameState = gameState;
    this.isRunning = false;
    this.animationFrameId = null;

    // Initialize all renderers
    this.effectsRenderer = new EffectsRenderer(this.ctx, gameState);
    this.mapRenderer = new MapRenderer(this.ctx, gameState);
    this.playerRenderer = new PlayerRenderer(this.ctx, gameState);
    this.projectileRenderer = new ProjectileRenderer(this.ctx, gameState);
    this.pickupRenderer = new PickupRenderer(this.ctx, gameState);
    this.hudRenderer = new HUDRenderer(this.ctx, gameState);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.render();
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  render() {
    if (!this.isRunning) return;

    // Apply camera shake if active
    const hasShake = this.effectsRenderer.renderCameraShake();

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Render in layers (back to front)
    // 1. HUD overlays (match status, announcements) - behind everything
    this.hudRenderer.render();

    // 2. Map
    this.mapRenderer.render();

    // 3. Effects (sparks, explosions, dash trails)
    this.effectsRenderer.render();

    // 4. Pickups
    this.pickupRenderer.render();

    // 5. Projectiles
    this.projectileRenderer.render();

    // 6. Players
    this.playerRenderer.render();

    // 7. Death effects (on top of players)
    this.effectsRenderer.renderDeathEffects();

    // Restore camera shake if applied
    if (hasShake) {
      this.effectsRenderer.restoreCameraShake();
    }

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(() => this.render());
  }
}
