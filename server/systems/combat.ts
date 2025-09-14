import { eventBus } from '../core/event-bus';
import { TDamageAppliedEvent } from '../core/types/events.type';
import { World } from '../core/world';
import { Config } from '../config';
import {
  DamageAppliedEvent,
  ProjectileDespawnedEvent,
  ExplosionSpawnedEvent,
  KnockbackAppliedEvent,
  StreakChangedEvent,
  PlayerKillEvent,
  PlayerDiedEvent,
  FeedEntryEvent,
  ScoreUpdateEvent,
} from '../events';
import { eventBus as bus } from '../core/event-bus';

// Track recent damage for assist calculation (player -> damages)
const recentDamage = new Map<
  string,
  Array<{
    source: string;
    timestamp: number;
    amount: number;
    weapon?: 'bullet' | 'pellet' | 'rocket' | 'explosion';
  }>
>();

eventBus.on('tick:post', () => {
  for (const pr of [...World.projectiles.values()]) {
    for (const p of World.players.values()) {
      if (p.id === pr.owner || p.isDeadPlayer()) continue; // Skip dead players

      // Use projectile's built-in hit detection
      if (pr.isWithinHitRadius(p.pos)) {
        // Remove projectile
        World.projectiles.delete(pr.id);
        eventBus.emit(new ProjectileDespawnedEvent(pr.id).toEmit());

        if (pr.shouldExplodeOnCollision()) {
          // Explosion AoE
          const pos = { ...pr.pos };
          const radius = Config.getExplosionRadius();
          const damage = Config.getExplosionDamage();
          const knockbackPerDamage = Config.getKnockbackPower();
          eventBus.emit(
            new ExplosionSpawnedEvent(pos, radius, damage).toEmit(),
          );
          for (const t of World.players.values()) {
            if (t.isDeadPlayer()) continue; // Skip dead players for explosion damage
            const dist = Math.hypot(t.pos.x - pos.x, t.pos.y - pos.y);
            if (dist <= radius) {
              eventBus.emit(
                new DamageAppliedEvent(
                  t.id,
                  damage,
                  pr.owner,
                  'explosion',
                ).toEmit(),
              );
              // Knockback vector from explosion center
              const nx = dist ? (t.pos.x - pos.x) / dist : 0;
              const ny = dist ? (t.pos.y - pos.y) / dist : 0;
              const power = damage * knockbackPerDamage;
              // Use Player class method for knockback
              t.applyKnockback(
                nx * power,
                ny * power,
                Config.combat.knockbackDuration,
              );
              eventBus.emit(
                new KnockbackAppliedEvent(
                  t.id,
                  { x: nx, y: ny },
                  power,
                  pr.owner,
                ).toEmit(),
              );
            }
          }
        } else {
          // bullet/pellet damage to the hit player using projectile's current damage
          const dmg = pr.getCurrentDamage(); // This accounts for damage reduction from bounces
          const weaponType = pr.kind === 'pellet' ? 'pellet' : 'bullet';
          eventBus.emit(
            new DamageAppliedEvent(p.id, dmg, pr.owner, weaponType).toEmit(),
          );

          // Record shot hit for accuracy tracking
          const shooter = World.players.get(pr.owner);
          if (shooter) {
            shooter.addShotHit();
          }
        }
      }
    }
  }
});

