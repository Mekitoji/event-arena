import { sound } from './sound.js';
import { setupSoundUI } from './sound-ui.js';

const ws = new WebSocket(`ws://${location.hostname}:8081`);
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');

// Unlock/resume audio on first user interaction
addEventListener('pointerdown', sound.unlock, { passive: true });
addEventListener('keydown', sound.unlock, { passive: true });

// Initialize Sound UI module
setupSoundUI(sound);
const state = {
  me: null,
  players: new Map(),
  projectiles: new Map(),
  pickups: new Map(),
  buffs: new Map(),
  scores: new Map(), // playerId -> {kills, deaths, assists}
  streaks: new Map(), // playerId -> streak count
  killFeed: [], // Recent kill entries: [{killer, victim, weapon, assistIds, timestamp}]
  map: { obstacles: [] },
  effects: {
    damage: new Map(),
    death: new Map(),
    dashTrails: new Map(),
    dashActive: new Set(),
  },
  mouse: { x: 0, y: 0 },
  lastAim: { x: 1, y: 0 },
  match: {
    id: null,
    mode: null,
    phase: 'idle', // 'idle' | 'countdown' | 'active' | 'ended'
    startsAt: null, // epoch ms
    endsAt: null, // epoch ms (optional)
  },
  announcements: [], // [{kind:'streak', playerId, name, category, streak, message, timestamp}]
};

