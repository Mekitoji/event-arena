import { TDashStartedEvent } from "../../core/types/events.type";
import { BaseEvent } from "../abstract";

export class DashStartedEvent extends BaseEvent<TDashStartedEvent> {
  protected readonly type = 'dash:started' as const;
  
  constructor(
    private readonly playerId: string,
    private readonly duration: number,
    private readonly iframes: boolean
  ) { 
    super(); 
  }

  toEmit(): TDashStartedEvent {
    return { 
      type: this.type, 
      playerId: this.playerId,
      duration: this.duration,
      iframes: this.iframes
    };
  }

  toString(): string {
    return JSON.stringify({ 
      type: this.type, 
      playerId: this.playerId,
      duration: this.duration,
      iframes: this.iframes
    });
  }
}
