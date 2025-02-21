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

export class KeySessionCreatedEvent extends PlayerEvent {
  public readonly type = PlayerEventType.KeySessionCreated;
  public readonly sessionId: string;

  public constructor(sessionId: string) {
    super();
    this.sessionId = sessionId;
  }
}

export class KeySessionUpdatedEvent extends PlayerEvent {
  public readonly type = PlayerEventType.KeySessionUpdated;
  public readonly sessionId: string;
  public readonly messageType: string;

  public constructor(sessionId: string, messageType: string) {
    super();
    this.sessionId = sessionId;
    this.messageType = messageType;
  }
}

export class KeySystemAccessRequestedEvent extends PlayerEvent {
  public readonly type = PlayerEventType.KeySystemAccessRequested;
  public readonly keySystem: string;

  public constructor(keySystem: string) {
    super();
    this.keySystem = keySystem;
  }
}

export class KeySessionClosedEvent extends PlayerEvent {
  public readonly type = PlayerEventType.KeySessionClosed;
  public readonly sessionId: string;

  public constructor(sessionId: string) {
    super();
    this.sessionId = sessionId;
  }
}

export class KeyStatusesUpdatedEvent extends PlayerEvent {
  public readonly type = PlayerEventType.KeyStatusesUpdated;
  public readonly keyStatusMap: Map<string, string>;

  public constructor(keyStatusMap: Map<string, string>) {
    super();
    this.keyStatusMap = keyStatusMap;
  }
}
