import { World } from '../../core/world';
import type {
  SourceEvents,
  THudAnnouncementsUpdate,
} from '../../core/types/events.type';
import { HudWidget } from '../types';

export class AnnouncementsWidget implements HudWidget<'announcements'> {
  readonly key = 'announcements';
  private buffer: Array<{
    kind: 'streak';
    playerId: string;
    name?: string;
    category:
      | 'double_kill'
      | 'killing_spree'
      | 'unstoppable'
      | 'rampage'
      | 'legendary';
    streak: number;
    message: string;
    timestamp: number;
  }> = [];
  private readonly TTL = 3000;
  private readonly MAX = 5;

  snapshot(): THudAnnouncementsUpdate {
    const now = Date.now();
    this.buffer = this.buffer.filter((it) => now - it.timestamp < this.TTL);
    return { type: 'hud:announce:update', items: this.buffer.slice() };
  }

  onEvent(e: SourceEvents): boolean {
    if (e.type === 'streak:changed') {
      const pid = e.playerId as string;
      const streak = e.streak as number;
      const prev = e.previousStreak as number;
      const thresholds: Array<{
        n: number;
        category:
          | 'double_kill'
          | 'killing_spree'
          | 'unstoppable'
          | 'rampage'
          | 'legendary';
        message: string;
      }> = [
        { n: 2, category: 'double_kill', message: 'Double Kill!' },
        { n: 3, category: 'killing_spree', message: 'Killing Spree!' },
        { n: 5, category: 'unstoppable', message: 'Unstoppable!' },
        { n: 7, category: 'rampage', message: 'Rampage!' },
        { n: 10, category: 'legendary', message: 'LEGENDARY!' },
      ];
      const crossed = thresholds
        .filter((t) => streak >= t.n && prev < t.n)
        .pop();
      if (crossed) {
        const name = World.players.get(pid)?.name || pid;
        this.buffer.push({
          kind: 'streak',
          playerId: pid,
          name,
          category: crossed.category,
          streak,
          message: crossed.message,
          timestamp: Date.now(),
        });
        while (this.buffer.length > this.MAX) this.buffer.shift();
        return true;
      }
      return false;
    }
    if (e.type === 'tick:post') {
      const before = this.buffer.length;
      const now = Date.now();
      this.buffer = this.buffer.filter((it) => now - it.timestamp < this.TTL);
      return this.buffer.length !== before;
    }
    return e.type === 'session:started';
  }
}
