import { Vec2 } from '../../core/types/vec2.type';
import { BaseEffect } from './base-effect';
import {
  EffectType,
  DamageFlashData,
  DeathRingData,
  DashTrailData,
  ExplosionData,
  SparkData,
  KnockbackData,
  CameraShakeData,
  HealPulseData,
  ShieldGlowData,
  HasteTrailData,
  InvulnerabilityData,
} from './types';

/**
 * Damage flash effect shown when a player takes damage
 */
export class DamageFlashEffect extends BaseEffect<DamageFlashData> {
  constructor(
    id: string,
    startTime: number,
    damage: number,
    flashColor: string = '#ff0000',
  ) {
    const data: DamageFlashData = {
      damage,
      flashColor,
      intensity: Math.min(1.0, damage / 50), // Scale intensity based on damage
      alpha: 0.6,
    };

    super(id, EffectType.DAMAGE_FLASH, startTime, 180, data); // 180ms duration
  }

  public update(currentTime: number): boolean {
    if (this.isExpired(currentTime)) {
      return false;
    }

    // Update alpha based on progress (fade out)
    const progress = this.getProgress(currentTime);
    this.data.alpha = 0.6 * (1 - this.easeOutQuad(progress));

    return true;
  }
}

/**
 * Death ring effect shown when a player dies
 */
export class DeathRingEffect extends BaseEffect<DeathRingData> {
  constructor(
    id: string,
    startTime: number,
    position: Vec2,
    maxRadius: number = 26,
    ringColor: string = '#000000',
  ) {
    const data: DeathRingData = {
      position: { ...position },
      maxRadius,
      ringColor,
      intensity: 1.0,
      alpha: 1.0,
    };

    super(id, EffectType.DEATH_RING, startTime, 450, data); // 450ms duration
  }

  public update(currentTime: number): boolean {
    if (this.isExpired(currentTime)) {
      return false;
    }

    // Update alpha and radius based on progress
    const progress = this.getProgress(currentTime);
    this.data.alpha = 1 - progress; // Fade out over time
    // Radius grows from 8 to maxRadius
    this.data.intensity = 8 + progress * (this.data.maxRadius - 8);

    return true;
  }
}

/**
 * Dash trail effect shown when a player is dashing
 */
export class DashTrailEffect extends BaseEffect<DashTrailData> {
  constructor(
    id: string,
    startTime: number,
    duration: number,
    trailColor: string = '#9696ff',
  ) {
    const data: DashTrailData = {
      positions: [],
      trailColor,
      maxTrailLength: 120, // ms
      intensity: 0.35,
      alpha: 0.35,
    };

    super(id, EffectType.DASH_TRAIL, startTime, duration, data);
  }

  public addPosition(pos: Vec2, timestamp: number): void {
    this.data.positions.push({ pos: { ...pos }, timestamp });

    // Keep only positions within maxTrailLength
    const cutoff = timestamp - this.data.maxTrailLength;
    while (
      this.data.positions.length > 0 &&
      this.data.positions[0].timestamp < cutoff
    ) {
      this.data.positions.shift();
    }
  }

  public update(currentTime: number): boolean {
    if (this.isExpired(currentTime)) {
      return false;
    }

    // Clean up old positions
    const cutoff = currentTime - this.data.maxTrailLength;
    while (
      this.data.positions.length > 0 &&
      this.data.positions[0].timestamp < cutoff
    ) {
      this.data.positions.shift();
    }

    return true;
  }
}

/**
 * Explosion effect for rocket impacts and area damage
 */
export class ExplosionEffect extends BaseEffect<ExplosionData> {
  constructor(
    id: string,
    startTime: number,
    position: Vec2,
    radius: number,
    damage: number,
    explosionColor: string = '#ff7800',
  ) {
    const data: ExplosionData = {
      position: { ...position },
      radius,
      damage,
      explosionColor,
      intensity: 1.0,
      alpha: 1.0,
    };

    super(id, EffectType.EXPLOSION, startTime, 350, data); // 350ms duration
  }

  public update(currentTime: number): boolean {
    if (this.isExpired(currentTime)) {
      return false;
    }

    // Update alpha and radius based on progress
    const progress = this.getProgress(currentTime);
    this.data.alpha = 1 - progress; // Fade out
    this.data.intensity = progress; // Radius grows from 0 to full radius

    return true;
  }
}

/**
 * Spark effect for projectile bounces
 */
export class SparkEffect extends BaseEffect<SparkData> {
  constructor(
    id: string,
    startTime: number,
    position: Vec2,
    direction: Vec2,
    sparkColor: string = '#ffc864',
  ) {
    const data: SparkData = {
      position: { ...position },
      direction: { ...direction },
      sparkColor,
      intensity: 1.0,
      alpha: 1.0,
    };

    super(id, EffectType.SPARK, startTime, 150, data); // 150ms duration
  }

