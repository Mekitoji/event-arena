import type {
  SourceEvents,
  THudFeedUpdate,
} from '../../core/types/events.type';
import { HudWidget } from '../types';

export class FeedWidget implements HudWidget<'feed'> {
  readonly key = 'feed';
  private buffer: Array<{
    killer: string;
    victim: string;
    weapon: 'bullet' | 'pellet' | 'rocket' | 'explosion';
    assistIds?: string[];
    timestamp: number;
  }> = [];
  private max = 8;
  snapshot(): THudFeedUpdate {
    const now = Date.now();
    this.buffer = this.buffer.filter((e) => now - e.timestamp < 10000);
    return { type: 'hud:feed:update', items: this.buffer.slice() };
  }
  onEvent(e: SourceEvents): boolean {
    if (e.type === 'feed:entry') {
      const item = {
        killer: e.killer,
        victim: e.victim,
        weapon: e.weapon,
        assistIds: e.assistIds,
        timestamp: e.timestamp || Date.now(),
      };
      this.buffer.push(item);
      if (this.buffer.length > this.max) this.buffer.shift();
      return true;
    }
    if (e.type === 'tick:post') {
      const before = this.buffer.length;
      const now = Date.now();
      this.buffer = this.buffer.filter((x) => now - x.timestamp < 10000);
      return this.buffer.length !== before;
    }
    return e.type === 'session:started';
  }
}
