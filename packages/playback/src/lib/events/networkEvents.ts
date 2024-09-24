import { PlayerEvent } from './basePlayerEvent';
import { PlayerEventType } from '../consts/events';
import type { NetworkRequestInfo, NetworkResponseInfo } from '../types/network.declarations';

export class NetworkRequestStartedEvent extends PlayerEvent {
  public readonly type = PlayerEventType.NetworkRequestStarted;
  public readonly networkRequestInfo: NetworkRequestInfo;

  public constructor(info: NetworkRequestInfo) {
    super();
    this.networkRequestInfo = info;
  }
}

export class NetworkResponseCompletedSuccessfullyEvent extends PlayerEvent {
  public readonly type = PlayerEventType.NetworkResponseCompletedSuccessfully;
  public readonly networkRequestInfo: NetworkRequestInfo;
  public readonly networkResponseInfo: NetworkResponseInfo;

  public constructor(requestInfo: NetworkRequestInfo, responseInfo: NetworkResponseInfo) {
    super();
    this.networkRequestInfo = requestInfo;
    this.networkResponseInfo = responseInfo;
  }
}

export class NetworkResponseCompletedUnsuccessfullyEvent extends PlayerEvent {
  public readonly type = PlayerEventType.NetworkResponseCompletedUnsuccessfully;
  public readonly networkRequestInfo: NetworkRequestInfo;
  public readonly networkResponseInfo: NetworkResponseInfo;

  public constructor(requestInfo: NetworkRequestInfo, responseInfo: NetworkResponseInfo) {
    super();
    this.networkRequestInfo = requestInfo;
    this.networkResponseInfo = responseInfo;
  }
}

export class NetworkRequestFailedEvent extends PlayerEvent {
  public readonly type = PlayerEventType.NetworkRequestFailed;
  public readonly networkRequestInfo: NetworkRequestInfo;
  public readonly error: Error;

  public constructor(requestInfo: NetworkRequestInfo, error: Error) {
    super();
    this.networkRequestInfo = requestInfo;
    this.error = error;
  }
}
