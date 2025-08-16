import { TCmdLeaveEvent } from "../../core/types/events.type";
import { BaseEvent } from "../abstract";

export class PlayerLeaveCmdEvent extends BaseEvent<TCmdLeaveEvent> {
  protected readonly type = 'cmd:leave' as const;
  
  constructor(private readonly playerId: string) { 
    super(); 
  }

  toEmit(): TCmdLeaveEvent {
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
