import type NetworkManager from '../network/networkManager';
import type Logger from '../utils/logger';
import type { PlayerConfiguration } from '../types/configuration';
import type {
  PlayerAudioTrack,
  PlayerImageTrack,
  PlayerStats,
  PlayerTextTrack,
  PlayerVideoTrack,
} from '../types/player';

export interface PipelineDependencies {
  logger: Logger;
  networkManager: NetworkManager;
  playerConfiguration: PlayerConfiguration;
}

export abstract class Pipeline {
  protected readonly logger_: Logger;
  protected readonly networkManager_: NetworkManager;

  protected playerConfiguration_: PlayerConfiguration;

  protected constructor(dependencies: PipelineDependencies) {
    this.logger_ = dependencies.logger;
    this.networkManager_ = dependencies.networkManager;
    this.playerConfiguration_ = dependencies.playerConfiguration;
  }

  public updateConfiguration(playerConfiguration: PlayerConfiguration): void {
    this.playerConfiguration_ = playerConfiguration;
  }

  public abstract selectTextTrack(textTrack: PlayerTextTrack): void;

  public abstract selectAudioTrack(audioTrack: PlayerAudioTrack): void;

  public abstract selectImageTrack(imageTrack: PlayerImageTrack): void;

  public abstract selectVideoTrack(videoTrack: PlayerVideoTrack): void;

  public abstract getTextTracks(): Array<PlayerTextTrack>;

  public abstract getAudioTracks(): Array<PlayerAudioTrack>;

  public abstract getImageTracks(): Array<PlayerImageTrack>;

  public abstract getVideoTracks(): Array<PlayerVideoTrack>;

  public abstract getStats(): PlayerStats;

  public abstract dispose(): void;

  public abstract loadRemoteAsset(uri: URL): void;

  public abstract loadLocalAsset(asset: string | ArrayBuffer, baseUrl: string): void;
}
