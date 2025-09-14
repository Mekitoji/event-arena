import { TPickupCollectedEvent } from '../../core/types/events.type';
import { BaseEvent } from '../abstract';

export class PickupCollectedEvent extends BaseEvent<TPickupCollectedEvent> {
  protected readonly type = 'pickup:collected' as const;

  constructor(
    private readonly id: string,
    private readonly by: string,
  ) {
    super();
  }

  toEmit(): TPickupCollectedEvent {
    return {
      type: this.type,
      id: this.id,
      by: this.by,
    };
  }

  toString(): string {
    return JSON.stringify({
      type: this.type,
      id: this.id,
      by: this.by,
    });
  }
}
