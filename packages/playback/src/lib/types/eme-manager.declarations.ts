import type { INetworkManager } from './network.declarations';
import type { ILogger } from './logger.declarations';
import type { IPlayerSource } from './source.declarations';
import { IEventEmitter } from './event-emitter.declarations';
import { PrivateEventTypeToEventMap } from './mappers/event-type-to-event-map.declarations';

export interface IEmeManagerDependencies {
  networkManager: INetworkManager;
  logger: ILogger;
  privateEventEmitter: IEventEmitter<PrivateEventTypeToEventMap>;
}

export interface IEmeManager {
  attach(videoElement: HTMLVideoElement): void;
  detach(): void;
  dispose(): void;
  stop(): void;
  setSource(source: IPlayerSource): void;
  handleWaitingForKey(): void;
  setInitData(type: string, data: ArrayBuffer): void;
}

export interface IEmeApiAdapter {
  // TODO: implement this adapter type
  id: string;
}

export interface IKeySessionMetadata {
  loaded: boolean;
  initData: Uint8Array;
  initDataType?: string;
  session: MediaKeySession;
  type?: string;
  // oldExpiration? - The expiration of the session on the last check.  This is used to fire  an event when it changes.
  // updatePromise? - An optional Promise that will be resolved/rejected on the next update()
  // call.  This is used to track the 'license-release' message when calling
  // remove().
}
