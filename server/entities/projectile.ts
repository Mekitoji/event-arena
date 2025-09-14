import { Vec2 } from '../core/types/vec2.type';

export type ProjectileKind = 'bullet' | 'pellet' | 'rocket';

export interface ProjectileConfig {
  id: string;
  owner: string;
  pos: Vec2;
  vel: Vec2;
  kind: ProjectileKind;
  hitRadius?: number;
  damage?: number;
  lifetime?: number;
}

/**
 * Projectile entity class
 * Handles projectile behavior, movement, collision, and lifecycle
 */
export class Projectile {
  public readonly id: string;
  public readonly owner: string;
  public readonly kind: ProjectileKind;
  public pos: Vec2;
  public vel: Vec2;
  public hitRadius: number;
  public damage: number;
  public lifetime: number; // in milliseconds
  public spawnTime: number;
  public bounceCount: number = 0;
  public maxBounces: number;

  // Projectile-specific properties
  private readonly damageDropoff: number; // damage reduction per bounce
  private readonly velocityRetention: number; // velocity retention after bounce

  constructor(config: ProjectileConfig) {
    this.id = config.id;
    this.owner = config.owner;
    this.pos = { ...config.pos };
    this.vel = { ...config.vel };
    this.kind = config.kind;
    this.spawnTime = Date.now();

    // Set default properties based on projectile kind
    switch (config.kind) {
      case 'bullet':
        this.hitRadius = config.hitRadius || 20;
        this.damage = config.damage || 25;
        this.lifetime = config.lifetime || 4000; // 4 seconds
        this.maxBounces = 3;
        this.damageDropoff = 0.8; // 20% damage loss per bounce
        this.velocityRetention = 0.9; // 10% velocity loss per bounce
        break;

      case 'pellet':
        this.hitRadius = config.hitRadius || 20;
        this.damage = config.damage || 17;
        this.lifetime = config.lifetime || 3000; // 3 seconds
        this.maxBounces = 2;
        this.damageDropoff = 0.7; // 30% damage loss per bounce
        this.velocityRetention = 0.85; // 15% velocity loss per bounce
        break;

      case 'rocket':
        this.hitRadius = config.hitRadius || 28;
        this.damage = config.damage || 40;
        this.lifetime = config.lifetime || 4000; // 4 seconds
        this.maxBounces = 0; // Rockets don't bounce, they explode
        this.damageDropoff = 1.0; // No damage dropoff for rockets
        this.velocityRetention = 1.0; // No velocity change for rockets
        break;

      default:
        throw new Error(`Unknown projectile kind: ${config.kind}`);
    }
  }

  /**
   * Update projectile position based on velocity and delta time
   */
  public update(deltaTime: number): void {
    this.pos.x += this.vel.x * deltaTime;
    this.pos.y += this.vel.y * deltaTime;
  }

  /**
   * Handle projectile bounce off a surface
   */
  public bounce(normal: Vec2): boolean {
    // Rockets don't bounce, they should explode
    if (this.kind === 'rocket') {
      return false;
    }

    // Check if projectile has exceeded max bounces
    if (this.bounceCount >= this.maxBounces) {
      return false;
    }

    // Calculate reflection vector
    const dot = this.vel.x * normal.x + this.vel.y * normal.y;
    this.vel.x = this.vel.x - 2 * dot * normal.x;
    this.vel.y = this.vel.y - 2 * dot * normal.y;

    // Apply velocity retention (energy loss)
    this.vel.x *= this.velocityRetention;
    this.vel.y *= this.velocityRetention;

    // Apply damage dropoff
    this.damage *= this.damageDropoff;

    this.bounceCount++;
    return true;
  }

  /**
   * Check if projectile should explode (for rockets hitting obstacles)
   */
  public shouldExplodeOnCollision(): boolean {
    return this.kind === 'rocket';
  }

  /**
   * Check if projectile has expired due to lifetime
   */
  public isExpired(currentTime: number = Date.now()): boolean {
    return currentTime - this.spawnTime >= this.lifetime;
  }