ws.addEventListener('open', () => {
  // Subscribe to server-driven HUD widgets first
  ws.send(
    JSON.stringify({
      type: 'cmd:hud:subscribe',
      widgets: ['scoreboard', 'match', 'feed', 'streaks', 'announcements'],
    }),
  );

  // Include optional matchId so server can bind player to a match, if already created
  ws.send(
    JSON.stringify({
      type: 'cmd:join',
      name: 'Player' + Math.floor(Math.random() * 1000),
      matchId: state.match.id ?? undefined,
    }),
  );
});
ws.addEventListener('message', (ev) => {
  const e = JSON.parse(ev.data);
  // Pipe events to sound system (uses internal dedup for HUD deltas)
  sound.onEvent(e, { me: state.me });

  if (e.type === 'session:started') {
    state.me = e.playerId;
    if (!state.players.has(e.playerId)) {
      state.players.set(e.playerId, {
        id: e.playerId,
        pos: { x: 100, y: 100 },
        hp: 100,
      });
    }
    e.players.forEach((info) => {
      const p = state.players.get(info.id) || {
        id: info.id,
        pos: { x: 0, y: 0 },
        hp: 100,
        name: info.name,
      };
      p.pos = info.pos;
      p.name = info.name;
      state.players.set(info.id, p);
    });
    // If server bootstraps current match state in session:started
    if (e.match) {
      state.match.id = e.match.id ?? null;
      state.match.mode = e.match.mode ?? null;
      state.match.phase = e.match.phase ?? 'idle';
      state.match.startsAt = e.match.startsAt ?? null;
      state.match.endsAt = e.match.endsAt ?? null;
    }
    return;
  }

  if (e.type === 'player:join') {
    if (!state.players.has(e.playerId)) {
      state.players.set(e.playerId, {
        id: e.playerId,
        pos: { x: 100, y: 100 },
        hp: 100,
        name: e.name,
      });
    } else {
      const p = state.players.get(e.playerId);
      p.name = e.name ?? p.name;
      // Clear dead state on rejoin (respawn)
      p.hp = 100;
      p.isDead = false;
      delete p.diedAt;
      state.players.set(e.playerId, p);
    }
    // If server indicates player's match assignment
    if (e.matchId) {
      state.match.id = e.matchId;
    }
  }
  if (e.type === 'player:move') {
    const p = state.players.get(e.playerId) || {
      id: e.playerId,
      pos: { x: 0, y: 0 },
      hp: 100,
      face: { x: 1, y: 0 },
    };
    p.pos = e.pos;
    if (e.dir) p.face = e.dir;
    state.players.set(e.playerId, p);
  }
  if (e.type === 'map:loaded') {
    state.map.obstacles = e.obstacles || [];
  }
  if (e.type === 'projectile:spawned') {
    state.projectiles.set(e.id, {
      id: e.id,
      pos: e.pos,
      kind: e.kind || 'bullet',
    });
  }

  if (e.type === 'player:aimed') {
    const p = state.players.get(e.playerId);
    if (p) {
      p.face = e.dir;
      state.players.set(e.playerId, p);
    }
  }

  // Match lifecycle events
  if (e.type === 'match:created') {
    // Payload: { id, mode, startsAt? (epoch ms), countdownMs? }
    state.match.id = e.id;
    state.match.mode = e.mode ?? null;
    state.match.phase = e.startsAt || e.countdownMs ? 'countdown' : 'idle';
    if (e.startsAt) state.match.startsAt = e.startsAt;
    else if (typeof e.countdownMs === 'number') {
      state.match.startsAt = Date.now() + e.countdownMs;
    } else state.match.startsAt = null;
    state.match.endsAt = null;
  }
  if (e.type === 'match:started') {
    state.match.phase = 'active';
    state.match.startsAt = state.match.startsAt ?? Date.now();
    // Optionally accept endsAt/duration for a visible timer
    if (e.endsAt) state.match.endsAt = e.endsAt;
    else if (typeof e.durationMs === 'number') {
      state.match.endsAt = Date.now() + e.durationMs;
    }
  }
  if (e.type === 'match:ended') {
    state.match.phase = 'ended';
    state.match.endsAt = e.at ?? Date.now();
  }

  if (e.type === 'player:kill') {
    // keep for potential VFX; scoreboard/feed widgets handle UI updates
  }

  // HUD widgets (server-driven)
  if (e.type === 'hud:scoreboard:update') {
    // Rebuild scores map and sync player hp/dead/name
    const scores = new Map();
    for (const r of e.rows || []) {
      scores.set(r.playerId, {
        kills: r.kills || 0,
        deaths: r.deaths || 0,
        assists: r.assists || 0,
      });
      const p = state.players.get(r.playerId) || {
        id: r.playerId,
        pos: { x: 0, y: 0 },
        hp: r.hp ?? 100,
        name: r.name,
      };
      if (r.name) p.name = r.name;
      if (typeof r.hp === 'number') p.hp = r.hp;
      if (typeof r.isDead === 'boolean') p.isDead = r.isDead;
      state.players.set(r.playerId, p);
    }
    state.scores = scores;
  }
  if (e.type === 'hud:match:update') {
    state.match.id = e.id ?? null;
    state.match.mode = e.mode ?? null;
    state.match.phase = e.phase ?? 'idle';
    state.match.startsAt = e.startsAt ?? null;
    state.match.endsAt = e.endsAt ?? null;
  }
  if (e.type === 'hud:feed:update') {
    state.killFeed = Array.isArray(e.items) ? e.items.slice() : [];
  }
  if (e.type === 'hud:streaks:update') {
    const m = new Map();
    if (e.streaks) {
      for (const [pid, val] of Object.entries(e.streaks)) m.set(pid, val);
    }
    state.streaks = m;
  }
  if (e.type === 'hud:announce:update') {
    state.announcements = Array.isArray(e.items) ? e.items.slice() : [];
  }

  if (e.type === 'projectile:moved') {
    const pr = state.projectiles.get(e.id) || {
      id: e.id,
      pos: { x: 0, y: 0 },
      kind: 'bullet',
    };
    pr.pos = e.pos;
    state.projectiles.set(e.id, pr);
  }
  if (e.type === 'projectile:despawned') {
    state.projectiles.delete(e.id);
  }
  if (e.type === 'projectile:bounced') {
    // simple spark effect at projectile position next frame
    const pr = state.projectiles.get(e.id);
    if (!state.effects.sparks) state.effects.sparks = [];
    if (pr) {
      state.effects.sparks.push({
        x: pr.pos.x,
        y: pr.pos.y,
        ts: performance.now(),
        dur: 150,
      });
    }
  }
  if (e.type === 'pickup:spawned') {
    state.pickups.set(e.id, { id: e.id, pos: e.pos, kind: e.kind });
  }
  if (e.type === 'pickup:collected') {
    state.pickups.delete(e.id);
  }
  if (e.type === 'buff:applied') {
    const nowp = performance.now();
    const until = e.duration ? nowp + e.duration : nowp;
    const cur = state.buffs.get(e.playerId) || {};
    cur[e.kind] = { until, startedAt: nowp, duration: e.duration };
    state.buffs.set(e.playerId, cur);
  }
  if (e.type === 'buff:expired') {
    const b = state.buffs.get(e.playerId);
    if (b) {
      delete b[e.kind];
      state.buffs.set(e.playerId, b);
    }
  }
  if (e.type === 'explosion:spawned') {
    // simple shockwave effect
    const id = `expl-${performance.now()}`;
    if (!state.effects.explosions) state.effects.explosions = new Map();
    state.effects.explosions.set(id, {
      start: performance.now(),
      pos: e.pos,
      radius: e.radius,
      dur: 350,
    });
  }
  if (e.type === 'knockback:applied') {
    if (state.me === e.targetId) {
      state.effects.shake = { until: performance.now() + 120, amp: 3 };
    }
  }
  if (e.type === 'damage:applied') {
    const dur = 180; // ms
    state.effects.damage.set(e.targetId, { until: performance.now() + dur });
    const tp = state.players.get(e.targetId);
    if (tp) {
      tp.hp = Math.max(0, (tp.hp || 0) - (e.amount || 0));
      state.players.set(e.targetId, tp);
    }
  }
  if (e.type === 'player:die') {
    const p = state.players.get(e.playerId);
    if (p) {
      // Mark player as dead and add death effect
      p.hp = 0;
      p.isDead = true;
      state.effects.death.set(e.playerId, {
        start: performance.now(),
        dur: 450,
        pos: { ...p.pos },
      });

      if (state.me === e.playerId) {
        // For my own death, still keep in players list but mark as dead
        // The respawn logic will check for !state.players.get(state.me) || state.players.get(state.me).isDead
        state.players.set(e.playerId, p);
      }
    }
  }
  if (e.type === 'dash:started') {
    // initialize trail storage and mark active
    state.effects.dashActive.add(e.playerId);
    state.effects.dashTrails.set(e.playerId, []);
  }
  if (e.type === 'dash:ended') {
    // stop recording; let remaining points fade
    state.effects.dashActive.delete(e.playerId);
  }
  if (e.type === 'player:dead') {
    // server tells me when I may respawn
    state.deadUntil = e.until;
  }
});

