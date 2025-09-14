import { TCmdAimEvent } from '../../core/types/events.type';
import { Vec2 } from '../../core/types/vec2.type';
import { BaseEvent } from '../abstract';

export class PlayerAimCmdEvent extends BaseEvent<TCmdAimEvent> {
  protected readonly type = 'cmd:aim' as const;

  constructor(
    private readonly playerId: string,
    private readonly dir: Vec2,
  ) {
    super();
  }

  toEmit(): TCmdAimEvent {
    return {
      type: this.type,
      playerId: this.playerId,
      dir: this.dir,
    };
  }

  toString(): string {
    return JSON.stringify({
      type: this.type,
      playerId: this.playerId,
      dir: this.dir,
    });
  }
}
