import { TScoreUpdateEvent } from '../../core/types/events.type';
import { BaseEvent } from '../abstract';

export class ScoreUpdateEvent extends BaseEvent<TScoreUpdateEvent> {
  protected readonly type = 'score:update' as const;

  constructor(
    private readonly playerId: string,
    private readonly kills: number,
    private readonly deaths: number,
    private readonly assists: number,
  ) {
    super();
  }

  toEmit(): TScoreUpdateEvent {
    return {
      type: this.type,
      playerId: this.playerId,
      kills: this.kills,
      deaths: this.deaths,
      assists: this.assists,
    };
  }

  toString(): string {
    return JSON.stringify({
      type: this.type,
      playerId: this.playerId,
      kills: this.kills,
      deaths: this.deaths,
      assists: this.assists,
    });
  }
}
