import { Vec2 } from '../../core/types/vec2.type';
import { BaseEffect } from './base-effect';
import { EffectType } from './types';
import {
  DamageFlashEffect,
  DeathRingEffect,
  DashTrailEffect,
  ExplosionEffect,
  SparkEffect,
  KnockbackEffect,
  CameraShakeEffect,
  HealPulseEffect,
  ShieldGlowEffect,
  HasteTrailEffect,
  InvulnerabilityEffect,
} from './effects';

/**
 * Factory class for creating common game effects
 */
export class EffectFactory {
  /**
   * Create a damage flash effect
   */
  public static createDamageFlash(
    playerId: string,
    damage: number,
    flashColor: string = '#ff0000',
  ): DamageFlashEffect {
    const id = BaseEffect.generateId(EffectType.DAMAGE_FLASH, playerId);
    return new DamageFlashEffect(id, Date.now(), damage, flashColor);
  }

  /**
   * Create a death ring effect
   */
  public static createDeathRing(
    playerId: string,
    position: Vec2,
    maxRadius: number = 26,
    ringColor: string = '#000000',
  ): DeathRingEffect {
    const id = BaseEffect.generateId(EffectType.DEATH_RING, playerId);
    return new DeathRingEffect(id, Date.now(), position, maxRadius, ringColor);
  }

  /**
   * Create a dash trail effect
   */
  public static createDashTrail(
    playerId: string,
    duration: number,
    trailColor: string = '#9696ff',
  ): DashTrailEffect {
    const id = BaseEffect.generateId(EffectType.DASH_TRAIL, playerId);
    return new DashTrailEffect(id, Date.now(), duration, trailColor);
  }

  /**
   * Create an explosion effect
   */
  public static createExplosion(
    playerId: string | null,
    position: Vec2,
    radius: number,
    damage: number,
    explosionColor: string = '#ff7800',
  ): ExplosionEffect {
    const id = BaseEffect.generateId(
      EffectType.EXPLOSION,
      playerId || undefined,
    );
    return new ExplosionEffect(
      id,
      Date.now(),
      position,
      radius,
      damage,
      explosionColor,
    );
  }

  /**
   * Create a spark effect for projectile bounces
   */
  public static createSpark(
    position: Vec2,
    direction: Vec2,
    sparkColor: string = '#ffc864',
  ): SparkEffect {
    const id = BaseEffect.generateId(EffectType.SPARK);
    return new SparkEffect(id, Date.now(), position, direction, sparkColor);
  }

  /**
   * Create a knockback effect
   */
  public static createKnockback(
    playerId: string,
    velocity: Vec2,
    power: number,
  ): KnockbackEffect {
    const id = BaseEffect.generateId(EffectType.KNOCKBACK, playerId);
    return new KnockbackEffect(id, Date.now(), velocity, power);
  }

  /**
   * Create a camera shake effect
   */
  public static createCameraShake(
    playerId: string,
    amplitude: number,
    frequency: number = 30,
    duration: number = 120,
  ): CameraShakeEffect {
    const id = BaseEffect.generateId(EffectType.CAMERA_SHAKE, playerId);
    return new CameraShakeEffect(
      id,
      Date.now(),
      amplitude,
      frequency,
      duration,
    );
  }

  /**
   * Create a heal pulse effect
   */
  public static createHealPulse(
    playerId: string,
    healAmount: number,
    pulseColor: string = '#00ff00',
  ): HealPulseEffect {
    const id = BaseEffect.generateId(EffectType.HEAL_PULSE, playerId);
    return new HealPulseEffect(id, Date.now(), healAmount, pulseColor);
  }

  /**
   * Create a shield glow effect
   */
  public static createShieldGlow(
    playerId: string,
    duration: number,
    glowColor: string = '#ffff88',
  ): ShieldGlowEffect {
    const id = BaseEffect.generateId(EffectType.SHIELD_GLOW, playerId);
    return new ShieldGlowEffect(id, Date.now(), duration, glowColor);
  }

  /**
   * Create a haste trail effect
   */
  public static createHasteTrail(
    playerId: string,
    duration: number,
    speedMultiplier: number,
    trailColor: string = '#00ffff',
  ): HasteTrailEffect {
    const id = BaseEffect.generateId(EffectType.HASTE_TRAIL, playerId);
    return new HasteTrailEffect(
      id,
      Date.now(),
      duration,
      speedMultiplier,
      trailColor,
    );
  }

  /**
   * Create an invulnerability effect
   */
  public static createInvulnerability(
    playerId: string,
    duration: number,
    flickerRate: number = 8,
  ): InvulnerabilityEffect {
    const id = BaseEffect.generateId(EffectType.INVULNERABILITY, playerId);
    return new InvulnerabilityEffect(id, Date.now(), duration, flickerRate);
  }