const keys = new Set();
// Track pressed movement keys; clear on blur/visibility changes to avoid stuck keys when tab is hidden
addEventListener('keydown', (e) => {
  const key = (e.key || '').toLowerCase();
  if (key) keys.add(key);
});
addEventListener('keyup', (e) => {
  const key = (e.key || '').toLowerCase();
  if (key) keys.delete(key);
});
addEventListener('blur', () => keys.clear());
addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') keys.clear();
});
cv.addEventListener('mousedown', (e) => {
  if (!state.me) return;
  const me = state.players.get(state.me);
  if (!me) return;
  if (me.isDead) return; // don't allow actions (and sounds) while dead
  if (e.button === 0) {
    // Left click: shoot
    sound.onLocalAction('cast', { skill: 'skill:shoot' }); // immediate feedback
    ws.send(
      JSON.stringify({
        type: 'cmd:cast',
        playerId: state.me,
        skill: 'skill:shoot',
      }),
    );
  }
});

// Right click for shotgun
cv.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (!state.me) return;
  const me = state.players.get(state.me);
  if (!me) return;
  if (me.isDead) return; // don't allow actions (and sounds) while dead
  sound.onLocalAction('cast', { skill: 'skill:shotgun' });
  ws.send(
    JSON.stringify({
      type: 'cmd:cast',
      playerId: state.me,
      skill: 'skill:shotgun',
    }),
  );
});

// track mouse position relative to canvas
cv.addEventListener('mousemove', (ev) => {
  const rect = cv.getBoundingClientRect();
  state.mouse.x = ev.clientX - rect.left;
  state.mouse.y = ev.clientY - rect.top;
});

addEventListener('keydown', (e) => {
  const key = (e.key || '').toLowerCase();
  const code = e.code;

  // Dash on Shift
  if (key === 'shift' || code === 'ShiftLeft' || code === 'ShiftRight') {
    if (!state.me) return;
    const me = state.players.get(state.me);
    if (me && !me.isDead) {
      sound.onLocalAction('cast', { skill: 'skill:dash' });
      ws.send(
        JSON.stringify({
          type: 'cmd:cast',
          playerId: state.me,
          skill: 'skill:dash',
        }),
      );
    }
  }

  // Rocket (alive) or Respawn (dead) on Space
  const isSpace = code === 'Space' || key === ' ';
  if (isSpace) {
    e.preventDefault();
    e.stopPropagation();
    if (!state.me) return;
    const me = state.players.get(state.me);
    const isDead = !me || me.isDead;
    if (!isDead) {
      // alive: cast rocket
      sound.onLocalAction('cast', { skill: 'skill:rocket' });
      ws.send(
        JSON.stringify({
          type: 'cmd:cast',
          playerId: state.me,
          skill: 'skill:rocket',
        }),
      );
    } else {
      // dead: try respawn
      ws.send(JSON.stringify({ type: 'cmd:respawn', playerId: state.me }));
    }
  }
});

