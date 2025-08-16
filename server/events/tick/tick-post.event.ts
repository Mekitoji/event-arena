import { TTickPostEvent } from "../../core/types/events.type";
import { BaseEvent } from "../abstract";

export class TickPostEvent extends BaseEvent<TTickPostEvent> {
  protected readonly type = 'tick:post';
  constructor(private readonly dt: number) { super() }

  toEmit(): TTickPostEvent {
    return { type: this.type, dt: this.dt };
  }

  toString(): string {
    return JSON.stringify({ type: this.type, dt: this.dt });
  }
}

