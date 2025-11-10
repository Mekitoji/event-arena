import { sound } from './sound/sound.js';
import { setupSoundUI } from './sound/sound-ui.js';
import { GameState } from './game-state.js';
import { NetworkManager } from './managers/network-manager.js';
import { InputManager } from './managers/input-manager.js';
import { RenderManager } from './managers/render-manager.js';
import { EventHandler } from './event-handler.js';

/**
 * Main Game Client - Dependency Injection & Composition
 * Wires together all components using SOLID principles
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Each class has one reason to change
 * - Open/Closed: Easy to extend without modifying existing code
 * - Liskov Substitution: Renderers follow base contract
 * - Interface Segregation: Small, focused interfaces
 * - Dependency Inversion: Depends on abstractions (event handlers, callbacks)
 */
class GameClient {
  constructor() {
    this.canvas = document.getElementById('cv');
    this.gameState = new GameState();
    this.network = new NetworkManager();
    this.eventHandler = new EventHandler(this.gameState, sound);
    this.inputManager = new InputManager(
      this.canvas,
      this.gameState,
      this.network,
      sound,
    );
    this.renderManager = new RenderManager(this.canvas, this.gameState);

    // Setup audio
    addEventListener('pointerdown', sound.unlock, { passive: true });
    addEventListener('keydown', sound.unlock, { passive: true });
    setupSoundUI(sound);
  }

  async initialize() {
    // Setup network event handling
    this.network.on('*', (event) => this.eventHandler.handle(event));

    // Connect to server
    await this.network.connect();

    // Subscribe to HUD and join game
    this.network.subscribeToHUD();
    this.network.join(
      'Player' + Math.floor(Math.random() * 1000),
      this.gameState.match.id ?? undefined,
    );

    // Start input loop and rendering
    this.inputManager.startMovementLoop();
    this.renderManager.start();
  }

  shutdown() {
    this.inputManager.destroy();
    this.renderManager.stop();
    this.network.disconnect();
  }
}

// Initialize and start the game
const game = new GameClient();
game.initialize().catch((error) => {
  console.error('Failed to initialize game:', error);
});
