import { matchSystem } from '../../systems/match';
import type { SourceEvents, THudMatchUpdate } from '../../core/types/events.type';
import { HudWidget } from '../types';

export class MatchWidget implements HudWidget<'match'> {
  readonly key = 'match';
  private lastPush = 0;
  private readonly throttleMs = 300; // throttle updates to ~300ms
  snapshot(): THudMatchUpdate {
    const m = matchSystem.getCurrentMatch();
    if (!m) return { type: 'hud:match:update', id: null, mode: null, phase: 'idle', startsAt: null, endsAt: null };
    return { type: 'hud:match:update', id: m.id, mode: m.mode, phase: m.phase, startsAt: m.startsAt ?? null, endsAt: m.endsAt ?? null };
  }
  onEvent(e: SourceEvents): boolean {
    // Always push immediately on lifecycle/session events
    if (e.type === 'match:created' || e.type === 'match:started' || e.type === 'match:ended' || e.type === 'session:started') {
      this.lastPush = Date.now();
      return true;
    }

    // Throttle tick-driven updates
    if (e.type === 'tick:post') {
      const now = Date.now();
      if (now - this.lastPush >= this.throttleMs) {
        this.lastPush = now;
        return true;
      }
      return false;
    }

    return false;
  }
}
