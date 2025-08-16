import { TDamageAppliedEvent } from "../../core/types/events.type";
import { BaseEvent } from "../abstract";

export class DamageAppliedEvent extends BaseEvent<TDamageAppliedEvent> {
  protected readonly type = 'damage:applied';

  constructor(
    private readonly targetId: string,
    private readonly amount: number,
    private readonly source?: string,
    private readonly weapon?: 'bullet' | 'pellet' | 'rocket' | 'explosion',
  ) { super() }

  toEmit(): TDamageAppliedEvent {
    return { type: this.type, targetId: this.targetId, amount: this.amount, source: this.source, weapon: this.weapon };
  }

  toString(): string {
    return JSON.stringify({ type: this.type, targetId: this.targetId, amount: this.amount, source: this.source, weapon: this.weapon });
  }
}