eventBus.on('damage:applied', (e: TDamageAppliedEvent) => {
  const t = World.players.get(e.targetId);
  if (!t) return;
  // ignore damage if target is dead or has i-frames
  if (t.isDeadPlayer() || t.hasIframes()) return;

  // Calculate damage with shield protection
  const dmg = t.hasShield() ? Math.ceil(e.amount * 0.5) : e.amount;

  // Apply damage using Player class method
  t.takeDamage(dmg);
  const now = Date.now();

  // Track damage for assist calculation
  if (e.source && e.source !== e.targetId) {
    if (!recentDamage.has(e.targetId)) {
      recentDamage.set(e.targetId, []);
    }
    const damageHistory = recentDamage.get(e.targetId)!;
    damageHistory.push({
      source: e.source,
      timestamp: now,
      amount: dmg,
      weapon: e.weapon,
    });

    // Clean up old damage entries (keep only recent ones)
    const validDamage = damageHistory.filter(
      (d) => now - d.timestamp <= Config.combat.assistTimeWindow,
    );
    recentDamage.set(e.targetId, validDamage);
  }

  // Generic knockback if source provided (push from source -> target)
  if (e.source) {
    const s = World.players.get(e.source);
    if (s) {
      const dx = t.pos.x - s.pos.x;
      const dy = t.pos.y - s.pos.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist,
        ny = dy / dist;
      const power = e.amount * Config.getKnockbackPower();
      t.kb = {
        vx: nx * power,
        vy: ny * power,
        until: Date.now() + Config.combat.knockbackDuration,
      };
      eventBus.emit(
        new KnockbackAppliedEvent(
          t.id,
          { x: nx, y: ny },
          power,
          e.source,
        ).toEmit(),
      );
    }
  }

  if (t.hp <= 0) {
    // Handle kill/death/assist tracking
    const victim = World.players.get(e.targetId);
    const killer = e.source ? World.players.get(e.source) : null;

    if (victim) {
      // Player.die() method already handles deaths and streak reset

      // Get recent damage to calculate assists
      const damageHistory = recentDamage.get(e.targetId) || [];
      const now = Date.now();
      const validDamage = damageHistory.filter(
        (d) => now - d.timestamp <= Config.combat.assistTimeWindow,
      );

      // Find killer and assists
      const assistIds: string[] = [];
      let weaponType: 'bullet' | 'pellet' | 'rocket' | 'explosion' = 'bullet'; // Default

      if (killer && e.source) {
        // Determine weapon type from the killing damage event
        weaponType = e.weapon || 'bullet';

        // Track previous streak for event
        const previousStreak = killer.getCurrentStreak();

        // Use Player class method to add kill (increments kills and streak)
        killer.addKill();

        // Emit streak change event
        eventBus.emit(
          new StreakChangedEvent(
            e.source,
            killer.getCurrentStreak(),
            previousStreak,
          ).toEmit(),
        );

        // Find assists (players who damaged victim but didn't get the kill)
        const assistSources = new Set<string>();
        for (const damage of validDamage) {
          if (damage.source !== e.source && damage.source !== e.targetId) {
            assistSources.add(damage.source);
          }
        }

        // Increment assists for assist players using Player class method
        for (const assistId of assistSources) {
          const assistPlayer = World.players.get(assistId);
          if (assistPlayer) {
            assistPlayer.addAssist();
            assistIds.push(assistId);
          }
        }

        // Emit kill event
        eventBus.emit(
          new PlayerKillEvent(
            e.source,
            e.targetId,
            assistIds.length > 0 ? assistIds : undefined,
          ).toEmit(),
        );

        // Emit kill feed event
        eventBus.emit(
          new FeedEntryEvent(
            e.source,
            e.targetId,
            weaponType,
            assistIds.length > 0 ? assistIds : undefined,
          ).toEmit(),
        );

        // Emit score updates for all affected players
        const killerStats = killer.stats;
        eventBus.emit(
          new ScoreUpdateEvent(
            e.source,
            killerStats.kills,
            killerStats.deaths,
            killerStats.assists,
          ).toEmit(),
        );
        for (const assistId of assistIds) {
          const assistPlayer = World.players.get(assistId);
          if (assistPlayer) {
            const assistStats = assistPlayer.stats;
            eventBus.emit(
              new ScoreUpdateEvent(
                assistId,
                assistStats.kills,
                assistStats.deaths,
                assistStats.assists,
              ).toEmit(),
            );
          }
        }
      }

      // Emit victim's score update
      const victimStats = victim.stats;
      eventBus.emit(
        new ScoreUpdateEvent(
          e.targetId,
          victimStats.kills,
          victimStats.deaths,
          victimStats.assists,
        ).toEmit(),
      );
    }

    // Mark player as dead instead of deleting
    t.isDead = true;
    t.diedAt = Date.now();
    t.hp = 0; // Ensure HP is 0

    // Clean up damage history for dead player
    recentDamage.delete(e.targetId);

    bus.emit(new PlayerDiedEvent(t.id).toEmit());
  }
});
