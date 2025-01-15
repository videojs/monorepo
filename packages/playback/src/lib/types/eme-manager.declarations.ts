import type { INetworkManager } from './network.declarations';
import type { ILogger } from './logger.declarations';
import type { IPlayerSource } from './source.declarations';

export interface IEmeManagerDependencies {
  networkManager: INetworkManager;
  logger: ILogger;
}

export interface IEmeManager {
  attach(videoElement: HTMLVideoElement): void;
  detach(): void;
  dispose(): void;
  getSupportedCDMs(): Array<string>;
  stop(): void;
  setSource(source: IPlayerSource): void;
  handleWaitingForKey(): void;
  setInitData(type: string, data: ArrayBuffer): void;
}
