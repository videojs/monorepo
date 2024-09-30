import type { IPipeline, PipelineDependencies } from '../types/pipeline.declarations';
import { PlayerTimeRange } from '../models/player-time-range';
import type { PlaybackState } from '../consts/playback-state';
import type { IPlaybackStats } from '../types/playback-stats.declarations';
import type { INetworkManager } from '../types/network.declarations';
import type { IQualityLevel } from '../types/quality-level.declarations';
import type { IPlayerTimeRange } from '../types/player-time-range.declarations';
import type { IPlayerAudioTrack } from '../types/audio-track.declarations';
import type { ILogger } from '../types/logger.declarations';
import type { IPlayerTextTrack } from '../types/text-track.declarations';
import type { IPlayerThumbnailTrack, IRemoteVttThumbnailTrackOptions } from '../types/thumbnail-track.declarations';

export abstract class BasePipeline implements IPipeline {
  protected readonly videoElement_: HTMLVideoElement;
  protected readonly networkManager_: INetworkManager;
  protected readonly logger_: ILogger;

  public constructor(dependencies: PipelineDependencies) {
    this.videoElement_ = dependencies.videoElement;
    this.networkManager_ = dependencies.networkManager;
    this.logger_ = dependencies.logger;
  }

  public abstract dispose(): void;

  public abstract getAudioTracks(): Array<IPlayerAudioTrack>;

  public abstract selectAudioTrack(id: string): boolean;

  public abstract getQualityLevels(): Array<IQualityLevel>;

  public abstract selectQualityLevel(): boolean;

  public abstract selectAutoQualityLevel(): boolean;

  public abstract getTextTracks(): Array<IPlayerTextTrack>;

  public abstract removeRemoteThumbnailTrack(id: string): boolean;

  public abstract addRemoteVttThumbnailTrack(options: IRemoteVttThumbnailTrackOptions): boolean;

  public abstract selectThumbnailTrack(id: string): boolean;

  public abstract getThumbnailTracks(): Array<IPlayerThumbnailTrack>;

  public abstract getPlaybackState(): PlaybackState;

  public getPlaybackStats(): IPlaybackStats {
    return this.videoElement_.getVideoPlaybackQuality();
  }
  public getCurrentTime(): number {
    return this.videoElement_.currentTime;
  }

  public getDuration(): number {
    return this.videoElement_.duration;
  }

  public getSeekableRanges(): Array<IPlayerTimeRange> {
    return PlayerTimeRange.fromTimeRanges(this.videoElement_.seekable);
  }

  public getBufferedRanges(): Array<IPlayerTimeRange> {
    return PlayerTimeRange.fromTimeRanges(this.videoElement_.buffered);
  }

  public getPlaybackRate(): number {
    return this.videoElement_.playbackRate;
  }

  public setPlaybackRate(playbackRate: number): void {
    this.videoElement_.playbackRate = playbackRate;
  }

  public getVolumeLevel(): number {
    return this.videoElement_.volume;
  }

  public setVolumeLevel(volumeLevel: number): void {
    this.videoElement_.volume = volumeLevel;
  }

  public mute(): void {
    this.videoElement_.muted = true;
  }

  public unmute(): void {
    this.videoElement_.muted = false;
  }

  public getIsMuted(): boolean {
    return this.videoElement_.muted;
  }

  public pause(): void {
    this.videoElement_.pause();
  }

  public play(): void {
    void this.videoElement_.play();
  }

  public seek(seekTarget: number): boolean {
    this.videoElement_.currentTime = seekTarget;

    return true;
  }
}
