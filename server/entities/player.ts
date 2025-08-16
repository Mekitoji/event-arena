import { Vec2 } from "../core/types/vec2.type";
import { EffectManager, EffectFactory, EffectCombinations, EffectType, DashTrailEffect, IEffect } from "./effects";
import { PlayerStats } from "./player-stats";

export class Player {
  public readonly id: string;
  public name: string;
  public pos: Vec2;
  public vel: Vec2;
  public face: Vec2;
  public faceTarget?: Vec2;
  public hp: number;
  public cd: Record<string, number>;
  public kb?: { vx: number; vy: number; until: number };
  public iframeUntil?: number;
  public dashUntil?: number;
  public dashFactor?: number;

  // Buffs
  public hasteUntil?: number;
  public hasteFactor?: number;
  public shieldUntil?: number;

  // Player statistics
  public stats: PlayerStats;

  // Death state (keep player in world but mark as dead)
  public isDead?: boolean;
  public diedAt?: number;

  // Effect manager for visual effects
  public effects: EffectManager;

  constructor(
    id: string,
    name: string,
    initialPos: Vec2,
    initialVel: Vec2 = { x: 0, y: 0 },
    initialFace: Vec2 = { x: 1, y: 0 }
  ) {
    this.id = id;
    this.name = name;
    this.pos = { ...initialPos };
    this.vel = { ...initialVel };
    this.face = { ...initialFace };
    this.faceTarget = { ...initialFace };
    this.hp = 100;
    this.cd = {};
    this.isDead = false;

    // Initialize stats and effect manager
    this.stats = new PlayerStats();
    this.effects = new EffectManager(id);
  }

  /**
   * Check if the player is currently alive
   */
  isAlive(): boolean {
    return !this.isDead && this.hp > 0;
  }

  /**
   * Check if the player is currently dead
   */
  isDeadPlayer(): boolean {
    return Boolean(this.isDead) || this.hp <= 0;
  }

  /**
   * Apply damage to the player with weapon type and optional knockback direction
   * Returns true if the player died from this damage
   */
  takeDamage(
    amount: number,
    weaponType: 'bullet' | 'pellet' | 'rocket' | 'explosion' = 'bullet',
    knockbackDirection?: Vec2
  ): boolean {
    const wasAlive = this.isAlive();
    this.hp = Math.max(0, this.hp - amount);

    // Record damage taken in stats
    this.stats.addDamageTaken(amount);

    // Add damage effects
    const damageEffects = EffectCombinations.createDamageEffects(
      this.id,
      amount,
      weaponType,
      knockbackDirection
    );

    for (const effect of damageEffects) {
      this.effects.addEffect(effect);
    }

    if (wasAlive && this.hp <= 0) {
      this.die();
      return true; // Player just died
    }

    return false; // Player survived or was already dead
  }

  /**
   * Heal the player by a specific amount
   */
  heal(amount: number): void {
    this.hp = Math.min(100, this.hp + amount);

    // Add heal pulse effect
    const healEffect = EffectFactory.createHealPulse(this.id, amount);
    this.effects.addEffect(healEffect);
  }

  /**
   * Mark the player as dead
   */
  die(): void {
    this.isDead = true;
    this.diedAt = Date.now();
    this.hp = 0;
    
    // Record death in stats
    this.stats.addDeath();

    // Add death effects
    const deathEffects = EffectCombinations.createDeathEffects(this.id, this.pos);
    for (const effect of deathEffects) {
      this.effects.addEffect(effect);
    }
  }

  /**
   * Respawn the player at a new position
   */
  respawn(newPos: Vec2): void {
    this.pos = { ...newPos };
    this.vel = { x: 0, y: 0 };
    this.face = { x: 1, y: 0 };
    this.faceTarget = { x: 1, y: 0 };
    this.hp = 100;
    this.cd = {};
    this.isDead = false;
    this.diedAt = undefined;

    // Clear temporary effects
    this.kb = undefined;
    this.iframeUntil = undefined;
    this.dashUntil = undefined;
    this.dashFactor = undefined;

    // Clear all visual effects on respawn
    this.effects.clearAllEffects();
    
    // Reset stats for new life (but keep match stats)
    // Note: We don't call stats.reset() here as that would reset the entire match
  }

  /**
   * Add a kill to the player's stats
   */
  addKill(): void {
    this.stats.addKill();
  }

  /**
   * Add an assist to the player's stats
   */
  addAssist(): void {
    this.stats.addAssist();
  }

  /**
   * Record damage dealt by this player
   */
  addDamageDealt(amount: number): void {
    this.stats.addDamageDealt(amount);
  }

  /**
   * Record a shot fired by this player
   */
  addShotFired(): void {
    this.stats.addShotFired();
  }

  /**
   * Record a shot hit by this player
   */
  addShotHit(): void {
    this.stats.addShotHit();
  }

  /**
   * Check if the player has invincibility frames active
   */
  hasIframes(): boolean {
    return Boolean(this.iframeUntil && this.iframeUntil > Date.now());
  }

  /**
   * Check if the player is currently dashing
   */
  isDashing(): boolean {
    return Boolean(this.dashUntil && this.dashUntil > Date.now());
  }

  /**
   * Check if the player has haste buff active
   */
  hasHaste(): boolean {
    return Boolean(this.hasteUntil && this.hasteUntil > Date.now());
  }

  /**
   * Check if the player has shield buff active
   */
  hasShield(): boolean {
    return Boolean(this.shieldUntil && this.shieldUntil > Date.now());
  }

  /**
   * Check if the player is affected by knockback
   */
  hasKnockback(): boolean {
    return Boolean(this.kb && this.kb.until > Date.now());
  }

