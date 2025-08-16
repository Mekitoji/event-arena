import { TStreakEvent } from "../../core/types/events.type";
import { BaseEvent } from "../abstract";

export class StreakChangedEvent extends BaseEvent<TStreakEvent> {
  protected readonly type = 'streak:changed' as const;
  
  constructor(
    private readonly playerId: string,
    private readonly streak: number,
    private readonly previousStreak: number
  ) { 
    super(); 
  }

  toEmit(): TStreakEvent {
    return { 
      type: this.type, 
      playerId: this.playerId,
      streak: this.streak,
      previousStreak: this.previousStreak
    };
  }

  toString(): string {
    return JSON.stringify({ 
      type: this.type, 
      playerId: this.playerId,
      streak: this.streak,
      previousStreak: this.previousStreak
    });
  }
}
