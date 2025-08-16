import { eventBus } from "./event-bus";
import { TickPreEvent, TickPostEvent } from "../events";

/**
 * Clock class that drives the server tick loop.
 * - Emits `tick:pre` and `tick:post` events with a `dt` (seconds) payload.
 * - Caps `dt` at 0.1s to avoid large time steps.
 * - Provides start/stop controls for better encapsulation and testability.
 */
class Clock {
  private prev = Date.now();
  private running = false;
  private handle: NodeJS.Timeout | null = null;
  private readonly TPS = 30;
  private readonly TICK_MS = 1000 / this.TPS;

  // Use an arrow function to preserve `this` when scheduled via setImmediate
  private frame = () => {
    const now = Date.now();
    const dt = Math.min((now - this.prev) / 1000, 0.1);
    this.prev = now;

    // Emit tick lifecycle events
    eventBus.emit(new TickPreEvent(dt).toEmit());
    eventBus.emit(new TickPostEvent(dt).toEmit());

    if (!this.running) return;
  };

  /** Start the loop if not already running. */
  start() {
    if (this.running) return;
    this.running = true;
    this.prev = Date.now();
    this.handle = setInterval(this.frame, this.TICK_MS);
  }

  /** Stop the loop. Any pending immediate is cleared. */
  stop() {
    this.running = false;
    if (this.handle) {
      clearInterval(this.handle);
      this.handle = null;
    }
  }
}

// Singleton clock instance for convenience and backward compatibility
export const clock = new Clock();