  /**
   * Apply haste buff to the player
   */
  applyHaste(durationMs: number, factor: number = 1.6): void {
    this.hasteUntil = Date.now() + durationMs;
    this.hasteFactor = factor;

    // Add haste visual effects
    const hasteEffects = EffectCombinations.createBuffEffects(this.id, 'haste', durationMs);
    for (const effect of hasteEffects) {
      this.effects.addEffect(effect);
    }
  }

  /**
   * Apply shield buff to the player
   */
  applyShield(durationMs: number): void {
    this.shieldUntil = Date.now() + durationMs;

    // Add shield visual effects
    const shieldEffects = EffectCombinations.createBuffEffects(this.id, 'shield', durationMs);
    for (const effect of shieldEffects) {
      this.effects.addEffect(effect);
    }
  }

  /**
   * Apply dash effect to the player
   */
  applyDash(durationMs: number, factor: number = 3.0, hasIframes: boolean = true): void {
    this.dashUntil = Date.now() + durationMs;
    this.dashFactor = factor;

    if (hasIframes) {
      this.iframeUntil = Date.now() + durationMs;
    }

    // Add dash visual effects
    const dashEffects = EffectCombinations.createDashEffects(this.id, durationMs);
    for (const effect of dashEffects) {
      this.effects.addEffect(effect);
    }
  }

  /**
   * Apply knockback to the player
   */
  applyKnockback(vx: number, vy: number, durationMs: number): void {
    this.kb = {
      vx,
      vy,
      until: Date.now() + durationMs
    };
  }

  /**
   * Set cooldown for a specific ability
   */
  setCooldown(ability: string, cooldownMs: number): void {
    this.cd[ability] = Date.now() + cooldownMs;
  }

  /**
   * Check if an ability is on cooldown
   */
  isOnCooldown(ability: string): boolean {
    const cooldownEnd = this.cd[ability];
    return Boolean(cooldownEnd && cooldownEnd > Date.now());
  }

  /**
   * Get remaining cooldown time in milliseconds
   */
  getRemainingCooldown(ability: string): number {
    const cooldownEnd = this.cd[ability];
    if (!cooldownEnd) return 0;

    const remaining = cooldownEnd - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Update the player's facing direction
   */
  setFaceDirection(dir: Vec2): void {
    const length = Math.hypot(dir.x, dir.y);
    if (length > 0) {
      this.faceTarget = {
        x: dir.x / length,
        y: dir.y / length
      };
    }
  }

  /**
   * Get the player's effective movement speed (including haste)
   */
  getEffectiveSpeed(): number {
    const baseSpeed = 1.0;
    return this.hasHaste() ? baseSpeed * (this.hasteFactor || 1.6) : baseSpeed;
  }

  /**
   * Update dash trail position if player is dashing
   */
  updateDashTrail(): void {
    const dashTrail = this.effects.getEffectByType(EffectType.DASH_TRAIL) as DashTrailEffect;
    if (dashTrail && this.isDashing()) {
      dashTrail.addPosition(this.pos, Date.now());
    }
  }

  /**
   * Clean up expired effects
   */
  updateEffects(): void {
    const now = Date.now();

    // Update the effect manager (this will clean up expired effects)
    this.effects.update(now);

    // Update dash trail position if dashing
    this.updateDashTrail();

    // Clear expired haste
    if (this.hasteUntil && this.hasteUntil <= now) {
      this.hasteUntil = undefined;
      this.hasteFactor = undefined;
    }

    // Clear expired shield
    if (this.shieldUntil && this.shieldUntil <= now) {
      this.shieldUntil = undefined;
    }

    // Clear expired dash
    if (this.dashUntil && this.dashUntil <= now) {
      this.dashUntil = undefined;
      this.dashFactor = undefined;
    }

    // Clear expired iframes
    if (this.iframeUntil && this.iframeUntil <= now) {
      this.iframeUntil = undefined;
    }

    // Clear expired knockback
    if (this.kb && this.kb.until <= now) {
      this.kb = undefined;
    }
  }

  /**
   * Get all active effects for serialization
   */
  getActiveEffects() {
    return this.effects.toJSON();
  }

  /**
   * Helper method to check if player has a specific effect active
   */
  hasEffect(effectType: EffectType): boolean {
    return this.effects.hasEffectType(effectType);
  }

  /**
   * Helper method to add a custom effect
   */
  addEffect(effect: IEffect): void {
    this.effects.addEffect(effect);
  }

  /**
   * Helper method to remove effects of a specific type
   */
  removeEffectsByType(effectType: EffectType): number {
    return this.effects.removeEffectsByType(effectType);
  }

  /**
   * Get player statistics summary
   */
  getStatsSummary() {
    return this.stats.getSummary();
  }

  /**
   * Get current kill streak
   */
  getCurrentStreak(): number {
    return this.stats.currentStreak;
  }

  /**
   * Get streak announcement if player is on a notable streak
   */
  getStreakAnnouncement(): string | null {
    return this.stats.getStreakAnnouncement();
  }

  /**
   * Check if player has a notable streak
   */
  hasNotableStreak(): boolean {
    return this.stats.hasNotableStreak();
  }

  /**
   * Get a simple object representation for serialization
   */
  toJSON(): object {
    return {
      id: this.id,
      name: this.name,
      pos: this.pos,
      vel: this.vel,
      face: this.face,
      faceTarget: this.faceTarget,
      hp: this.hp,
      cd: this.cd,
      kb: this.kb,
      iframeUntil: this.iframeUntil,
      dashUntil: this.dashUntil,
      dashFactor: this.dashFactor,
      hasteUntil: this.hasteUntil,
      hasteFactor: this.hasteFactor,
      shieldUntil: this.shieldUntil,
      stats: this.stats.toJSON(),
      isDead: this.isDead,
      diedAt: this.diedAt
    };
  }
}
