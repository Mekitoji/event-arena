import { TProjectileSpawnedEvent } from '../../core/types/events.type';
import { Vec2 } from '../../core/types/vec2.type';
import { BaseEvent } from '../abstract';

export class ProjectileSpawnedEvent extends BaseEvent<TProjectileSpawnedEvent> {
  protected readonly type = 'projectile:spawned';
  constructor(
    private readonly id: string,
    private readonly ownerId: string,
    private readonly pos: Vec2,
    private readonly vel: Vec2,
    private readonly kind?: 'bullet' | 'pellet' | 'rocket',
  ) {
    super();
  }

  toEmit(): TProjectileSpawnedEvent {
    return {
      id: this.id,
      type: this.type,
      ownerId: this.ownerId,
      pos: this.pos,
      vel: this.vel,
      kind: this.kind,
    };
  }

  toString(): string {
    return JSON.stringify(this.toEmit());
  }
}
