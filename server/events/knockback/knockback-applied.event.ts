import { TKnockbackAppliedEvent } from "../../core/types/events.type";
import { Vec2 } from "../../core/types/vec2.type";
import { BaseEvent } from "../abstract";

export class KnockbackAppliedEvent extends BaseEvent<TKnockbackAppliedEvent> {
  protected readonly type = 'knockback:applied' as const;
  
  constructor(
    private readonly targetId: string,
    private readonly vec: Vec2,
    private readonly power: number,
    private readonly source?: string
  ) { 
    super(); 
  }

  toEmit(): TKnockbackAppliedEvent {
    return { 
      type: this.type, 
      targetId: this.targetId,
      vec: this.vec,
      power: this.power,
      source: this.source
    };
  }

  toString(): string {
    return JSON.stringify({ 
      type: this.type, 
      targetId: this.targetId,
      vec: this.vec,
      power: this.power,
      source: this.source
    });
  }
}
