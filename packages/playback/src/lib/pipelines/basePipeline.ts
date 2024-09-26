import type { IPipeline, PipelineDependencies } from '../types/pipeline.declarations';
import type { IAudioTrack, ITextTrack } from '../types/tracks.declarations';
import type { PlaybackState } from '../consts/playbackState';
import type { PlaybackStats } from '../types/playbackStats.declarations';
import type { INetworkManager } from '../types/network.declarations';
import type { IPlayerTimeRange } from '../types/playerTimeRange.declarations';

export abstract class BasePipeline implements IPipeline {
  protected readonly videoElement_: HTMLVideoElement;
  protected readonly networkManager_: INetworkManager;

  public constructor(dependencies: PipelineDependencies) {
    this.videoElement_ = dependencies.videoElement;
    this.networkManager_ = dependencies.networkManager;
  }

  public abstract dispose(): void;

  public abstract getAudioTracks(): Array<IAudioTrack>;

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

  public getSeekableRanges(): Array<IPlayerTimeRange> {
    return PlayerTimeRange.fromTimeRanges(this.videoElement_.seekable);
  }

  public abstract getTextTracks(): Array<ITextTrack>;
  public getBufferedRanges(): Array<IPlayerTimeRange> {
    return PlayerTimeRange.fromTimeRanges(this.videoElement_.buffered);
  }

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
