import { eventBus } from '../core/event-bus';
import { TTickPostEvent } from '../core/types/events.type';
import { World } from '../core/world';
import { SpawnManager } from '../core/spawn-manager';
import {
  PickupSpawnedEvent,
  PickupCollectedEvent,
  BuffAppliedEvent,
  BuffExpiredEvent,
} from '../events';

const SPAWN_INTERVAL_MS = 5000;
const PLAYER_PICK_RADIUS = 20;

const kinds = ['heal', 'haste', 'shield'] as const;

// Create spawn manager for pickups with default margins and minimum distance from players
const pickupSpawnManager = new SpawnManager({
  minDistanceFromPlayers: 180,
  margins: {
    left: 100,
    right: 100,
    top: 100,
    bottom: 100,
  },
});

let spawnAccum = 0;

eventBus.on('tick:post', ({ dt }: TTickPostEvent) => {
  spawnAccum += dt * 1000;
  if (spawnAccum >= SPAWN_INTERVAL_MS) {
    spawnAccum = 0;
    if (World.pickups.size < 12) {
      const id = crypto.randomUUID();
      const pos = pickupSpawnManager.findSafeSpawnPosition();
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      World.pickups.set(id, { id, pos, kind });
      eventBus.emit(new PickupSpawnedEvent(id, pos, kind).toEmit());
    }
  }

  // pickup collection
  for (const p of World.players.values()) {
    for (const pk of [...World.pickups.values()]) {
      const d = Math.hypot(p.pos.x - pk.pos.x, p.pos.y - pk.pos.y);
      if (d <= PLAYER_PICK_RADIUS) {
        World.pickups.delete(pk.id);
        eventBus.emit(new PickupCollectedEvent(pk.id, p.id).toEmit());
        if (pk.kind === 'heal') {
          p.heal(35); // Use Player class method
          eventBus.emit(new BuffAppliedEvent(p.id, 'heal', 0).toEmit());
        }
        if (pk.kind === 'haste') {
          const dur = 5000;
          p.applyHaste(dur, 1.6); // Use Player class method
          eventBus.emit(new BuffAppliedEvent(p.id, 'haste', dur).toEmit());
        }
        if (pk.kind === 'shield') {
          const dur = 5000;
          p.applyShield(dur); // Use Player class method
          eventBus.emit(new BuffAppliedEvent(p.id, 'shield', dur).toEmit());
        }
      }
    }
  }

  // buff expirations
  const now = Date.now();
  for (const p of World.players.values()) {
    if (p.hasteUntil && p.hasteUntil <= now) {
      p.hasteUntil = undefined;
      p.hasteFactor = undefined;
      eventBus.emit(new BuffExpiredEvent(p.id, 'haste').toEmit());
    }
    if (p.shieldUntil && p.shieldUntil <= now) {
      p.shieldUntil = undefined;
      eventBus.emit(new BuffExpiredEvent(p.id, 'shield').toEmit());
    }
  }
});
