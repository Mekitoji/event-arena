/**
 * InputManager - Single Responsibility: Handle all user input
 * Dependency Inversion: Depends on abstractions (callbacks) not concrete implementations
 */
export class InputManager {
  constructor(canvas, gameState, networkManager, sound) {
    this.canvas = canvas;
    this.gameState = gameState;
    this.network = networkManager;
    this.sound = sound;
    this.keys = new Set();
    this.lastDir = { x: 0, y: 0 };
    this.updateInterval = null;

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Keyboard events
    addEventListener('keydown', this.handleKeyDown.bind(this));
    addEventListener('keyup', this.handleKeyUp.bind(this));
    addEventListener('blur', () => this.keys.clear());
    addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') this.keys.clear();
    });

    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('contextmenu', this.handleRightClick.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
  }

  handleKeyDown(e) {
    const key = (e.key || '').toLowerCase();
    const code = e.code;

    if (key) this.keys.add(key);

    // Dash on Shift
    if (key === 'shift' || code === 'ShiftLeft' || code === 'ShiftRight') {
      this.performDash();
    }

    // Rocket (alive) or Respawn (dead) on Space
    const isSpace = code === 'Space' || key === ' ';
    if (isSpace) {
      e.preventDefault();
      e.stopPropagation();
      this.performSpaceAction();
    }
  }

  handleKeyUp(e) {
    const key = (e.key || '').toLowerCase();
    if (key) this.keys.delete(key);
  }

  handleMouseDown(e) {
    if (!this.gameState.me) return;
    const me = this.gameState.getMyPlayer();
    if (!me || me.isDead) return;

    if (e.button === 0) {
      // Left click: shoot
      this.sound.onLocalAction('cast', { skill: 'skill:shoot' });
      this.network.cast(this.gameState.me, 'skill:shoot');
    }
  }

  handleRightClick(e) {
    e.preventDefault();
    if (!this.gameState.me) return;
    const me = this.gameState.getMyPlayer();
    if (!me || me.isDead) return;

    this.sound.onLocalAction('cast', { skill: 'skill:shotgun' });
    this.network.cast(this.gameState.me, 'skill:shotgun');
  }

  handleMouseMove(ev) {
    const rect = this.canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    this.gameState.updateMousePosition(x, y);
  }

  performDash() {
    if (!this.gameState.me) return;
    const me = this.gameState.getMyPlayer();
    if (me && !me.isDead) {
      this.sound.onLocalAction('cast', { skill: 'skill:dash' });
      this.network.cast(this.gameState.me, 'skill:dash');
    }
  }

  performSpaceAction() {
    if (!this.gameState.me) return;
    const me = this.gameState.getMyPlayer();
    const isDead = !me || me.isDead;

    if (!isDead) {
      // Alive: cast rocket
      this.sound.onLocalAction('cast', { skill: 'skill:rocket' });
      this.network.cast(this.gameState.me, 'skill:rocket');
    } else {
      // Dead: try respawn
      this.network.respawn(this.gameState.me);
    }
  }

  startMovementLoop() {
    this.updateInterval = setInterval(() => {
      this.updateMovement();
      this.updateAim();
    }, 50);
  }

  updateMovement() {
    if (!this.gameState.me) return;

    const dir = { x: 0, y: 0 };
    if (this.keys.has('w')) dir.y -= 1;
    if (this.keys.has('s')) dir.y += 1;
    if (this.keys.has('a')) dir.x -= 1;
    if (this.keys.has('d')) dir.x += 1;

    if (!this.sameDir(dir, this.lastDir)) {
      this.network.move(this.gameState.me, dir);
      this.lastDir = dir;
    }
  }

  updateAim() {
    const me = this.gameState.getMyPlayer();
    if (!me) return;

    // Convert canvas coords to world vector: world = canvas * 2.2
    const toWorld = 2.2;
    const target = {
      x: this.gameState.mouse.x * toWorld,
      y: this.gameState.mouse.y * toWorld,
    };
    const aim = { x: target.x - me.pos.x, y: target.y - me.pos.y };

    if (!this.sameAim(aim, this.gameState.lastAim)) {
      this.network.aim(this.gameState.me, aim);
      this.gameState.updateLastAim(aim);
    }
  }

  sameDir(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  sameAim(a, b) {
    return Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1;
  }

  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}
