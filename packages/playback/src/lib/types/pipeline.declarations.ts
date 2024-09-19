import type PlayerTimeRange from '../utils/timeRanges';
import type { PlaybackState } from '../consts/playbackState';
import type { PlaybackStats } from './playbackStats.declarations';
import type { IAudioTrack, ITextTrack } from './tracks.declarations';
import type { ILogger } from './logger.declarations';

export interface PipelineDependencies {
  videoElement: HTMLVideoElement;
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
  getSeekableRanges(): Array<PlayerTimeRange>;
  getBufferedRanges(): Array<PlayerTimeRange>;
  getDuration(): number;
  getPlaybackStats(): PlaybackStats;
  dispose(): void;
  getAudioTracks(): Array<IAudioTrack>;
  selectAudioTrack(id: string): boolean;
  getTextTracks(): Array<ITextTrack>;
}
