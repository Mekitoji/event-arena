import { TBuffExpiredEvent } from '../../core/types/events.type';
import { BaseEvent } from '../abstract';

export class BuffExpiredEvent extends BaseEvent<TBuffExpiredEvent> {
  protected readonly type = 'buff:expired' as const;

  constructor(
    private readonly playerId: string,
    private readonly kind: 'haste' | 'shield',
  ) {
    super();
  }

  toEmit(): TBuffExpiredEvent {
    return {
      type: this.type,
      playerId: this.playerId,
      kind: this.kind,
    };
  }

  toString(): string {
    return JSON.stringify({
      type: this.type,
      playerId: this.playerId,
      kind: this.kind,
    });
  }
}
