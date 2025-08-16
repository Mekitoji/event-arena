import { TExplosionSpawnedEvent } from "../../core/types/events.type";
import { Vec2 } from "../../core/types/vec2.type";
import { BaseEvent } from "../abstract";

export class ExplosionSpawnedEvent extends BaseEvent<TExplosionSpawnedEvent> {
  protected readonly type = 'explosion:spawned' as const;
  
  constructor(
    private readonly pos: Vec2,
    private readonly radius: number,
    private readonly dmg: number
  ) { 
    super(); 
  }

  toEmit(): TExplosionSpawnedEvent {
    return { 
      type: this.type, 
      pos: this.pos,
      radius: this.radius,
      dmg: this.dmg
    };
  }

  toString(): string {
    return JSON.stringify({ 
      type: this.type, 
      pos: this.pos,
      radius: this.radius,
      dmg: this.dmg
    });
  }
}
