import { IEffect, EffectType, EffectData, EffectJSON } from './types';

/**
 * Base implementation of the IEffect interface
 */
export abstract class BaseEffect<T extends EffectData = EffectData> implements IEffect<T> {
  public readonly id: string;
  public readonly type: EffectType;
  public readonly startTime: number;
  public readonly duration: number;
  public readonly data: T;

  constructor(
    id: string,
    type: EffectType,
    startTime: number,
    duration: number,
    data: T
  ) {
    this.id = id;
    this.type = type;
    this.startTime = startTime;
    this.duration = duration;
    this.data = { ...data } as T;
  }

  /**
   * Update the effect. Override in subclasses for custom behavior.
   * Returns false if the effect should be removed.
   */
  public update(currentTime: number): boolean {
    // Default behavior: remove if expired
    return !this.isExpired(currentTime);
  }

  /**
   * Check if the effect is expired
   */
  public isExpired(currentTime: number): boolean {
    return currentTime >= this.startTime + this.duration;
  }

  /**
   * Get the remaining duration in milliseconds
   */
  public getRemainingDuration(currentTime: number): number {
    const endTime = this.startTime + this.duration;
    return Math.max(0, endTime - currentTime);
  }

  /**
   * Get the progress of the effect (0.0 to 1.0)
   */
  public getProgress(currentTime: number): number {
    const elapsed = currentTime - this.startTime;
    return Math.min(1.0, Math.max(0.0, elapsed / this.duration));
  }

  /**
   * Get the normalized time (0.0 to 1.0) for easing functions
   */
  protected getNormalizedTime(currentTime: number): number {
    return this.getProgress(currentTime);
  }

  /**
   * Linear interpolation utility
   */
  protected lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  /**
   * Ease in quad function
   */
  protected easeInQuad(t: number): number {
    return t * t;
  }

  /**
   * Ease out quad function
   */
  protected easeOutQuad(t: number): number {
    return 1 - (1 - t) * (1 - t);
  }

  /**
   * Ease in out quad function
   */
  protected easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /**
   * Sine wave function for pulsing effects
   */
  protected sine(t: number, frequency: number = 1): number {
    return Math.sin(t * Math.PI * 2 * frequency);
  }

  /**
   * Serialize the effect for network transmission
   */
  public toJSON(): EffectJSON {
    const currentTime = Date.now();
    return {
      id: this.id,
      type: this.type,
      startTime: this.startTime,
      duration: this.duration,
      data: this.data,
      progress: this.getProgress(currentTime),
      remainingDuration: this.getRemainingDuration(currentTime)
    };
  }

  /**
   * Create a unique ID for effects
   */
  public static generateId(type: EffectType, playerId?: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    const prefix = playerId ? `${playerId}-` : '';
    return `${prefix}${type}-${timestamp}-${random}`;
  }
}
