import { TProjectileBouncedEvent } from '../../core/types/events.type';
import { Vec2 } from '../../core/types/vec2.type';
import { BaseEvent } from '../abstract';

export class ProjectileBouncedEvent extends BaseEvent<TProjectileBouncedEvent> {
  protected readonly type = 'projectile:bounced' as const;

  constructor(
    private readonly id: string,
    private readonly normal: Vec2,
  ) {
    super();
  }

  toEmit(): TProjectileBouncedEvent {
    return {
      type: this.type,
      id: this.id,
      normal: this.normal,
    };
  }

  toString(): string {
    return JSON.stringify({
      type: this.type,
      id: this.id,
      normal: this.normal,
    });
  }
}
