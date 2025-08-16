import { TPlayerAimedEvent } from "../../core/types/events.type";
import { Vec2 } from "../../core/types/vec2.type";
import { BaseEvent } from "../abstract";

export class PlayerAimedEvent extends BaseEvent<TPlayerAimedEvent> {
  protected readonly type = 'player:aimed';
  constructor(private readonly playerId: string, private readonly dir: Vec2) { super() }

  toEmit(): TPlayerAimedEvent {
    return { type: this.type, playerId: this.playerId, dir: this.dir };
  }

  toString(): string {
    return JSON.stringify(this.toEmit());
  }
}
