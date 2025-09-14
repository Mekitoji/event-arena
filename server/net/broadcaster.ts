import { WebSocketServer } from 'ws';
import type WebSocket from 'ws';
import { SourceEventType, THudUpdate } from '../core/types/events.type';
import { eventBus } from '../core/event-bus';
import { TEvent } from '../core/types';

const SOURCE_EVENT_TYPES = [
  'player:join',
  'player:move',
  'player:aimed',
  'player:die',
  'player:kill',
  'player:leave',
  'projectile:spawned',
  'projectile:moved',
  'projectile:despawned',
  'projectile:bounced',
  'damage:applied',
  'explosion:spawned',
  'knockback:applied',
  'dash:started',
  'dash:ended',
  'pickup:spawned',
  'pickup:collected',
  'buff:applied',
  'buff:expired',
  'match:created',
  'match:started',
  'match:ended',
  'score:update',
  'feed:entry',
  'streak:changed',
] as const satisfies readonly SourceEventType[];

const broadcastTypes = new Set(...[SOURCE_EVENT_TYPES]);

let _wss: WebSocketServer | null = null;

// HUD subscription registry: ws -> set of widget keys
const hudSubs: WeakMap<WebSocket, Set<string>> = new WeakMap();

export function hudSubscribe(ws: WebSocket, widgets: string[]) {
  const set = hudSubs.get(ws) ?? new Set<string>();
  widgets.forEach((w) => set.add(w));
  hudSubs.set(ws, set);
}
export function hudUnsubscribe(ws: WebSocket, widgets: string[]) {
  const set = hudSubs.get(ws);
  if (!set) return;
  widgets.forEach((w) => set.delete(w));
}
export function hudClear(ws: WebSocket) {
  hudSubs.delete(ws);
}

export function sendToHudSubscribers(widgetKey: string, message: THudUpdate) {
  if (!_wss) return;
  const payload = JSON.stringify(message);
  for (const client of _wss.clients) {
    if (client.readyState !== 1 || client.bufferedAmount > 1_000_000) continue;
    const subs = hudSubs.get(client);
    if (subs && subs.has(widgetKey)) {
      try {
        client.send(payload);
      } catch {
        // ignore send errors for individual clients
      }
    }
  }
}

export function sendToConnection(ws: WebSocket, message: THudUpdate) {
  if (!ws || ws.readyState !== 1 || ws.bufferedAmount > 1_000_000) return;
  try {
    ws.send(JSON.stringify(message));
  } catch {
    // ignore send errors for a single connection
  }
}

export function attachBroadcaster(wss: WebSocketServer) {
  _wss = wss;
  for (const t of broadcastTypes) {
    eventBus.on(t, (e: TEvent) => {
      const payload = JSON.stringify(e);
      for (const client of wss.clients) {
        // 1 === Open connection
        if (client.readyState !== 1) continue;
        // Buffer is full
        if (client.bufferedAmount > 1_000_000) continue;

        client.send(payload);
      }
    });
  }
}

// Direct broadcast function for manual event sending
export function broadcast(message: TEvent) {
  if (!_wss) {
    console.warn('Broadcaster not attached to WebSocket server');
    return;
  }

  const payload = JSON.stringify(message);
  for (const client of _wss.clients) {
    if (client.readyState === 1 && client.bufferedAmount <= 1_000_000) {
      try {
        client.send(payload);
      } catch (e) {
        console.error('Broadcast send error:', e);
      }
    }
  }
}
