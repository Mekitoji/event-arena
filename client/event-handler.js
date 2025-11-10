/**
 * EventHandler - Single Responsibility: Process server events
 * Open/Closed Principle: Easy to add new event handlers without modifying existing code
 */
export class EventHandler {
  constructor(gameState, sound) {
    this.gameState = gameState;
    this.sound = sound;

    // Map event types to handler methods
    this.handlers = {
      'session:started': this.handleSessionStarted.bind(this),
      'player:join': this.handlePlayerJoin.bind(this),
      'player:move': this.handlePlayerMove.bind(this),
      'player:aimed': this.handlePlayerAimed.bind(this),
      'player:die': this.handlePlayerDie.bind(this),
      'player:dead': this.handlePlayerDead.bind(this),
      'map:loaded': this.handleMapLoaded.bind(this),
      'projectile:spawned': this.handleProjectileSpawned.bind(this),
      'projectile:moved': this.handleProjectileMoved.bind(this),
      'projectile:despawned': this.handleProjectileDespawned.bind(this),
      'projectile:bounced': this.handleProjectileBounced.bind(this),
      'explosion:spawned': this.handleExplosionSpawned.bind(this),
      'knockback:applied': this.handleKnockbackApplied.bind(this),
      'damage:applied': this.handleDamageApplied.bind(this),
      'dash:started': this.handleDashStarted.bind(this),
      'dash:ended': this.handleDashEnded.bind(this),
      'pickup:spawned': this.handlePickupSpawned.bind(this),
      'pickup:collected': this.handlePickupCollected.bind(this),
      'buff:applied': this.handleBuffApplied.bind(this),
      'buff:expired': this.handleBuffExpired.bind(this),
      'match:created': this.handleMatchCreated.bind(this),
      'match:started': this.handleMatchStarted.bind(this),
      'match:ended': this.handleMatchEnded.bind(this),
      'hud:scoreboard:update': this.handleHudScoreboardUpdate.bind(this),
      'hud:match:update': this.handleHudMatchUpdate.bind(this),
      'hud:feed:update': this.handleHudFeedUpdate.bind(this),
      'hud:streaks:update': this.handleHudStreaksUpdate.bind(this),
      'hud:announce:update': this.handleHudAnnounceUpdate.bind(this),
    };
  }

  handle(event) {
    // Pass to sound system for audio feedback
    this.sound.onEvent(event, { me: this.gameState.me });

    // Process event
    const handler = this.handlers[event.type];
    if (handler) {
      handler(event);
    }
  }

  handleSessionStarted(e) {
    this.gameState.setMyId(e.playerId);
    
    if (!this.gameState.players.has(e.playerId)) {
      this.gameState.addOrUpdatePlayer(e.playerId, {
        id: e.playerId,
        pos: { x: 100, y: 100 },
        hp: 100,
      });
    }

    e.players.forEach((info) => {
      this.gameState.addOrUpdatePlayer(info.id, {
        id: info.id,
        pos: info.pos,
        hp: 100,
        name: info.name,
      });
    });

    // Bootstrap match state if provided
    if (e.match) {
      this.gameState.updateMatch({
        id: e.match.id ?? null,
        mode: e.match.mode ?? null,
        phase: e.match.phase ?? 'idle',
        startsAt: e.match.startsAt ?? null,
        endsAt: e.match.endsAt ?? null,
      });
    }
  }

  handlePlayerJoin(e) {
    if (!this.gameState.players.has(e.playerId)) {
      this.gameState.addOrUpdatePlayer(e.playerId, {
        id: e.playerId,
        pos: { x: 100, y: 100 },
        hp: 100,
        name: e.name,
      });
    } else {
      // Clear dead state on rejoin (respawn)
      this.gameState.addOrUpdatePlayer(e.playerId, {
        name: e.name,
        hp: 100,
        isDead: false,
      });
    }

    // Update match assignment
    if (e.matchId) {
      this.gameState.updateMatch({ id: e.matchId });
    }
  }

  handlePlayerMove(e) {
    // Ensure player exists before updating position
    if (!this.gameState.players.has(e.playerId)) {
      this.gameState.addOrUpdatePlayer(e.playerId, {
        id: e.playerId,
        pos: e.pos,
        hp: 100,
        face: e.dir || { x: 1, y: 0 },
      });
    } else {
      this.gameState.updatePlayerPosition(e.playerId, e.pos, e.dir);
    }
  }

