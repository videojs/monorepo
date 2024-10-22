import type { PlaybackState } from '../consts/playback-state';
import type { IPlaybackStats } from './playback-stats.declarations';
import type { ILogger } from './logger.declarations';
import type { INetworkManager } from './network.declarations';
import type { IQualityLevel } from './quality-level.declarations';
import type { IPlayerTimeRange } from './player-time-range.declarations';
import type { IPlayerAudioTrack } from './audio-track.declarations';
import type { IPlayerTextTrack } from './text-track.declarations';
import type { IPlayerThumbnailTrack, IRemoteVttThumbnailTrackOptions } from './thumbnail-track.declarations';
import type { IPlayerSource } from './source.declarations';

export interface IPipelineDependencies {
  videoElement: HTMLVideoElement;
  networkManager: INetworkManager;
  logger: ILogger;
  source: IPlayerSource;
}

export interface IPipelineFactory {
  create(deps: IPipelineDependencies): IPipeline;
}

export interface IPipelineLoader {
  load(): Promise<IPipeline>;
  abort(): void;
}

export interface IPipelineLoaderDependencies extends IPipelineDependencies {
  vodFactory?: IPipelineFactory;
  liveFactory?: IPipelineFactory;
}

export interface IPipelineLoaderFactory {
  create(deps: IPipelineLoaderDependencies): IPipelineLoader;
}

export interface IPipelineFactoryConfiguration {
  loader: IPipelineLoaderFactory;
  alias: string;
}

export interface IPipeline {
  play(): void;
  pause(): void;
  getPlaybackState(): PlaybackState;
  seek(seekTarget: number): boolean;
  getSeekableRanges(): Array<IPlayerTimeRange>;
  getBufferedRanges(): Array<IPlayerTimeRange>;
  getDuration(): number;
  getPlaybackStats(): IPlaybackStats;
  dispose(): void;
  getAudioTracks(): Array<IPlayerAudioTrack>;
  selectAudioTrack(id: string): boolean;
  getTextTracks(): Array<IPlayerTextTrack>;
  removeRemoteThumbnailTrack(id: string): boolean;
  addRemoteVttThumbnailTrack(options: IRemoteVttThumbnailTrackOptions): boolean;
  selectThumbnailTrack(id: string): boolean;
  getThumbnailTracks(): Array<IPlayerThumbnailTrack>;
  getQualityLevels(): Array<IQualityLevel>;
  selectQualityLevel(id: string): boolean;
  selectAutoQualityLevel(): boolean;
  start(): void;
}
