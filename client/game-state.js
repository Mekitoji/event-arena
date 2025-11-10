/**
 * GameState - Single Responsibility: Manage all game state data
 * Provides controlled access to state with proper encapsulation
 */
export class GameState {
  constructor() {
    this.me = null;
    this.players = new Map();
    this.projectiles = new Map();
    this.pickups = new Map();
    this.buffs = new Map();
    this.scores = new Map();
    this.streaks = new Map();
    this.killFeed = [];
    this.map = { obstacles: [] };
    this.effects = {
      damage: new Map(),
      death: new Map(),
      dashTrails: new Map(),
      dashActive: new Set(),
      sparks: [],
      explosions: new Map(),
      shake: null,
    };
    this.mouse = { x: 0, y: 0 };
    this.lastAim = { x: 1, y: 0 };
    this.match = {
      id: null,
      mode: null,
      phase: 'idle',
      startsAt: null,
      endsAt: null,
    };
    this.announcements = [];
    this.deadUntil = null;
  }

  // Player management
  setMyId(playerId) {
    this.me = playerId;
  }

  getMyPlayer() {
    return this.me ? this.players.get(this.me) : null;
  }

  isPlayerDead(playerId) {
    const player = this.players.get(playerId);
    return !player || player.isDead;
  }

  addOrUpdatePlayer(playerId, data) {
    const existing = this.players.get(playerId) || {
      id: playerId,
      pos: { x: 100, y: 100 },
      hp: 100,
    };
    this.players.set(playerId, { ...existing, ...data });
  }

  updatePlayerPosition(playerId, pos, face) {
    const player = this.players.get(playerId);
    if (player) {
      player.pos = pos;
      if (face) player.face = face;
      this.players.set(playerId, player);
    }
  }

  updatePlayerHP(playerId, amount) {
    const player = this.players.get(playerId);
    if (player) {
      player.hp = Math.max(0, (player.hp || 0) - amount);
      this.players.set(playerId, player);
    }
  }

  markPlayerDead(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      player.hp = 0;
      player.isDead = true;
      this.players.set(playerId, player);
    }
  }

  // Projectile management
  addProjectile(id, pos, kind = 'bullet') {
    this.projectiles.set(id, { id, pos, kind });
  }

  updateProjectile(id, pos) {
    const projectile = this.projectiles.get(id);
    if (projectile) {
      projectile.pos = pos;
      this.projectiles.set(id, projectile);
    }
  }

  removeProjectile(id) {
    this.projectiles.delete(id);
  }

  // Pickup management
  addPickup(id, pos, kind) {
    this.pickups.set(id, { id, pos, kind });
  }

  removePickup(id) {
    this.pickups.delete(id);
  }

  // Buff management
  applyBuff(playerId, kind, duration) {
    const now = performance.now();
    const until = duration ? now + duration : now;
    const current = this.buffs.get(playerId) || {};
    current[kind] = { until, startedAt: now, duration };
    this.buffs.set(playerId, current);
  }

  expireBuff(playerId, kind) {
    const buffs = this.buffs.get(playerId);
    if (buffs) {
      delete buffs[kind];
      this.buffs.set(playerId, buffs);
    }
  }

  // Effect management
  addDamageEffect(targetId, duration = 180) {
    this.effects.damage.set(targetId, { until: performance.now() + duration });
  }

  addDeathEffect(playerId, pos) {
    this.effects.death.set(playerId, {
      start: performance.now(),
      dur: 450,
      pos: { ...pos },
    });
  }

  addExplosionEffect(pos, radius) {
    const id = `expl-${performance.now()}`;
    this.effects.explosions.set(id, {
      start: performance.now(),
      pos,
      radius,
      dur: 350,
    });
  }

  addSparkEffect(x, y) {
    this.effects.sparks.push({
      x,
      y,
      ts: performance.now(),
      dur: 150,
    });
  }

  startDash(playerId) {
    this.effects.dashActive.add(playerId);
    this.effects.dashTrails.set(playerId, []);
  }

  endDash(playerId) {
    this.effects.dashActive.delete(playerId);
  }

  triggerCameraShake(amplitude = 3, duration = 120) {
    this.effects.shake = { until: performance.now() + duration, amp: amplitude };
  }

  // Match management
  updateMatch(data) {
    this.match = { ...this.match, ...data };
  }

  // HUD data management
  updateScoreboard(rows) {
    const scores = new Map();
    for (const row of rows || []) {
      scores.set(row.playerId, {
        kills: row.kills || 0,
        deaths: row.deaths || 0,
        assists: row.assists || 0,
      });

      // Sync player data from scoreboard
      const player = this.players.get(row.playerId) || {
        id: row.playerId,
        pos: { x: 0, y: 0 },
        hp: row.hp ?? 100,
        name: row.name,
      };
      if (row.name) player.name = row.name;
      if (typeof row.hp === 'number') player.hp = row.hp;
      if (typeof row.isDead === 'boolean') player.isDead = row.isDead;
      this.players.set(row.playerId, player);
    }
    this.scores = scores;
  }

  updateKillFeed(items) {
    this.killFeed = Array.isArray(items) ? items.slice() : [];
  }

  updateStreaks(streaks) {
    const map = new Map();
    if (streaks) {
      for (const [pid, val] of Object.entries(streaks)) {
        map.set(pid, val);
      }
    }
    this.streaks = map;
  }

  updateAnnouncements(items) {
    this.announcements = Array.isArray(items) ? items.slice() : [];
  }

  // Mouse/Aim management
  updateMousePosition(x, y) {
    this.mouse.x = x;
    this.mouse.y = y;
  }

  updateLastAim(aim) {
    this.lastAim = aim;
  }

  // Map management
  loadMap(obstacles) {
    this.map.obstacles = obstacles || [];
  }
}
