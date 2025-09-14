import { TBuffAppliedEvent } from '../../core/types/events.type';
import { BaseEvent } from '../abstract';

export class BuffAppliedEvent extends BaseEvent<TBuffAppliedEvent> {
  protected readonly type = 'buff:applied' as const;

  constructor(
    private readonly playerId: string,
    private readonly kind: 'heal' | 'haste' | 'shield',
    private readonly duration: number,
  ) {
    super();
  }

  toEmit(): TBuffAppliedEvent {
    return {
      type: this.type,
      playerId: this.playerId,
      kind: this.kind,
      duration: this.duration,
    };
  }

  toString(): string {
    return JSON.stringify({
      type: this.type,
      playerId: this.playerId,
      kind: this.kind,
      duration: this.duration,
    });
  }
}
