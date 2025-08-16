import { TKillEvent } from "../../core/types/events.type";
import { BaseEvent } from "../abstract";

export class PlayerKillEvent extends BaseEvent<TKillEvent> {
  protected readonly type = 'player:kill' as const;
  
  constructor(
    private readonly killerId: string,
    private readonly victimId: string,
    private readonly assistIds?: string[]
  ) { 
    super(); 
  }

  toEmit(): TKillEvent {
    return { 
      type: this.type, 
      killerId: this.killerId,
      victimId: this.victimId,
      assistIds: this.assistIds
    };
  }

  toString(): string {
    return JSON.stringify({ 
      type: this.type, 
      killerId: this.killerId,
      victimId: this.victimId,
      assistIds: this.assistIds
    });
  }
}
