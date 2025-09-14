/**
 * Player statistics tracking class
 * Handles kills, deaths, assists, streaks, and derived statistics
 */
export class PlayerStats {
  public kills: number = 0;
  public deaths: number = 0;
  public assists: number = 0;
  public currentStreak: number = 0;
  public bestStreak: number = 0;

  // Additional stats that could be useful
  public damageDealt: number = 0;
  public damageTaken: number = 0;
  public shotsHit: number = 0;
  public shotsFired: number = 0;

  // Match-specific tracking
  public matchStartTime: number;
  public lastKillTime?: number;
  public lastDeathTime?: number;

  constructor() {
    this.matchStartTime = Date.now();
  }

  /**
   * Record a kill for this player
   */
  addKill(timestamp: number = Date.now()): void {
    this.kills++;
    this.currentStreak++;
    this.lastKillTime = timestamp;

    // Update best streak if current streak is higher
    if (this.currentStreak > this.bestStreak) {
      this.bestStreak = this.currentStreak;
    }
  }

  /**
   * Record a death for this player
   */
  addDeath(timestamp: number = Date.now()): void {
    this.deaths++;
    this.currentStreak = 0; // Reset streak on death
    this.lastDeathTime = timestamp;
  }

  /**
   * Record an assist for this player
   */
  addAssist(): void {
    this.assists++;
  }

  /**
   * Record damage dealt by this player
   */
  addDamageDealt(amount: number): void {
    this.damageDealt += amount;
  }

  /**
   * Record damage taken by this player
   */
  addDamageTaken(amount: number): void {
    this.damageTaken += amount;
  }

  /**
   * Record a shot fired
   */
  addShotFired(): void {
    this.shotsFired++;
  }

  /**
   * Record a shot that hit a target
   */
  addShotHit(): void {
    this.shotsHit++;
    this.addShotFired(); // A hit also counts as a shot fired
  }

