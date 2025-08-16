import { TTickPreEvent } from "../../core/types/events.type";
import { BaseEvent } from "../abstract";

export class TickPreEvent extends BaseEvent<TTickPreEvent> {
  protected readonly type = 'tick:pre';
  constructor(private readonly dt: number) { super() }

  toEmit(): TTickPreEvent {
    return { type: this.type, dt: this.dt };
  }

  toString(): string {
    return JSON.stringify({ type: this.type, dt: this.dt });
  }
}

