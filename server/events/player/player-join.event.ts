import { TPlayerJoinEvent } from '../../core/types/events.type';
import { BaseEvent } from '../abstract';

export class PlayerJoinedEvent extends BaseEvent<TPlayerJoinEvent> {
  protected readonly type = 'player:join';
  constructor(
    private readonly playerId: string,
    private readonly name: string,
  ) {
    super();
  }

  toEmit(): TPlayerJoinEvent {
    return { type: this.type, playerId: this.playerId, name: this.name };
  }

  toString(): string {
    return JSON.stringify({
      type: this.type,
      playerId: this.playerId,
      name: this.name,
    });
  }
}