  /**
   * Calculate Kill/Death ratio
   */
  getKDRatio(): number {
    if (this.deaths === 0) {
      return this.kills; // If no deaths, return kills as ratio
    }
    return Math.round((this.kills / this.deaths) * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate Kill+Assist/Death ratio
   */
  getKADRatio(): number {
    if (this.deaths === 0) {
      return this.kills + this.assists;
    }
    return Math.round(((this.kills + this.assists) / this.deaths) * 100) / 100;
  }

  /**
   * Calculate accuracy percentage
   */
  getAccuracy(): number {
    if (this.shotsFired === 0) {
      return 0;
    }
    return Math.round((this.shotsHit / this.shotsFired) * 100);
  }

  /**
   * Calculate damage per kill
   */
  getDamagePerKill(): number {
    if (this.kills === 0) {
      return 0;
    }
    return Math.round(this.damageDealt / this.kills);
  }

  /**
   * Calculate average damage per minute
   */
  getDamagePerMinute(): number {
    const matchDurationMs = Date.now() - this.matchStartTime;
    const matchDurationMin = matchDurationMs / (1000 * 60);

    if (matchDurationMin === 0) {
      return 0;
    }

    return Math.round(this.damageDealt / matchDurationMin);
  }

  /**
   * Get the player's current streak category
   */
  getStreakCategory(): StreakCategory {
    if (this.currentStreak >= 10) return StreakCategory.LEGENDARY;
    if (this.currentStreak >= 7) return StreakCategory.RAMPAGE;
    if (this.currentStreak >= 5) return StreakCategory.UNSTOPPABLE;
    if (this.currentStreak >= 3) return StreakCategory.KILLING_SPREE;
    if (this.currentStreak >= 2) return StreakCategory.DOUBLE_KILL;
    return StreakCategory.NONE;
  }

  /**
   * Get streak announcement text
   */
  getStreakAnnouncement(): string | null {
    const category = this.getStreakCategory();

    switch (category) {
      case StreakCategory.DOUBLE_KILL:
        return 'Double Kill!';
      case StreakCategory.KILLING_SPREE:
        return 'Killing Spree!';
      case StreakCategory.UNSTOPPABLE:
        return 'Unstoppable!';
      case StreakCategory.RAMPAGE:
        return 'Rampage!';
      case StreakCategory.LEGENDARY:
        return 'LEGENDARY!';
      default:
        return null;
    }
  }

  /**
   * Check if player is on a notable streak
   */
  hasNotableStreak(): boolean {
    return this.currentStreak >= 2;
  }

  /**
   * Reset all statistics (for new match)
   */
  reset(): void {
    this.kills = 0;
    this.deaths = 0;
    this.assists = 0;
    this.currentStreak = 0;
    this.bestStreak = 0;
    this.damageDealt = 0;
    this.damageTaken = 0;
    this.shotsHit = 0;
    this.shotsFired = 0;
    this.matchStartTime = Date.now();
    this.lastKillTime = undefined;
    this.lastDeathTime = undefined;
  }

  /**
   * Get a summary of all statistics
   */
  getSummary(): PlayerStatsSummary {
    return {
      kills: this.kills,
      deaths: this.deaths,
      assists: this.assists,
      currentStreak: this.currentStreak,
      bestStreak: this.bestStreak,
      kdRatio: this.getKDRatio(),
      kadRatio: this.getKADRatio(),
      accuracy: this.getAccuracy(),
      damageDealt: this.damageDealt,
      damageTaken: this.damageTaken,
      damagePerKill: this.getDamagePerKill(),
      damagePerMinute: this.getDamagePerMinute(),
      shotsFired: this.shotsFired,
      shotsHit: this.shotsHit,
      matchDurationMs: Date.now() - this.matchStartTime,
    };
  }

  /**
   * Serialize for network transmission or storage
   */
  toJSON(): PlayerStatsJSON {
    return {
      kills: this.kills,
      deaths: this.deaths,
      assists: this.assists,
      currentStreak: this.currentStreak,
      bestStreak: this.bestStreak,
      damageDealt: this.damageDealt,
      damageTaken: this.damageTaken,
      shotsHit: this.shotsHit,
      shotsFired: this.shotsFired,
      matchStartTime: this.matchStartTime,
      lastKillTime: this.lastKillTime,
      lastDeathTime: this.lastDeathTime,
    };
  }

  /**
   * Create from serialized data
   */
  static fromJSON(data: PlayerStatsJSON): PlayerStats {
    const stats = new PlayerStats();
    stats.kills = data.kills;
    stats.deaths = data.deaths;
    stats.assists = data.assists;
    stats.currentStreak = data.currentStreak;
    stats.bestStreak = data.bestStreak;
    stats.damageDealt = data.damageDealt;
    stats.damageTaken = data.damageTaken;
    stats.shotsHit = data.shotsHit;
    stats.shotsFired = data.shotsFired;
    stats.matchStartTime = data.matchStartTime;
    stats.lastKillTime = data.lastKillTime;
    stats.lastDeathTime = data.lastDeathTime;
    return stats;
  }
}

/**
 * Streak categories for kill streaks
 */
export enum StreakCategory {
  NONE = 'none',
  DOUBLE_KILL = 'double_kill',
  KILLING_SPREE = 'killing_spree',
  UNSTOPPABLE = 'unstoppable',
  RAMPAGE = 'rampage',
  LEGENDARY = 'legendary',
}

/**
 * Summary interface for player statistics
 */
export interface PlayerStatsSummary {
  kills: number;
  deaths: number;
  assists: number;
  currentStreak: number;
  bestStreak: number;
  kdRatio: number;
  kadRatio: number;
  accuracy: number;
  damageDealt: number;
  damageTaken: number;
  damagePerKill: number;
  damagePerMinute: number;
  shotsFired: number;
  shotsHit: number;
  matchDurationMs: number;
}

/**
 * JSON serialization interface for player statistics
 */
export interface PlayerStatsJSON {
  kills: number;
  deaths: number;
  assists: number;
  currentStreak: number;
  bestStreak: number;
  damageDealt: number;
  damageTaken: number;
  shotsHit: number;
  shotsFired: number;
  matchStartTime: number;
  lastKillTime?: number;
  lastDeathTime?: number;
}
