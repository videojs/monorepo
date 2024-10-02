import { PlayerEvent } from './base-player-event';
import { PlayerEventType } from '../consts/events';
import type { INetworkRequestInfo, INetworkResponseInfo } from '../types/network.declarations';

export class NetworkRequestAttemptStartedEvent extends PlayerEvent {
  public readonly type = PlayerEventType.NetworkRequestAttemptStarted;
  public readonly networkRequestInfo: INetworkRequestInfo;

  public constructor(info: INetworkRequestInfo) {
    super();
    this.networkRequestInfo = info;
  }
}

export class NetworkRequestAttemptCompletedSuccessfullyEvent extends PlayerEvent {
  public readonly type = PlayerEventType.NetworkRequestAttemptCompletedSuccessfully;
  public readonly networkRequestInfo: INetworkRequestInfo;
  public readonly networkResponseInfo: INetworkResponseInfo;

  public constructor(requestInfo: INetworkRequestInfo, responseInfo: INetworkResponseInfo) {
    super();
    this.networkRequestInfo = requestInfo;
    this.networkResponseInfo = responseInfo;
  }
}

export class NetworkRequestAttemptCompletedUnsuccessfullyEvent extends PlayerEvent {
  public readonly type = PlayerEventType.NetworkRequestAttemptCompletedUnsuccessfully;
  public readonly networkRequestInfo: INetworkRequestInfo;
  public readonly networkResponseInfo: INetworkResponseInfo;

  public constructor(requestInfo: INetworkRequestInfo, responseInfo: INetworkResponseInfo) {
    super();
    this.networkRequestInfo = requestInfo;
    this.networkResponseInfo = responseInfo;
  }
}

export class NetworkRequestAttemptFailedEvent extends PlayerEvent {
  public readonly type = PlayerEventType.NetworkRequestAttemptFailed;
  public readonly networkRequestInfo: INetworkRequestInfo;
  public readonly error: Error;

  public constructor(requestInfo: INetworkRequestInfo, error: Error) {
    super();
    this.networkRequestInfo = requestInfo;
    this.error = error;
  }
}