  handlePlayerAimed(e) {
    const player = this.gameState.players.get(e.playerId);
    if (player) {
      this.gameState.updatePlayerPosition(e.playerId, player.pos, e.dir);
    }
  }

  handlePlayerDie(e) {
    const player = this.gameState.players.get(e.playerId);
    if (player) {
      this.gameState.markPlayerDead(e.playerId);
      this.gameState.addDeathEffect(e.playerId, player.pos);
    }
  }

  handlePlayerDead(e) {
    this.gameState.deadUntil = e.until;
  }

  handleMapLoaded(e) {
    this.gameState.loadMap(e.obstacles);
  }

  handleProjectileSpawned(e) {
    this.gameState.addProjectile(e.id, e.pos, e.kind || 'bullet');
  }

  handleProjectileMoved(e) {
    this.gameState.updateProjectile(e.id, e.pos);
  }

  handleProjectileDespawned(e) {
    this.gameState.removeProjectile(e.id);
  }

  handleProjectileBounced(e) {
    const projectile = this.gameState.projectiles.get(e.id);
    if (projectile) {
      this.gameState.addSparkEffect(projectile.pos.x, projectile.pos.y);
    }
  }

  handleExplosionSpawned(e) {
    this.gameState.addExplosionEffect(e.pos, e.radius);
  }

  handleKnockbackApplied(e) {
    if (this.gameState.me === e.targetId) {
      this.gameState.triggerCameraShake(3, 120);
    }
  }

  handleDamageApplied(e) {
    this.gameState.addDamageEffect(e.targetId);
    this.gameState.updatePlayerHP(e.targetId, e.amount || 0);
  }

  handleDashStarted(e) {
    this.gameState.startDash(e.playerId);
  }

  handleDashEnded(e) {
    this.gameState.endDash(e.playerId);
  }

  handlePickupSpawned(e) {
    this.gameState.addPickup(e.id, e.pos, e.kind);
  }

  handlePickupCollected(e) {
    this.gameState.removePickup(e.id);
  }

  handleBuffApplied(e) {
    this.gameState.applyBuff(e.playerId, e.kind, e.duration);
  }

  handleBuffExpired(e) {
    this.gameState.expireBuff(e.playerId, e.kind);
  }

  handleMatchCreated(e) {
    const phase = e.startsAt || e.countdownMs ? 'countdown' : 'idle';
    let startsAt = null;
    
    if (e.startsAt) {
      startsAt = e.startsAt;
    } else if (typeof e.countdownMs === 'number') {
      startsAt = Date.now() + e.countdownMs;
    }

    this.gameState.updateMatch({
      id: e.id,
      mode: e.mode ?? null,
      phase,
      startsAt,
      endsAt: null,
    });
  }

  handleMatchStarted(e) {
    let endsAt = null;
    if (e.endsAt) {
      endsAt = e.endsAt;
    } else if (typeof e.durationMs === 'number') {
      endsAt = Date.now() + e.durationMs;
    }

    this.gameState.updateMatch({
      phase: 'active',
      startsAt: this.gameState.match.startsAt ?? Date.now(),
      endsAt,
    });
  }

  handleMatchEnded(e) {
    this.gameState.updateMatch({
      phase: 'ended',
      endsAt: e.at ?? Date.now(),
    });
  }

  handleHudScoreboardUpdate(e) {
    this.gameState.updateScoreboard(e.rows);
  }

  handleHudMatchUpdate(e) {
    this.gameState.updateMatch({
      id: e.id ?? null,
      mode: e.mode ?? null,
      phase: e.phase ?? 'idle',
      startsAt: e.startsAt ?? null,
      endsAt: e.endsAt ?? null,
    });
  }

  handleHudFeedUpdate(e) {
    this.gameState.updateKillFeed(e.items);
  }

  handleHudStreaksUpdate(e) {
    this.gameState.updateStreaks(e.streaks);
  }

  handleHudAnnounceUpdate(e) {
    this.gameState.updateAnnouncements(e.items);
  }
}
