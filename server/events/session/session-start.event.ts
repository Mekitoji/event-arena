import { PlayerInfo, TSessionStartedEvent } from '../../core/types/events.type';
import { BaseEvent } from '../abstract';

type MatchInfo = {
  id: string;
  mode: string;
  phase: 'idle' | 'countdown' | 'active' | 'ended';
  startsAt?: number;
  endsAt?: number;
};

export class SessionStartedEvent extends BaseEvent<TSessionStartedEvent> {
  protected readonly type = 'session:started';
  constructor(
    private readonly name: string,
    private readonly playerId: string,
    private readonly players: PlayerInfo[],
    private readonly match?: MatchInfo,
  ) {
    super();
  }

  toEmit(): TSessionStartedEvent {
    return {
      type: this.type,
      playerId: this.playerId,
      name: this.name,
      players: this.players,
      ...(this.match && { match: this.match }),
    };
  }

  toString(): string {
    return JSON.stringify({
      type: this.type,
      playerId: this.playerId,
      name: this.name,
      players: this.players,
      ...(this.match && { match: this.match }),
    });
  }
}
