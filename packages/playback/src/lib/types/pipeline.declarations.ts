import type { PlaybackState } from '../consts/playbackState';
import type { PlaybackStats } from './playbackStats.declarations';
import type { ILogger } from './logger.declarations';
import type { INetworkManager } from './network.declarations';
import type { IPlayerTimeRange } from './playerTimeRange.declarations';
import type { IPlayerAudioTrack } from './audioTrack.declarations';

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
  getPlaybackStats(): PlaybackStats;
  dispose(): void;
  getAudioTracks(): Array<IPlayerAudioTrack>;
  selectAudioTrack(id: string): boolean;
  getTextTracks(): Array<ITextTrack>;
}
