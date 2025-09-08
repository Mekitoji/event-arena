// Simple procedural sound engine for EventArena
// Uses Web Audio API; gracefully does nothing if not supported

export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.muted = false;
    this.volume = 0.6; // master volume 0..1

    this.throttleMap = new Map();

    // Dedup detection for server-driven HUD updates
    this._feedInit = false;
    this._announceInit = false;
    this._seenFeedTs = new Set();
    this._seenAnnTs = new Set();

    this.unlock = this.unlock.bind(this);
  }

  init() {
    if (this.ctx) return;
    const AC = AudioContext;
    if (!AC) { this.enabled = false; return; }
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(this.ctx.destination);
  }

  unlock() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => { });
    }
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0.6));
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
  }

  setMuted(m) {
    this.muted = !!m;
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
  }

  throttle(key, ms) {
    const now = (performance?.now?.() ?? Date.now());
    const last = this.throttleMap.get(key) || 0;
    if (now - last < ms) return true;
    this.throttleMap.set(key, now);
    return false;
  }

  // Low-level helpers
  _now(offsetSec = 0) {
    if (!this.ctx) return 0;
    return this.ctx.currentTime + (offsetSec || 0);
  }

  _envelope(gainNode, when, { attack = 0.005, decay = 0.06, sustain = 0.0, hold = 0.04, release = 0.05, peak = 1.0 }) {
    const g = gainNode.gain;
    const start = when;
    g.cancelScheduledValues(start);
    g.setValueAtTime(0.0001, start);
    g.linearRampToValueAtTime(Math.max(0.0001, peak), start + attack);
    const sustainLevel = Math.max(0.0001, peak * sustain);
    g.linearRampToValueAtTime(Math.max(0.0001, peak * 0.6), start + attack + decay);
    g.setValueAtTime(Math.max(0.0001, peak * 0.6), start + attack + decay + hold);
    g.linearRampToValueAtTime(sustainLevel, start + attack + decay + hold + 0.0001);
    // release from sustain level
    g.linearRampToValueAtTime(0.0001, start + attack + decay + hold + release);
  }

  _playTone({ type = 'sine', freq = 440, duration = 0.12, volume = 0.3, when = 0, slideTo = null, slideTime = 0.08, attack = 0.005, decay = 0.05, hold = 0.02, release = 0.05 }) {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    const t0 = this._now(when);

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (typeof slideTo === 'number' && slideTime > 0) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + slideTime);
    }

    const gain = ctx.createGain();
    this._envelope(gain, t0, { attack, decay, hold, release, peak: Math.max(0.0001, volume), sustain: 0.0 });

    osc.connect(gain).connect(this.master);
    osc.start(t0);
    const stopAt = t0 + Math.max(attack + decay + hold + release, duration);
    osc.stop(stopAt + 0.02);
  }

  _playNoise({ duration = 0.2, volume = 0.4, when = 0, filterType = null, filterFreqStart = 2000, filterFreqEnd = 400, q = 0.7, attack = 0.003, decay = 0.08, hold = 0.02, release = 0.08 }) {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    const t0 = this._now(when);

    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * Math.max(0.02, duration)));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const gain = ctx.createGain();
    this._envelope(gain, t0, { attack, decay, hold, release, peak: Math.max(0.0001, volume), sustain: 0.0 });

    let last = src;
    if (filterType) {
      const biq = ctx.createBiquadFilter();
      biq.type = filterType;
      biq.Q.value = Math.max(0.0001, q);
      biq.frequency.setValueAtTime(Math.max(10, filterFreqStart), t0);
      if (filterFreqEnd && filterFreqEnd !== filterFreqStart) {
        biq.frequency.exponentialRampToValueAtTime(Math.max(10, filterFreqEnd), t0 + Math.max(0.02, duration));
      }
      last.connect(biq);
      last = biq;
    }

    last.connect(gain).connect(this.master);
    src.start(t0);
    src.stop(t0 + Math.max(0.02, duration) + 0.05);
  }

  // High-level SFX
  sfx = {
    shoot: () => {
      if (this.throttle('shoot', 35)) return;
      this._playTone({ type: 'square', freq: 900, duration: 0.06, volume: 0.22, decay: 0.04, hold: 0.02, release: 0.03 });
    },
    shotgun: () => {
      if (this.throttle('shotgun', 150)) return;
      this._playNoise({ duration: 0.12, volume: 0.35, filterType: 'bandpass', filterFreqStart: 1400, filterFreqEnd: 700, q: 0.8, decay: 0.06, hold: 0.03, release: 0.06 });
      this._playTone({ type: 'sine', freq: 180, duration: 0.08, volume: 0.18, decay: 0.05, hold: 0.02, release: 0.08 });
    },
    rocketLaunch: () => {
      this._playTone({ type: 'sawtooth', freq: 300, slideTo: 900, slideTime: 0.3, duration: 0.3, volume: 0.22, attack: 0.005, decay: 0.18, hold: 0.05, release: 0.1 });
      this._playNoise({ duration: 0.28, volume: 0.18, filterType: 'highpass', filterFreqStart: 400, filterFreqEnd: 1200, q: 0.9, decay: 0.14, release: 0.14 });
    },
    explosion: () => {
      if (this.throttle('explosion', 100)) return;
      this._playNoise({ duration: 0.5, volume: 0.45, filterType: 'lowpass', filterFreqStart: 1800, filterFreqEnd: 500, q: 0.6, decay: 0.22, hold: 0.08, release: 0.25 });
      this._playTone({ type: 'sine', freq: 160, slideTo: 80, slideTime: 0.35, duration: 0.45, volume: 0.2, attack: 0.005, decay: 0.2, hold: 0.12, release: 0.22 });
    },
    bounce: () => {
      if (this.throttle('bounce', 25)) return;
      this._playTone({ type: 'triangle', freq: 1300, duration: 0.03, volume: 0.12, decay: 0.02, hold: 0.01, release: 0.02 });
    },
    dash: () => {
      if (this.throttle('dash', 200)) return;
      this._playNoise({ duration: 0.18, volume: 0.22, filterType: 'highpass', filterFreqStart: 1500, filterFreqEnd: 500, q: 0.7, decay: 0.07, hold: 0.05, release: 0.09 });
    },
    hitMe: () => {
      if (this.throttle('hitMe', 70)) return;
      this._playTone({ type: 'square', freq: 250, duration: 0.07, volume: 0.18, decay: 0.05, hold: 0.02, release: 0.05 });
    },
    deathMe: () => {
      this._playTone({ type: 'sawtooth', freq: 520, slideTo: 130, slideTime: 0.38, duration: 0.4, volume: 0.24, attack: 0.006, decay: 0.16, hold: 0.15, release: 0.2 });
      this._playNoise({ duration: 0.25, volume: 0.14, filterType: 'lowpass', filterFreqStart: 1200, filterFreqEnd: 400, q: 0.7, decay: 0.12, hold: 0.06, release: 0.12 });
    },
    pickup: () => {
      this._playTone({ type: 'sine', freq: 900, duration: 0.08, volume: 0.18 });
      this._playTone({ type: 'sine', freq: 1200, when: 0.08, duration: 0.07, volume: 0.16 });
    },
    killMine: () => {
      this._playTone({ type: 'triangle', freq: 680, duration: 0.09, volume: 0.2 });
      this._playTone({ type: 'triangle', freq: 980, when: 0.09, duration: 0.1, volume: 0.2 });
    },
    gotKilled: () => {
      this._playTone({ type: 'triangle', freq: 700, duration: 0.08, volume: 0.18 });
      this._playTone({ type: 'triangle', freq: 420, when: 0.08, duration: 0.12, volume: 0.18 });
    },
    assist: () => {
      this._playTone({ type: 'sine', freq: 760, duration: 0.08, volume: 0.18 });
    },
    streakChime: (strong = false) => {
      const v = strong ? 0.24 : 0.18;
      this._playTone({ type: 'sine', freq: 550, duration: 0.08, volume: v });
      this._playTone({ type: 'sine', freq: 880, when: 0.08, duration: 0.1, volume: v });
    },
    matchStart: () => {
      this._playTone({ type: 'square', freq: 600, duration: 0.08, volume: 0.18 });
      this._playTone({ type: 'square', freq: 900, when: 0.09, duration: 0.1, volume: 0.18 });
    },
    respawnReady: () => {
      this._playTone({ type: 'sine', freq: 1000, duration: 0.08, volume: 0.2 });
    }
  }

  onLocalAction(kind, data) {
    if (!this.enabled) return;
    if (kind === 'cast') {
      if (data?.skill === 'skill:shoot') this.sfx.shoot();
      else if (data?.skill === 'skill:shotgun') this.sfx.shotgun();
      else if (data?.skill === 'skill:rocket') this.sfx.rocketLaunch();
      else if (data?.skill === 'skill:dash') this.sfx.dash();
    } else if (kind === 'respawn') {
      this.sfx.respawnReady();
    }
  }

  onEvent(e, ctx) {
    if (!this.enabled) return;
    const me = ctx?.me;

    switch (e.type) {
      case 'projectile:spawned': {
        if (e.kind === 'bullet') this.sfx.shoot();
        else if (e.kind === 'pellet') this.sfx.shotgun();
        else if (e.kind === 'rocket') this.sfx.rocketLaunch();
        break;
      }
      case 'projectile:bounced': {
        this.sfx.bounce();
        break;
      }
      case 'explosion:spawned': {
        this.sfx.explosion();
        break;
      }
      case 'damage:applied': {
        if (e.targetId && me && e.targetId === me) this.sfx.hitMe();
        break;
      }
      case 'player:die': {
        if (e.playerId === me) this.sfx.deathMe();
        break;
      }
      case 'dash:started': {
        if (e.playerId === me) this.sfx.dash();
        break;
      }
      case 'pickup:collected': {
        if (e.by === me) this.sfx.pickup();
        break;
      }
      case 'match:started': {
        this.sfx.matchStart();
        break;
      }
      case 'hud:feed:update': {
        const items = Array.isArray(e.items) ? e.items : [];
        if (!this._feedInit) {
          // First snapshot: seed set without playing
          for (const it of items) this._seenFeedTs.add(it.timestamp);
          this._feedInit = true;
          break;
        }
        for (const it of items) {
          if (this._seenFeedTs.has(it.timestamp)) continue;
          this._seenFeedTs.add(it.timestamp);
          if (me && it.killer === me) this.sfx.killMine();
          else if (me && it.victim === me) this.sfx.gotKilled();
          else if (me && Array.isArray(it.assistIds) && it.assistIds.includes(me)) this.sfx.assist();
        }
        break;
      }
      case 'hud:announce:update': {
        const items = Array.isArray(e.items) ? e.items : [];
        if (!this._announceInit) {
          for (const it of items) this._seenAnnTs.add(it.timestamp);
          this._announceInit = true;
          break;
        }
        for (const it of items) {
          if (this._seenAnnTs.has(it.timestamp)) continue;
          this._seenAnnTs.add(it.timestamp);
          this.sfx.streakChime(me && it.playerId === me);
        }
        break;
      }
      default:
        // Ignore the rest
        break;
    }
  }
}

export const sound = new Sound();
