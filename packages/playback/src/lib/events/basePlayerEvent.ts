import type { PlayerEventType } from '../consts/events';

export abstract class PlayerEvent {
  public abstract readonly type: PlayerEventType;
}
