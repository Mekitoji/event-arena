import { TCmdCastEvent } from '../../core/types/events.type';
import { ESkills } from '../../core/types/cmd.type';
import { BaseEvent } from '../abstract';

export class PlayerCastCmdEvent extends BaseEvent<TCmdCastEvent> {
  protected readonly type = 'cmd:cast' as const;

  constructor(
    private readonly playerId: string,
    private readonly skill: ESkills,
  ) {
    super();
  }

  toEmit(): TCmdCastEvent {
    return {
      type: this.type,
      playerId: this.playerId,
      skill: this.skill,
    };
  }

  toString(): string {
    return JSON.stringify({
      type: this.type,
      playerId: this.playerId,
      skill: this.skill,
    });
  }
}
