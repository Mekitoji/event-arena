// Class-based HUD system with widget-specific projections and subscriptions
import { eventBus } from '../core/event-bus';
import { sendToConnection, sendToHudSubscribers } from '../net/broadcaster';
import type { HudWidget, WidgetKey } from './types';
import {
  AnnouncementsWidget,
  StreaksWidget,
  FeedWidget,
  MatchWidget,
  ScoreboardWidget,
} from './widgets';
import type { SourceEvents, SourceEventType } from '../core/types/events.type';
import type WebSocket from 'ws';

class HudSystem {
  private widgets: HudWidget[] = [
    new ScoreboardWidget(),
    new MatchWidget(),
    new FeedWidget(),
    new StreaksWidget(),
    new AnnouncementsWidget(),
  ];
  private flushing = false;
  private dirty = new Set<string>();

  constructor() {
    const triggers: SourceEventType[] = [
      'player:join',
      'player:leave',
      'player:die',
      'score:update',
      'session:started',
      'match:created',
      'match:started',
      'match:ended',
      'tick:post',
      'feed:entry',
      'streak:changed',
      'damage:applied',
      'buff:applied',
    ];
    for (const t of triggers)
      eventBus.on(t, (e) => this.onAnyEvent(e as SourceEvents));
    setTimeout(() => this.pushAll(), 200);
  }

  pushInitialFor(widgetKey: WidgetKey, ws: WebSocket) {
    const w = this.widgets.find((w) => w.key === widgetKey);
    if (!w) return;
    // Send only to this connection to avoid unnecessary broadcasts
    sendToConnection(ws, w.snapshot());
  }

  private scheduleFlush(delay = 30) {
    if (this.flushing) return;
    this.flushing = true;
    setTimeout(() => {
      try {
        for (const key of this.dirty) {
          const w = this.widgets.find((w) => w.key === key);
          if (w) sendToHudSubscribers(w.key, w.snapshot());
        }
      } finally {
        this.dirty.clear();
        this.flushing = false;
      }
    }, delay);
  }

  private onAnyEvent(e: SourceEvents) {
    for (const w of this.widgets) {
      const changed = w.onEvent(e);
      if (changed) this.dirty.add(w.key);
    }
    if (e.type === 'feed:entry' || e.type === 'streak:changed')
      this.scheduleFlush(0);
    else this.scheduleFlush(30);
  }

  private pushAll() {
    for (const w of this.widgets) sendToHudSubscribers(w.key, w.snapshot());
  }
}

export const hudSystem = new HudSystem();
