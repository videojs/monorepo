import { PlayerEventType } from '../consts/events';
import { PlayerEvent } from './base-player-event';

export class EncryptedEvent extends PlayerEvent {
  public readonly type = PlayerEventType.Encrypted;
  public readonly initData: ArrayBuffer;
  public readonly initDataType: string;

  public constructor(initData: ArrayBuffer, initDataType: string) {
    super();
    this.initData = initData;
    this.initDataType = initDataType;
  }
}

export class WaitingForKeyEvent extends PlayerEvent {
  public readonly type = PlayerEventType.WaitingForKey;
}
