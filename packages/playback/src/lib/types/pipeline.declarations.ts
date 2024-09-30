import type { PlaybackState } from '../consts/playback-state';
import type { IPlaybackStats } from './playback-stats.declarations';
import type { ILogger } from './logger.declarations';
import type { INetworkManager } from './network.declarations';
import type { IQualityLevel } from './quality-level.declarations';
import type { IPlayerTimeRange } from './player-time-range.declarations';
import type { IPlayerAudioTrack } from './audio-track.declarations';
import type { IPlayerTextTrack } from './text-track.declarations';
import type { IPlayerThumbnailTrack, IRemoteVttThumbnailTrackOptions } from './thumbnail-track.declarations';

export interface PipelineDependencies {
  videoElement: HTMLVideoElement;
  networkManager: INetworkManager;
  logger: ILogger;
}

export interface IPipelineFactory {
  create(deps: PipelineDependencies): Promise<IPipeline>;
}

export interface IPipeline {
  play(): void;
  pause(): void;
  getPlaybackState(): PlaybackState;
  mute(): void;
  unmute(): void;
  getIsMuted(): boolean;
  seek(seekTarget: number): boolean;
  getCurrentTime(): number;
  getVolumeLevel(): number;
  setVolumeLevel(volumeLevel: number): void;
  getPlaybackRate(): number;
  setPlaybackRate(playbackRate: number): void;
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
}
