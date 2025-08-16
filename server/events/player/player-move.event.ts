import { TPlayerMoveEvent } from "../../core/types/events.type";
import { Vec2 } from "../../core/types/vec2.type";
import { BaseEvent } from "../abstract";

export class PlayerMovedEvent extends BaseEvent<TPlayerMoveEvent> {
  protected readonly type = 'player:move';
  constructor(private readonly playerId: string, private readonly pos: Vec2, private readonly dir?: Vec2) { super() }

  toEmit(): TPlayerMoveEvent {
    return this.dir ? { type: this.type, playerId: this.playerId, pos: this.pos, dir: this.dir } : { type: this.type, playerId: this.playerId, pos: this.pos };
  }

  toString(): string {
    return JSON.stringify(this.toEmit());
  }
}