  /**
   * Check if projectile is outside world bounds
   */
  public isOutOfBounds(worldWidth: number, worldHeight: number): boolean {
    return (
      this.pos.x < 0 ||
      this.pos.x > worldWidth ||
      this.pos.y < 0 ||
      this.pos.y > worldHeight
    );
  }

  /**
   * Get remaining lifetime in milliseconds
   */
  public getRemainingLifetime(currentTime: number = Date.now()): number {
    const elapsed = currentTime - this.spawnTime;
    return Math.max(0, this.lifetime - elapsed);
  }

  /**
   * Get projectile age in milliseconds
   */
  public getAge(currentTime: number = Date.now()): number {
    return currentTime - this.spawnTime;
  }

  /**
   * Get current speed (magnitude of velocity vector)
   */
  public getSpeed(): number {
    return Math.hypot(this.vel.x, this.vel.y);
  }

  /**
   * Get normalized direction vector
   */
  public getDirection(): Vec2 {
    const speed = this.getSpeed();
    if (speed === 0) {
      return { x: 0, y: 0 };
    }
    return {
      x: this.vel.x / speed,
      y: this.vel.y / speed,
    };
  }

  /**
   * Calculate distance to a point
   */
  public distanceTo(point: Vec2): number {
    return Math.hypot(this.pos.x - point.x, this.pos.y - point.y);
  }

  /**
   * Check if projectile is within hit radius of a point
   */
  public isWithinHitRadius(point: Vec2): boolean {
    return this.distanceTo(point) <= this.hitRadius;
  }

  /**
   * Get current damage value (may be reduced from bounces)
   */
  public getCurrentDamage(): number {
    return this.damage;
  }

  /**
   * Check if projectile can still bounce
   */
  public canBounce(): boolean {
    return this.bounceCount < this.maxBounces && this.kind !== 'rocket';
  }

  /**
   * Get projectile status summary
   */
  public getStatus(currentTime: number = Date.now()): ProjectileStatus {
    return {
      id: this.id,
      owner: this.owner,
      kind: this.kind,
      pos: { ...this.pos },
      vel: { ...this.vel },
      damage: this.damage,
      bounceCount: this.bounceCount,
      age: this.getAge(currentTime),
      remainingLifetime: this.getRemainingLifetime(currentTime),
      speed: this.getSpeed(),
      isExpired: this.isExpired(currentTime),
    };
  }

  /**
   * Serialize for network transmission
   */
  public toJSON(): ProjectileJSON {
    return {
      id: this.id,
      owner: this.owner,
      kind: this.kind,
      pos: this.pos,
      vel: this.vel,
      hitRadius: this.hitRadius,
      damage: this.damage,
      bounceCount: this.bounceCount,
      spawnTime: this.spawnTime,
    };
  }

  /**
   * Create projectile from JSON data
   */
  public static fromJSON(data: ProjectileJSON): Projectile {
    const projectile = new Projectile({
      id: data.id,
      owner: data.owner,
      pos: data.pos,
      vel: data.vel,
      kind: data.kind,
      hitRadius: data.hitRadius,
      damage: data.damage,
    });

    projectile.bounceCount = data.bounceCount;
    projectile.spawnTime = data.spawnTime;

    return projectile;
  }
}

/**
 * Projectile status interface for debugging and monitoring
 */
export interface ProjectileStatus {
  id: string;
  owner: string;
  kind: ProjectileKind;
  pos: Vec2;
  vel: Vec2;
  damage: number;
  bounceCount: number;
  age: number;
  remainingLifetime: number;
  speed: number;
  isExpired: boolean;
}

/**
 * JSON serialization interface for projectiles
 */
export interface ProjectileJSON {
  id: string;
  owner: string;
  kind: ProjectileKind;
  pos: Vec2;
  vel: Vec2;
  hitRadius: number;
  damage: number;
  bounceCount: number;
  spawnTime: number;
}
