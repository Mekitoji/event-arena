import { TEvent } from '../../core/types';
import { SourceEventType } from '../../core/types/events.type';

export abstract class BaseEvent<T extends TEvent> {
  protected abstract readonly type: SourceEventType;

  public abstract toEmit(): T;
  public abstract toString(): string;
}
