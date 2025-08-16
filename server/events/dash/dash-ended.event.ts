import { TDashEndedEvent } from "../../core/types/events.type";
import { BaseEvent } from "../abstract";

export class DashEndedEvent extends BaseEvent<TDashEndedEvent> {
  protected readonly type = 'dash:ended' as const;
  
  constructor(private readonly playerId: string) { 
    super(); 
  }

  toEmit(): TDashEndedEvent {
    return { 
      type: this.type, 
      playerId: this.playerId
    };
  }

  toString(): string {
    return JSON.stringify({ 
      type: this.type, 
      playerId: this.playerId
    });
  }
}
