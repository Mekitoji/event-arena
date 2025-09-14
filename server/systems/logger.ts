import { eventBus } from '../core/event-bus';
import { TEvent } from '../core/types';

const all = [
  'cmd:join',
  'cmd:move',
  'cmd:cast',
  'cmd:leave',
  'cmd:aim',
  'cmd:respawn',
  'player:join',
  'player:move',
  'projectile:spawned',
  'damage:applied',
  'player:die',
  'session:started',
  'player:leave',
  'projectile:despawned',
  'projectile:moved',
  'pickup:spawned',
  'pickup:collected',
  'buff:applied',
  'buff:expired',
  'feed:entry',
  'streak:changed',
  // 'tick:pre', 'tick:post',
] as const satisfies TEvent['type'][];

// Attach logging only when explicitly enabled to avoid heavy console overhead
if (process.env.DEBUG_EVENTS === 'true') {
  const useJson = process.env.DEBUG_EVENTS_JSON === 'true';
  for (const t of all) {
    eventBus.on(t, (e: TEvent) => {
      try {
        if (useJson) {
          // Compact JSON string avoids util.inspect overhead
          console.log(`[EVENT] ${JSON.stringify(e)}`);
        } else {
          // Type-only log (fast path)
          console.log(`[EVENT] ${e.type}`);
        }
      } catch {
        // Ignore logging errors
      }
    });
  }
}
