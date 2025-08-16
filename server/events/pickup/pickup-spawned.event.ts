import { TPickupSpawnedEvent } from "../../core/types/events.type";
import { Vec2 } from "../../core/types/vec2.type";
import { BaseEvent } from "../abstract";

export class PickupSpawnedEvent extends BaseEvent<TPickupSpawnedEvent> {
  protected readonly type = 'pickup:spawned' as const;
  
  constructor(
    private readonly id: string,
    private readonly pos: Vec2,
    private readonly kind: 'heal' | 'haste' | 'shield'
  ) { 
    super(); 
  }

  toEmit(): TPickupSpawnedEvent {
    return { 
      type: this.type, 
      id: this.id,
      pos: this.pos,
      kind: this.kind
    };
  }

  toString(): string {
    return JSON.stringify({ 
      type: this.type, 
      id: this.id,
      pos: this.pos,
      kind: this.kind
    });
  }
}
