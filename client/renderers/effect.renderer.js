import { BaseRenderer } from './base.renderer.js';
import { WORLD_TO_CANVAS } from './consts/index.js';

/**
 * EffectsRenderer - Renders visual effects (camera shake, damage, death, explosions, etc.)
 */
export class EffectsRenderer extends BaseRenderer {
  render() {
    const now = performance.now();

    // Camera shake
    this.renderCameraShake();

    // Cleanup expired effects
    this.cleanupExpiredEffects(now);

    // Render visual effects
    this.renderSparks(now);
    this.renderExplosions(now);
    this.renderDashTrails(now);
  }

  renderCameraShake() {
    const shake = this.gameState.effects.shake;
    if (shake && shake.until > performance.now()) {
      const amp = shake.amp;
      this.ctx.save();
      this.ctx.translate(
        (Math.random() - 0.5) * amp,
        (Math.random() - 0.5) * amp,
      );
      return true;
    }
    return false;
  }

  restoreCameraShake() {
    const shake = this.gameState.effects.shake;
    if (shake && shake.until > performance.now()) {
      this.ctx.restore();
    }
  }

  cleanupExpiredEffects(now) {
    // Cleanup damage flashes
    for (const [pid, fx] of this.gameState.effects.damage) {
      if (fx.until <= now) this.gameState.effects.damage.delete(pid);
    }

    // Cleanup death effects
    for (const [pid, fx] of this.gameState.effects.death) {
      const t = (now - fx.start) / fx.dur;
      if (t >= 1) this.gameState.effects.death.delete(pid);
    }
  }

  renderSparks(now) {
    const sparks = this.gameState.effects.sparks;
    if (!sparks) return;

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      const t = (now - s.ts) / s.dur;
      if (t >= 1) {
        sparks.splice(i, 1);
        continue;
      }
      this.ctx.strokeStyle = `rgba(255,200,100,${1 - t})`;
      this.ctx.beginPath();
      this.ctx.moveTo(s.x * WORLD_TO_CANVAS - 4, s.y * WORLD_TO_CANVAS);
      this.ctx.lineTo(s.x * WORLD_TO_CANVAS + 4, s.y * WORLD_TO_CANVAS);
      this.ctx.stroke();
    }
  }

  renderExplosions(now) {
    const explosions = this.gameState.effects.explosions;
    if (!explosions) return;

    for (const [id, fx] of explosions) {
      const t = (now - fx.start) / fx.dur;
      if (t >= 1) {
        explosions.delete(id);
        continue;
      }
      const r = fx.radius * t;
      const a = 1 - t;
      this.ctx.strokeStyle = `rgba(255,120,0,${a})`;
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.arc(
        fx.pos.x * WORLD_TO_CANVAS,
        fx.pos.y * WORLD_TO_CANVAS,
        r * WORLD_TO_CANVAS,
        0,
        Math.PI * 2,
      );
      this.ctx.stroke();
    }
  }

  renderDashTrails(now) {
    const dashTrails = this.gameState.effects.dashTrails;
    if (!dashTrails) return;

    for (const [pid, arr] of dashTrails) {
      const player = this.gameState.players.get(pid);

      // Record only while dash is active
      if (player && this.gameState.effects.dashActive.has(pid)) {
        arr.push({ x: player.pos.x, y: player.pos.y, ts: now });
      }

      // Keep last 120ms snapshots
      while (arr.length && now - arr[0].ts > 120) arr.shift();

      // Draw existing points
      if (arr.length) {
        this.ctx.strokeStyle = 'rgba(150,150,255,0.35)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        for (let i = 0; i < arr.length; i++) {
          const a = 1 - (now - arr[i].ts) / 120;
          this.ctx.globalAlpha = Math.max(0, a);
          this.ctx.moveTo(
            arr[i].x * WORLD_TO_CANVAS,
            arr[i].y * WORLD_TO_CANVAS,
          );
          this.ctx.lineTo(
            arr[i].x * WORLD_TO_CANVAS + 6,
            arr[i].y * WORLD_TO_CANVAS,
          );
        }
        this.ctx.stroke();
        this.ctx.globalAlpha = 1;
      }

      // Cleanup if trail finished and no points left
      if (!this.gameState.effects.dashActive.has(pid) && arr.length === 0) {
        dashTrails.delete(pid);
      }
    }
  }

  renderDeathEffects() {
    const now = performance.now();
    for (const fx of this.gameState.effects.death.values()) {
      const t = Math.min(1, (now - fx.start) / fx.dur);
      const x = fx.pos.x * WORLD_TO_CANVAS;
      const y = fx.pos.y * WORLD_TO_CANVAS;
      const r = 8 + t * 18;
      const a = 1 - t;
      this.ctx.strokeStyle = `rgba(0,0,0,${a})`;
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(x, y, r, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }
}
