import { TProjectileDespawnedEvent } from "../../core/types/events.type";
import { BaseEvent } from "../abstract";

export class ProjectileDespawnedEvent extends BaseEvent<TProjectileDespawnedEvent> {
  protected readonly type = 'projectile:despawned';
  constructor(
    private readonly id: string,
  ) { super() }

  toEmit(): TProjectileDespawnedEvent {
    return { type: this.type, id: this.id };
  }

  toString(): string {
    return JSON.stringify({ type: this.type, id: this.id });
  }
}

