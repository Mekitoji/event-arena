import { World } from '../../core/world';
import type { SourceEvents, THudStreaksUpdate } from '../../core/types/events.type';
import { HudWidget } from '../types';

export class StreaksWidget implements HudWidget<'streaks'> {
  readonly key = 'streaks';
  snapshot(): THudStreaksUpdate {
    const streaks: Record<string, number> = {};
    for (const p of World.players.values()) streaks[p.id] = p.stats.currentStreak;
    return { type: 'hud:streaks:update', streaks };
  }
  onEvent(e: SourceEvents): boolean {
    return e.type === 'streak:changed' || e.type === 'player:join' || e.type === 'player:leave' || e.type === 'player:die' || e.type === 'session:started';
  }
}
