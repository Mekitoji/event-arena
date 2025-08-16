import { IEffect, EffectType, EffectEvent, EffectEventCallback, EffectJSON } from './types';

/**
 * Manages effects for a single player
 */
export class EffectManager {
  private effects: Map<string, IEffect> = new Map();
  private eventCallbacks: Map<EffectEvent, EffectEventCallback[]> = new Map();
  private playerId: string;

  constructor(playerId: string) {
    this.playerId = playerId;

    // Initialize event callback arrays
    Object.values(EffectEvent).forEach(event => {
      this.eventCallbacks.set(event, []);
    });
  }

  /**
   * Add an effect to the manager
   */
  public addEffect(effect: IEffect): void {
    // Remove existing effect of the same type if it exists
    const existingEffect = this.getEffectByType(effect.type);
    if (existingEffect) {
      this.removeEffect(existingEffect.id);
    }

    this.effects.set(effect.id, effect);
    this.emit(EffectEvent.ADDED, effect);
  }

  /**
   * Remove an effect by ID
   */
  public removeEffect(effectId: string): boolean {
    const effect = this.effects.get(effectId);
    if (!effect) {
      return false;
    }

    this.effects.delete(effectId);
    this.emit(EffectEvent.REMOVED, effect);
    return true;
  }

  /**
   * Remove all effects of a specific type
   */
  public removeEffectsByType(type: EffectType): number {
    let removedCount = 0;
    const effectsToRemove: IEffect[] = [];

    for (const effect of this.effects.values()) {
      if (effect.type === type) {
        effectsToRemove.push(effect);
      }
    }

    for (const effect of effectsToRemove) {
      if (this.removeEffect(effect.id)) {
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Clear all effects
   */
  public clearAllEffects(): void {
    const effectsToRemove = Array.from(this.effects.keys());
    for (const effectId of effectsToRemove) {
      this.removeEffect(effectId);
    }
  }

  /**
   * Update all effects and remove expired ones
   */
  public update(currentTime: number = Date.now()): void {
    const effectsToRemove: string[] = [];

    for (const [effectId, effect] of this.effects) {
      const shouldContinue = effect.update(currentTime);

      if (!shouldContinue || effect.isExpired(currentTime)) {
        effectsToRemove.push(effectId);
        this.emit(EffectEvent.EXPIRED, effect);
      } else {
        this.emit(EffectEvent.UPDATED, effect);
      }
    }

    // Remove expired effects
    for (const effectId of effectsToRemove) {
      this.removeEffect(effectId);
    }
  }

  /**
   * Get an effect by ID
   */
  public getEffect(effectId: string): IEffect | undefined {
    return this.effects.get(effectId);
  }

  /**
   * Get the first effect of a specific type
   */
  public getEffectByType(type: EffectType): IEffect | undefined {
    for (const effect of this.effects.values()) {
      if (effect.type === type) {
        return effect;
      }
    }
    return undefined;
  }

  /**
   * Get all effects of a specific type
   */
  public getEffectsByType(type: EffectType): IEffect[] {
    const results: IEffect[] = [];
    for (const effect of this.effects.values()) {
      if (effect.type === type) {
        results.push(effect);
      }
    }
    return results;
  }

  /**
   * Get all active effects
   */
  public getAllEffects(): IEffect[] {
    return Array.from(this.effects.values());
  }

  /**
   * Check if an effect of a specific type is active
   */
  public hasEffectType(type: EffectType): boolean {
    return this.getEffectByType(type) !== undefined;
  }

  /**
   * Check if any effects are active
   */
  public hasAnyEffects(): boolean {
    return this.effects.size > 0;
  }

  /**
   * Get the number of active effects
   */
  public getEffectCount(): number {
    return this.effects.size;
  }

  /**
   * Get the number of effects of a specific type
   */
  public getEffectCountByType(type: EffectType): number {
    return this.getEffectsByType(type).length;
  }

  /**
   * Register an event callback
   */
  public on(event: EffectEvent, callback: EffectEventCallback): void {
    const callbacks = this.eventCallbacks.get(event) || [];
    callbacks.push(callback);
    this.eventCallbacks.set(event, callbacks);
  }

  /**
   * Remove an event callback
   */
  public off(event: EffectEvent, callback: EffectEventCallback): boolean {
    const callbacks = this.eventCallbacks.get(event) || [];
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
      this.eventCallbacks.set(event, callbacks);
      return true;
    }
    return false;
  }

  /**
   * Emit an event to all registered callbacks
   */
  private emit(event: EffectEvent, effect: IEffect): void {
    const callbacks = this.eventCallbacks.get(event) || [];
    for (const callback of callbacks) {
      try {
        callback(effect);
      } catch (error) {
        console.error(`Error in effect event callback for ${event}:`, error);
      }
    }
  }

  /**
   * Serialize all effects for network transmission
   */
  public toJSON(): EffectJSON[] {
    return Array.from(this.effects.values()).map(effect => effect.toJSON());
  }

  /**
   * Get a summary of effects for debugging
   */
  public getDebugSummary(): object {
    const summary: Record<string, number> = {};

    for (const effect of this.effects.values()) {
      const type = effect.type.toString();
      summary[type] = (summary[type] || 0) + 1;
    }

    return {
      playerId: this.playerId,
      totalEffects: this.effects.size,
      effectsByType: summary
    };
  }

  /**
   * Clean up expired cooldowns and temporary properties
   * This method can be called by systems to clean up state
   */
  public cleanup(currentTime: number = Date.now()): void {
    this.update(currentTime);
  }
}
