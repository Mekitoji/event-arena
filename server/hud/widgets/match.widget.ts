import { matchSystem } from '../../systems/match';
import type { SourceEvents, THudMatchUpdate } from '../../core/types/events.type';
import { HudWidget } from '../types';

export class MatchWidget implements HudWidget<'match'> {
  readonly key = 'match';
  snapshot(): THudMatchUpdate {
    const m = matchSystem.getCurrentMatch();
    if (!m) return { type: 'hud:match:update', id: null, mode: null, phase: 'idle', startsAt: null, endsAt: null };
    return { type: 'hud:match:update', id: m.id, mode: m.mode, phase: m.phase, startsAt: m.startsAt ?? null, endsAt: m.endsAt ?? null };
  }
  onEvent(e: SourceEvents): boolean {
    return e.type === 'match:created' || e.type === 'match:started' || e.type === 'match:ended' || e.type === 'session:started' || e.type === 'tick:post';
  }
}