  public update(currentTime: number): boolean {
    if (this.isExpired(currentTime)) {
      return false;
    }

    // Fade out over time
    const progress = this.getProgress(currentTime);
    this.data.alpha = 1 - progress;

    return true;
  }
}

/**
 * Knockback effect for camera shake and visual feedback
 */
export class KnockbackEffect extends BaseEffect<KnockbackData> {
  constructor(id: string, startTime: number, velocity: Vec2, power: number) {
    const data: KnockbackData = {
      velocity: { ...velocity },
      power,
      intensity: power,
      alpha: 1.0,
    };

    super(id, EffectType.KNOCKBACK, startTime, 120, data); // 120ms duration
  }

  public update(currentTime: number): boolean {
    if (this.isExpired(currentTime)) {
      return false;
    }

    // Reduce intensity over time
    const progress = this.getProgress(currentTime);
    this.data.intensity = this.data.power * (1 - this.easeOutQuad(progress));

    return true;
  }
}

/**
 * Camera shake effect
 */
export class CameraShakeEffect extends BaseEffect<CameraShakeData> {
  constructor(
    id: string,
    startTime: number,
    amplitude: number,
    frequency: number = 30,
    duration: number = 120,
  ) {
    const data: CameraShakeData = {
      amplitude,
      frequency,
      intensity: amplitude,
      alpha: 1.0,
    };

    super(id, EffectType.CAMERA_SHAKE, startTime, duration, data);
  }

  public update(currentTime: number): boolean {
    if (this.isExpired(currentTime)) {
      return false;
    }

    // Reduce shake amplitude over time
    const progress = this.getProgress(currentTime);
    this.data.intensity =
      this.data.amplitude * (1 - this.easeOutQuad(progress));

    return true;
  }
}

/**
 * Heal pulse effect shown when a player is healed
 */
export class HealPulseEffect extends BaseEffect<HealPulseData> {
  constructor(
    id: string,
    startTime: number,
    healAmount: number,
    pulseColor: string = '#00ff00',
  ) {
    const data: HealPulseData = {
      healAmount,
      pulseColor,
      intensity: Math.min(1.0, healAmount / 50),
      alpha: 0.8,
    };

    super(id, EffectType.HEAL_PULSE, startTime, 300, data); // 300ms duration
  }

  public update(currentTime: number): boolean {
    if (this.isExpired(currentTime)) {
      return false;
    }

    // Pulsing effect
    const t = this.getNormalizedTime(currentTime);
    this.data.alpha = 0.8 * (1 + 0.3 * this.sine(t, 3)) * (1 - t);

    return true;
  }
}

/**
 * Shield glow effect for players with shield buff
 */
export class ShieldGlowEffect extends BaseEffect<ShieldGlowData> {
  constructor(
    id: string,
    startTime: number,
    duration: number,
    glowColor: string = '#ffff88',
  ) {
    const data: ShieldGlowData = {
      glowColor,
      pulseSpeed: 2.0,
      intensity: 1.0,
      alpha: 0.4,
    };

    super(id, EffectType.SHIELD_GLOW, startTime, duration, data);
  }

  public update(currentTime: number): boolean {
    if (this.isExpired(currentTime)) {
      return false;
    }

    // Pulsing glow effect
    const t = this.getNormalizedTime(currentTime);
    this.data.alpha = 0.4 * (1 + 0.5 * this.sine(t, this.data.pulseSpeed));

    return true;
  }
}

/**
 * Haste trail effect for players with speed buff
 */
export class HasteTrailEffect extends BaseEffect<HasteTrailData> {
  constructor(
    id: string,
    startTime: number,
    duration: number,
    speedMultiplier: number,
    trailColor: string = '#00ffff',
  ) {
    const data: HasteTrailData = {
      trailColor,
      speedMultiplier,
      intensity: speedMultiplier,
      alpha: 0.3,
    };

    super(id, EffectType.HASTE_TRAIL, startTime, duration, data);
  }

  public update(currentTime: number): boolean {
    if (this.isExpired(currentTime)) {
      return false;
    }

    // Fluctuating trail intensity based on speed
    const t = this.getNormalizedTime(currentTime);
    this.data.alpha = 0.3 * (1 + 0.4 * this.sine(t, 4));

    return true;
  }
}

/**
 * Invulnerability effect for players with iframes
 */
export class InvulnerabilityEffect extends BaseEffect<InvulnerabilityData> {
  constructor(
    id: string,
    startTime: number,
    duration: number,
    flickerRate: number = 8,
  ) {
    const data: InvulnerabilityData = {
      flickerRate,
      intensity: 1.0,
      alpha: 1.0,
    };

    super(id, EffectType.INVULNERABILITY, startTime, duration, data);
  }

  public update(currentTime: number): boolean {
    if (this.isExpired(currentTime)) {
      return false;
    }

    // Flickering effect
    const t = this.getNormalizedTime(currentTime);
    this.data.alpha = Math.abs(this.sine(t, this.data.flickerRate));

    return true;
  }
}
