import { TKillFeedEvent } from '../../core/types/events.type';
import { BaseEvent } from '../abstract';

export class FeedEntryEvent extends BaseEvent<TKillFeedEvent> {
  protected readonly type = 'feed:entry' as const;

  constructor(
    private readonly killer: string,
    private readonly victim: string,
    private readonly weapon: 'bullet' | 'pellet' | 'rocket' | 'explosion',
    private readonly assistIds?: string[],
    private readonly timestamp?: number,
  ) {
    super();
  }

  toEmit(): TKillFeedEvent {
    return {
      type: this.type,
      killer: this.killer,
      victim: this.victim,
      weapon: this.weapon,
      assistIds: this.assistIds,
      timestamp: this.timestamp || Date.now(),
    };
  }

  toString(): string {
    return JSON.stringify({
      type: this.type,
      killer: this.killer,
      victim: this.victim,
      weapon: this.weapon,
      assistIds: this.assistIds,
      timestamp: this.timestamp || Date.now(),
    });
  }
}