let lastDir = { x: 0, y: 0 };

function sameDir(a, b) {
  return a.x === b.x && a.y === b.y;
}

setInterval(() => {
  if (!state.me) return;
  const dir = { x: 0, y: 0 };
  if (keys.has('w')) dir.y -= 1;
  if (keys.has('s')) dir.y += 1;
  if (keys.has('a')) dir.x -= 1;
  if (keys.has('d')) dir.x += 1;

  if (!sameDir(dir, lastDir)) {
    ws.send(JSON.stringify({ type: 'cmd:move', playerId: state.me, dir }));
    lastDir = dir;
  }

  // Aim update (every 50ms)
  const me = state.players.get(state.me);
  if (me) {
    // convert canvas coords to world vector: world = canvas * 2.2
    const toWorld = 2.2;
    const target = { x: state.mouse.x * toWorld, y: state.mouse.y * toWorld };
    const aim = { x: target.x - me.pos.x, y: target.y - me.pos.y };
    const sameAim = (a, b) =>
      Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1;
    if (!sameAim(aim, state.lastAim)) {
      ws.send(
        JSON.stringify({ type: 'cmd:aim', playerId: state.me, dir: aim }),
      );
      state.lastAim = aim;
    }
  }
}, 50);

function draw() {
  // camera shake
  const shake = state.effects.shake;
  if (shake && shake.until > performance.now()) {
    const amp = shake.amp;
    ctx.save();
    ctx.translate((Math.random() - 0.5) * amp, (Math.random() - 0.5) * amp);
  } else if (shake) {
    state.effects.shake = null;
  }
  ctx.clearRect(0, 0, cv.width, cv.height);

  // Match countdown/phase overlay (rendered underneath HUD so it's clearly visible)
  const nowTs = Date.now();
  const m = state.match;
  let showOverlay = false;
  let overlayLines = [];
  if (m.phase === 'countdown' && m.startsAt) {
    const remainMs = Math.max(0, m.startsAt - nowTs);
    const secs = Math.ceil(remainMs / 1000);
    overlayLines.push(m.mode ? `Mode: ${m.mode}` : 'Match');
    overlayLines.push(`Starting in ${secs}s`);
    if (remainMs === 0) {
      // local transition safeguard if server is slightly late
      m.phase = 'active';
    }
    showOverlay = true;
  } else if (m.phase === 'active') {
    overlayLines.push(m.mode ? `Mode: ${m.mode}` : 'Match in progress');
    if (m.endsAt) {
      const remainMs = Math.max(0, m.endsAt - nowTs);
      const secs = Math.ceil(remainMs / 1000);
      overlayLines.push(`Time left: ${secs}s`);
    }
    showOverlay = true;
  } else if (m.phase === 'ended') {
    overlayLines.push('Match ended');
    if (m.mode) overlayLines.push(`Mode: ${m.mode}`);
    showOverlay = true;
  }
  if (showOverlay) {
    const boxW = 260;
    const boxH = 64;
    const x = (cv.width - boxW) / 2;
    const y = 24;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y, boxW, boxH);
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.textBaseline = 'top';
    let yy = y + 10;
    for (const line of overlayLines) {
      ctx.fillText(line, x + 12, yy);
      yy += 20;
    }
  }

  // Center-top streak announcement banner (3s TTL)
  if (Array.isArray(state.announcements) && state.announcements.length) {
    const nowEpoch = Date.now();
    const visible = state.announcements.filter(
      (a) => nowEpoch - a.timestamp < 3000,
    );
    if (visible.length) {
      const ann = visible[visible.length - 1]; // latest
      const text = `${ann.name || ann.playerId} ${ann.message} (${ann.streak})`;
      ctx.font = '18px sans-serif';
      ctx.textBaseline = 'top';
      const paddingX = 16;
      const paddingY = 8;
      const width = ctx.measureText(text).width + paddingX * 2;
      const height = 32;
      const x = (cv.width - width) / 2;
      const y = 96;
      const alpha = Math.max(0.2, 1 - (nowEpoch - ann.timestamp) / 3000);
      const isMe = ann.playerId === state.me;
      ctx.fillStyle = isMe
        ? `rgba(0,120,0,${0.75 * alpha})`
        : `rgba(0,0,0,${0.6 * alpha})`;
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = isMe
        ? `rgba(0,220,0,${alpha})`
        : `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      ctx.fillStyle = isMe
        ? `rgba(230,255,230,${alpha})`
        : `rgba(255,255,255,${alpha})`;
      ctx.fillText(text, x + paddingX, y + paddingY);
    }
  }

  // draw map obstacles
  if (state.map && Array.isArray(state.map.obstacles)) {
    ctx.fillStyle = '#777';
    for (const ob of state.map.obstacles) {
      if (ob.type === 'rect') {
        ctx.fillRect(ob.x / 2.2, ob.y / 2.2, ob.w / 2.2, ob.h / 2.2);
      }
    }
  }

  const now = performance.now();

  // cleanup expired damage flashes
  for (const [pid, fx] of state.effects.damage) {
    if (fx.until <= now) state.effects.damage.delete(pid);
  }
  // cleanup finished death effects
  for (const [_pid, fx] of state.effects.death) {
    const t = (now - fx.start) / fx.dur;
    if (t >= 1) {
      state.effects.death.delete(_pid);
      // Don't delete dead players from the list - they should stay for scoreboard
    }
  }

  // sparks (bounces)
  if (state.effects.sparks) {
    for (let i = state.effects.sparks.length - 1; i >= 0; i--) {
      const s = state.effects.sparks[i];
      const t = (now - s.ts) / s.dur;
      if (t >= 1) {
        state.effects.sparks.splice(i, 1);
        continue;
      }
      ctx.strokeStyle = `rgba(255,200,100,${1 - t})`;
      ctx.beginPath();
      ctx.moveTo(s.x / 2.2 - 4, s.y / 2.2);
      ctx.lineTo(s.x / 2.2 + 4, s.y / 2.2);
      ctx.stroke();
    }
  }

  // explosions
  if (state.effects.explosions) {
    for (const [id, fx] of state.effects.explosions) {
      const t = (now - fx.start) / fx.dur;
      if (t >= 1) {
        state.effects.explosions.delete(id);
        continue;
      }
      const r = fx.radius * t;
      const a = 1 - t;
      ctx.strokeStyle = `rgba(255,120,0,${a})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(fx.pos.x / 2.2, fx.pos.y / 2.2, r / 2.2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // dash trails (ghost afterimages)
  if (state.effects.dashTrails) {
    for (const [pid, arr] of state.effects.dashTrails) {
      const p = state.players.get(pid);
      // record only while dash is active
      if (p && state.effects.dashActive.has(pid)) {
        arr.push({ x: p.pos.x, y: p.pos.y, ts: now });
      }
      // keep last 120ms snapshots
      while (arr.length && now - arr[0].ts > 120) arr.shift();
      // draw existing points
      if (arr.length) {
        ctx.strokeStyle = 'rgba(150,150,255,0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < arr.length; i++) {
          const a = 1 - (now - arr[i].ts) / 120;
          ctx.globalAlpha = Math.max(0, a);
          ctx.moveTo(arr[i].x / 2.2, arr[i].y / 2.2);
          ctx.lineTo(arr[i].x / 2.2 + 6, arr[i].y / 2.2);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // if trail finished and no points left, cleanup entry
      if (!state.effects.dashActive.has(pid) && arr.length === 0) {
        state.effects.dashTrails.delete(pid);
      } else {
        state.effects.dashTrails.set(pid, arr);
      }
    }
  }

  // players with damage flash overlay
  for (const p of state.players.values()) {
    if (p.isDead) continue; // Don't render dead players

    const x = p.pos.x / 2.2;
    const y = p.pos.y / 2.2;

    // base body
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();

    // facing indicator (gun)
    const f = p.face || { x: 1, y: 0 };
    const mag = Math.hypot(f.x, f.y) || 1;
    const fx = f.x / mag,
      fy = f.y / mag;
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + fx * 14, y + fy * 14);
    ctx.stroke();

    // damage flash overlay
    const dmg = state.effects.damage.get(p.id);
    if (dmg) {
      const alpha = Math.max(0, (dmg.until - now) / 180);
      ctx.fillStyle = `rgba(255,0,0,${0.6 * alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // death effects (expanding fade ring)
  for (const fx of state.effects.death.values()) {
    const t = Math.min(1, (now - fx.start) / fx.dur);
    const x = fx.pos.x / 2.2;
    const y = fx.pos.y / 2.2;
    const r = 8 + t * 18;
    const a = 1 - t;
    ctx.strokeStyle = `rgba(0,0,0,${a})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // pickups with key labels
  for (const pk of state.pickups.values()) {
    const x = pk.pos.x / 2.2,
      y = pk.pos.y / 2.2;
    let color = '#ccc';
    let label = '?';
    if (pk.kind === 'heal') {
      color = '#3c3';
      label = '+';
    } else if (pk.kind === 'haste') {
      color = '#39c';
      label = 'h';
    } else if (pk.kind === 'shield') {
      color = '#cc3';
      label = 'S';
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    // outline
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.stroke();
    // label
    ctx.fillStyle = '#000';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y + 0.5);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }

  // projectiles with kind-based visuals
  for (const pr of state.projectiles.values()) {
    let r = 4,
      color = '#333';
    if (pr.kind === 'pellet') {
      r = 3;
      color = '#555';
    }
    if (pr.kind === 'rocket') {
      r = 6;
      color = '#d33';
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(pr.pos.x / 2.2, pr.pos.y / 2.2, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // HUD: my HP bar and buffs
  const me = state.me ? state.players.get(state.me) : null;
  if (me) {
    const maxHp = 100;
    const w = 160;
    const h = 14;
    const x = 16;
    const y = 16;
    const ratio = Math.max(0, Math.min(1, (me.hp ?? 0) / maxHp));
    ctx.fillStyle = '#ddd';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = '#900';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#0c0';
    ctx.fillRect(x, y, w * ratio, h);
    ctx.fillStyle = '#000';
    ctx.font = '12px sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(`${me.name || 'Me'}: ${me.hp ?? 0}/${maxHp}`, x, y + h + 4);

    // Buff HUD icons with timers
    const myBuffs = state.buffs.get(me.id) || {};
    let bx = x;
    const by = y + h + 24;
    const nowp = performance.now();
    const drawBuff = (kind, color, label) => {
      const info = myBuffs[kind];
      if (!info || !info.duration) return;
      const total = info.duration;
      const remainMs = Math.max(0, info.until - nowp);
      const ratio = Math.max(0, Math.min(1, remainMs / total));
      // icon
      ctx.fillStyle = color;
      ctx.fillRect(bx, by, 18, 18);
      // label on icon
      ctx.fillStyle = '#000';
      ctx.font = '10px sans-serif';
      ctx.fillText(label, bx + 5, by + 4);
      // shrinking line timer underneath
      ctx.fillStyle = '#222';
      ctx.fillRect(bx, by + 20, 18, 3);
      ctx.fillStyle = '#0a0';
      ctx.fillRect(bx, by + 20, 18 * ratio, 3);
      bx += 28;
    };
    drawBuff('haste', '#9cf', 'h');
    drawBuff('shield', '#ffb', 'S');
  }

  // HUD: Kill Feed (top right)
  const feedX = cv.width - 300;
  let feedY = 16;
  ctx.font = '11px sans-serif';
  ctx.textBaseline = 'top';

  // Server is authoritative for feed TTL and item capping
  const feedNow = Date.now();

  for (const entry of state.killFeed) {
    const age = feedNow - entry.timestamp;
    const alpha = Math.max(0, Math.min(1, 1 - age / 10000)); // Fade out over 10s

    // Background
    ctx.fillStyle = `rgba(0,0,0,${0.6 * alpha})`;
    ctx.fillRect(feedX, feedY, 280, 16);

    // Get player names
    const killerPlayer = state.players.get(entry.killer);
    const victimPlayer = state.players.get(entry.victim);
    const killerName = killerPlayer?.name || entry.killer;
    const victimName = victimPlayer?.name || entry.victim;

    // Weapon icon/text
    let weaponText = '•';
    if (entry.weapon === 'bullet') weaponText = '●';
    else if (entry.weapon === 'pellet') weaponText = '◦◦◦';
    else if (entry.weapon === 'rocket') weaponText = '🚀';
    else if (entry.weapon === 'explosion') weaponText = '💥';

    // Killer name (green if me)
    ctx.fillStyle =
      entry.killer === state.me
        ? `rgba(0,255,0,${alpha})`
        : `rgba(255,255,255,${alpha})`;
    const killerText = `${killerName}`;
    ctx.fillText(killerText, feedX + 4, feedY + 2);
    const killerWidth = ctx.measureText(killerText).width;

    // Weapon
    ctx.fillStyle = `rgba(255,200,100,${alpha})`;
    ctx.fillText(weaponText, feedX + 8 + killerWidth, feedY + 2);
    const weaponWidth = ctx.measureText(weaponText).width;

    // Victim name (red if me)
    ctx.fillStyle =
      entry.victim === state.me
        ? `rgba(255,100,100,${alpha})`
        : `rgba(255,255,255,${alpha})`;
    ctx.fillText(victimName, feedX + 12 + killerWidth + weaponWidth, feedY + 2);

    feedY += 18;
  }

  // HUD: Streak Badge (next to HP bar)
  if (me) {
    const myStreak = state.streaks.get(state.me) || 0;
    if (myStreak > 1) {
      const streakX = 200;
      const streakY = 16;

      // Badge background
      ctx.fillStyle = myStreak >= 5 ? '#ff6600' : '#ffaa00';
      ctx.fillRect(streakX, streakY, 60, 20);

      // Badge border
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(streakX, streakY, 60, 20);

      // Badge text
      ctx.fillStyle = '#000';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${myStreak} STREAK`, streakX + 30, streakY + 10);

      // Reset alignment
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
    }
  }

  // HUD: players list
  ctx.font = '12px sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#000';
  const listX = 16;
  let listY = 80;

  // respawn prompt if dead
  const myPlayer = state.players.get(state.me);
  if (state.me && (!myPlayer || myPlayer.isDead)) {
    const nowEpoch = Date.now();
    const until = state.deadUntil || nowEpoch + 5000; // fallback
    const remainMs = Math.max(0, until - nowEpoch);
    const secs = Math.ceil(remainMs / 1000);

    // progress bar background
    const barW = 280;
    const barH = 6;
    const progress = Math.max(0, Math.min(1, 1 - remainMs / 5000));

    ctx.fillStyle = '#200';
    ctx.fillRect(listX - 4, listY - 2, barW + 8, 32);
    ctx.fillStyle = '#fcc';
    ctx.fillText(`You are dead. Respawn in ${secs}s`, listX, listY);
    listY += 16;
    ctx.fillStyle = '#400';
    ctx.fillRect(listX, listY, barW, barH);
    ctx.fillStyle = '#c66';
    ctx.fillRect(listX, listY, barW * progress, barH);
    listY += 10;

    if (remainMs <= 0) {
      ctx.fillStyle = '#cfc';
      ctx.fillText('Press SPACE to respawn', listX, listY);
      listY += 16;
    }
  }
  const playersArr = Array.from(state.players.values()).sort((a, b) =>
    (a.name || a.id).localeCompare(b.name || b.id),
  );
  for (const p of playersArr) {
    const isMe = state.me === p.id;
    const score = state.scores.get(p.id) || { kills: 0, deaths: 0, assists: 0 };

    // Different styling for dead players
    if (p.isDead) {
      ctx.fillStyle = isMe ? '#300' : '#111';
      ctx.fillRect(listX - 4, listY - 2, 220, 18);
      ctx.fillStyle = isMe ? '#f99' : '#888';
    } else {
      ctx.fillStyle = isMe ? '#003' : '#222';
      ctx.fillRect(listX - 4, listY - 2, 220, 18);
      ctx.fillStyle = isMe ? '#9cf' : '#fff';
    }

    // Display: Name: HP | K/D/A with death indicator
    const scoreText = `${score.kills}/${score.deaths}/${score.assists}`;
    const deadIndicator = p.isDead ? ' [DEAD]' : '';
    ctx.fillText(
      `${p.name || p.id}: ${p.hp ?? 0} | ${scoreText}${deadIndicator}`,
      listX,
      listY,
    );
    listY += 20;
  }

  requestAnimationFrame(draw);
  // restore after shake
  const sh2 = state.effects.shake;
  if (sh2 && sh2.until > performance.now()) {
    ctx.restore();
  }
}
draw();
