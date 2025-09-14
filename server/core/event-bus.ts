import EventEmitter from 'node:events';
import { Listener, TEvent } from './types';

class EventBus {
  private readonly ee = new EventEmitter({ captureRejections: true });

  constructor() {
    // Increase max listeners to avoid warning with multiple systems
    this.ee.setMaxListeners(20);
  }

  emit<T extends TEvent>(e: T) {
    this.ee.emit(e.type, e);
  }
  on<T extends TEvent>(type: T['type'], fn: Listener<T>) {
    this.ee.on(type, fn);
  }
  off<T extends TEvent>(type: T['type'], fn: Listener<T>) {
    this.ee.off(type, fn);
  }
}

export const eventBus = new EventBus();
