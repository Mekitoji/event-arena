import { TCmdRespawnEvent } from "../../core/types/events.type";
import { BaseEvent } from "../abstract";

export class PlayerRespawnCmdEvent extends BaseEvent<TCmdRespawnEvent> {
  protected readonly type = 'cmd:respawn' as const;
  
  constructor(private readonly playerId: string) { 
    super(); 
  }

  toEmit(): TCmdRespawnEvent {
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
