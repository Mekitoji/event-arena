/**
 * NetworkManager - Single Responsibility: Handle all network communication
 * Follows Open/Closed Principle: Can extend with new command types without modification
 */
export class NetworkManager {
  constructor(host = location.hostname, port = 8081) {
    this.ws = null;
    this.host = host;
    this.port = port;
    this.eventHandlers = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`ws://${this.host}:${this.port}`);

      this.ws.addEventListener('open', () => {
        resolve();
      });

      this.ws.addEventListener('error', (error) => {
        reject(error);
      });

      this.ws.addEventListener('message', (ev) => {
        try {
          const event = JSON.parse(ev.data);
          this.handleEvent(event);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      });
    });
  }

  on(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType).push(handler);
  }

  off(eventType, handler) {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  handleEvent(event) {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach((handler) => handler(event));
    }

    // Also trigger wildcard handlers
    const wildcardHandlers = this.eventHandlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach((handler) => handler(event));
    }
  }

  send(type, data = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected');
      return;
    }

    this.ws.send(JSON.stringify({ type, ...data }));
  }

  // Command methods
  subscribeToHUD(
    widgets = ['scoreboard', 'match', 'feed', 'streaks', 'announcements'],
  ) {
    this.send('cmd:hud:subscribe', { widgets });
  }

  join(name, matchId) {
    this.send('cmd:join', { name, matchId });
  }

  move(playerId, dir) {
    this.send('cmd:move', { playerId, dir });
  }

  aim(playerId, dir) {
    this.send('cmd:aim', { playerId, dir });
  }

  cast(playerId, skill) {
    this.send('cmd:cast', { playerId, skill });
  }

  respawn(playerId) {
    this.send('cmd:respawn', { playerId });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
