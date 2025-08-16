import { eventBus } from "../core/event-bus";
import { TEvent } from "../core/types";

const all = [
  'cmd:join', 'cmd:move', 'cmd:cast', 'cmd:leave', 'cmd:aim', 'cmd:respawn',
  'player:join', 'player:move', 'projectile:spawned',
  'damage:applied', 'player:die',
  'session:started',
  'player:leave', 'projectile:despawned', 'projectile:moved',
  'pickup:spawned', 'pickup:collected', 'buff:applied', 'buff:expired',
  'feed:entry', 'streak:changed',
  // 'tick:pre', 'tick:post',
] as const satisfies TEvent['type'][]

for (const t of all) eventBus.on(t, (e: TEvent) => console.log('[EVENT]', e));
