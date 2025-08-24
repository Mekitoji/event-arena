import { World } from '../../core/world';
import type { SourceEvents, THudScoreboardUpdate } from '../../core/types/events.type';
import { HudWidget } from '../types';

export class ScoreboardWidget implements HudWidget<'scoreboard'> {
  readonly key = 'scoreboard';
  snapshot(): THudScoreboardUpdate {
    const rows = [] as Array<{ playerId: string; name?: string; kills: number; deaths: number; assists: number; hp?: number; isDead?: boolean }>;
    for (const p of World.players.values()) {
      rows.push({ playerId: p.id, name: p.name, kills: p.stats.kills, deaths: p.stats.deaths, assists: p.stats.assists, hp: p.hp, isDead: !!p.isDead });
    }
    rows.sort((a, b) => (b.kills - a.kills) || (a.deaths - b.deaths) || (a.name || '').localeCompare(b.name || ''));
    return { type: 'hud:scoreboard:update', rows };
  }
  onEvent(e: SourceEvents): boolean {
    return e.type === 'score:update' || e.type === 'player:join' || e.type === 'player:leave' || e.type === 'player:die' || e.type === 'session:started';
  }
}
