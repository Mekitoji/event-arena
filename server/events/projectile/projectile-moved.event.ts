import { TProjectileMovedEvent } from '../../core/types/events.type';
import { Vec2 } from '../../core/types/vec2.type';
import { BaseEvent } from '../abstract';

export class ProjectileMovedEvent extends BaseEvent<TProjectileMovedEvent> {
  protected readonly type = 'projectile:moved';
  constructor(
    private readonly pos: Vec2,
    private readonly id: string,
  ) {
    super();
  }

  toEmit(): TProjectileMovedEvent {
    return { type: this.type, pos: this.pos, id: this.id };
  }

  toString(): string {
    return JSON.stringify({ type: this.type, position: this.pos, id: this.id });
  }
}
