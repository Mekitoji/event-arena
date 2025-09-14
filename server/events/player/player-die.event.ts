import { TPlayerDieEvent } from '../../core/types/events.type';
import { BaseEvent } from '../abstract';

export class PlayerDiedEvent extends BaseEvent<TPlayerDieEvent> {
  protected readonly type = 'player:die';
  constructor(private readonly playerId: string) {
    super();
  }

  toEmit(): TPlayerDieEvent {
    return { type: this.type, playerId: this.playerId };
  }

  toString(): string {
    return JSON.stringify({ type: this.type, playerId: this.playerId });
  }
}
