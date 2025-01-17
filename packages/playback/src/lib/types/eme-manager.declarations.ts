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

export interface IKeySystemConfiguration {
  label?: string;
  initDataTypes?: Array<string>;
  audioCapabilities?: Array<MediaKeySystemMediaCapability>;
  videoCapabilities?: Array<MediaKeySystemMediaCapability>;
  distinctiveIdentifier?: MediaKeysRequirement;
  persistentState?: MediaKeysRequirement;
  sessionTypes?: Array<string>;
}
