import type { IPipeline, PipelineDependencies } from '../types/pipeline.declarations';
import type { IAudioTrack, ITextTrack } from '../types/tracks.declarations';
import type PlayerTimeRange from '../utils/timeRanges';
import type { PlaybackState } from '../consts/playbackState';
import type { PlaybackStats } from '../types/playbackStats.declarations';

export abstract class Pipeline implements IPipeline {
  protected readonly videoElement_: HTMLVideoElement;

  public constructor(dependencies: PipelineDependencies) {
    this.videoElement_ = dependencies.videoElement;
  }

  public abstract dispose(): void;

  public abstract getAudioTracks(): Array<IAudioTrack>;

  public abstract getBufferedRanges(): Array<PlayerTimeRange>;

  public getCurrentTime(): number {
    return this.videoElement_.currentTime;
  }

  public abstract getDuration(): number;

  public getIsMuted(): boolean {
    return this.videoElement_.muted;
  }

  public getPlaybackRate(): number {
    return this.videoElement_.playbackRate;
  }

  public abstract getPlaybackState(): PlaybackState;

  public abstract getPlaybackStats(): PlaybackStats;

  public abstract getSeekableRanges(): Array<PlayerTimeRange>;

  public abstract getTextTracks(): Array<ITextTrack>;

  public getVolumeLevel(): number {
    return this.videoElement_.volume;
  }

  public mute(): void {
    this.videoElement_.muted = true;
  }

  public unmute(): void {
    this.videoElement_.muted = false;
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

  public abstract selectAudioTrack(id: string): boolean;

  public setPlaybackRate(playbackRate: number): void {
    this.videoElement_.playbackRate = playbackRate;
  }

  public setVolumeLevel(volumeLevel: number): void {
    this.videoElement_.volume = volumeLevel;
  }
}