  /**
   * Create a damage flash effect with scaling based on damage type
   */
  public static createScaledDamageFlash(
    playerId: string,
    damage: number,
    weaponType: 'bullet' | 'pellet' | 'rocket' | 'explosion' = 'bullet',
  ): DamageFlashEffect {
    let color = '#ff0000';
    let scaleFactor = 1.0;

    switch (weaponType) {
      case 'bullet':
        color = '#ff4444';
        scaleFactor = 1.0;
        break;
      case 'pellet':
        color = '#ff6666';
        scaleFactor = 0.8;
        break;
      case 'rocket':
        color = '#ff2200';
        scaleFactor = 1.5;
        break;
      case 'explosion':
        color = '#ff8800';
        scaleFactor = 2.0;
        break;
    }

    const id = BaseEffect.generateId(EffectType.DAMAGE_FLASH, playerId);
    const effect = new DamageFlashEffect(
      id,
      Date.now(),
      damage * scaleFactor,
      color,
    );

    return effect;
  }

  /**
   * Create an explosion effect sized appropriately for weapon type
   */
  public static createWeaponExplosion(
    playerId: string | null,
    position: Vec2,
    weaponType: 'rocket' | 'grenade' | 'bomb' = 'rocket',
  ): ExplosionEffect {
    let radius = 50;
    let damage = 40;
    let color = '#ff7800';

    switch (weaponType) {
      case 'rocket':
        radius = 50;
        damage = 40;
        color = '#ff7800';
        break;
      case 'grenade':
        radius = 75;
        damage = 60;
        color = '#ff6600';
        break;
      case 'bomb':
        radius = 100;
        damage = 80;
        color = '#ff4400';
        break;
    }

    const id = BaseEffect.generateId(
      EffectType.EXPLOSION,
      playerId || undefined,
    );
    return new ExplosionEffect(id, Date.now(), position, radius, damage, color);
  }

  /**
   * Create appropriate knockback effect based on weapon power
   */
  public static createWeaponKnockback(
    playerId: string,
    direction: Vec2,
    weaponType: 'bullet' | 'pellet' | 'rocket' | 'explosion' = 'bullet',
  ): KnockbackEffect {
    let power = 1.0;

    switch (weaponType) {
      case 'bullet':
        power = 0.8;
        break;
      case 'pellet':
        power = 0.5;
        break;
      case 'rocket':
        power = 2.0;
        break;
      case 'explosion':
        power = 3.0;
        break;
    }

    const velocity: Vec2 = {
      x: direction.x * power,
      y: direction.y * power,
    };

    const id = BaseEffect.generateId(EffectType.KNOCKBACK, playerId);
    return new KnockbackEffect(id, Date.now(), velocity, power);
  }

  /**
   * Create a camera shake effect based on impact intensity
   */
  public static createImpactShake(
    playerId: string,
    impactPower: number,
  ): CameraShakeEffect {
    const amplitude = Math.min(5, Math.max(1, impactPower));
    const frequency = 25 + impactPower * 5;
    const duration = Math.min(200, 80 + impactPower * 20);

    const id = BaseEffect.generateId(EffectType.CAMERA_SHAKE, playerId);
    return new CameraShakeEffect(
      id,
      Date.now(),
      amplitude,
      frequency,
      duration,
    );
  }
}

/**
 * Convenience functions for common effect combinations
 */
export class EffectCombinations {
  /**
   * Create all effects for taking damage
   */
  public static createDamageEffects(
    playerId: string,
    damage: number,
    weaponType: 'bullet' | 'pellet' | 'rocket' | 'explosion' = 'bullet',
    knockbackDirection?: Vec2,
  ): BaseEffect[] {
    const effects: BaseEffect[] = [];

    // Always add damage flash
    effects.push(
      EffectFactory.createScaledDamageFlash(playerId, damage, weaponType),
    );

    // Add knockback if direction provided
    if (knockbackDirection) {
      effects.push(
        EffectFactory.createWeaponKnockback(
          playerId,
          knockbackDirection,
          weaponType,
        ),
      );

      // Add camera shake for significant damage
      if (damage > 15) {
        effects.push(EffectFactory.createImpactShake(playerId, damage / 10));
      }
    }

    return effects;
  }

  /**
   * Create all effects for player death
   */
  public static createDeathEffects(
    playerId: string,
    position: Vec2,
  ): BaseEffect[] {
    const effects: BaseEffect[] = [];

    // Death ring
    effects.push(EffectFactory.createDeathRing(playerId, position));

    // Camera shake for the dying player
    effects.push(EffectFactory.createImpactShake(playerId, 3));

    return effects;
  }

  /**
   * Create all effects for dash ability
   */
  public static createDashEffects(
    playerId: string,
    duration: number,
  ): BaseEffect[] {
    const effects: BaseEffect[] = [];

    // Dash trail
    effects.push(EffectFactory.createDashTrail(playerId, duration));

    // Invulnerability flicker if player has iframes
    effects.push(EffectFactory.createInvulnerability(playerId, duration));

    return effects;
  }

  /**
   * Create all effects for applying buffs
   */
  public static createBuffEffects(
    playerId: string,
    buffType: 'heal' | 'haste' | 'shield',
    duration: number,
  ): BaseEffect[] {
    const effects: BaseEffect[] = [];

    switch (buffType) {
      case 'heal':
        effects.push(EffectFactory.createHealPulse(playerId, 25));
        break;
      case 'haste':
        effects.push(EffectFactory.createHasteTrail(playerId, duration, 1.6));
        break;
      case 'shield':
        effects.push(EffectFactory.createShieldGlow(playerId, duration));
        break;
    }

    return effects;
  }
}
