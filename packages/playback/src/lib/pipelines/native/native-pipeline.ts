import { BasePipeline } from '../base-pipeline';
import type { IPipelineDependencies } from '../../types/pipeline.declarations';
import type { IPlayerAudioTrack } from '../../types/audio-track.declarations';
import { PlayerAudioTrack } from '../../models/player-audio-track';
import type { IQualityLevel } from '../../types/quality-level.declarations';
import { PlaybackState } from '../../consts/playback-state';
import type { IPlayerTextTrack } from '../../types/text-track.declarations';
import {
  type IRemoteVttThumbnailTrackOptions,
  type IPlayerThumbnailTrack,
} from '../../types/thumbnail-track.declarations';
import { PlayerTextTrack } from '../../models/player-text-tracks';
import { PlayerThumbnailTrack } from '../../models/player-thumbnail-tracks';
import { TextTrackKind, TextTrackMode, Thumbnails } from '../../consts/text-tracks';

export class NativePipeline extends BasePipeline {
  private playbackState_: PlaybackState = PlaybackState.Idle;

  private constructor(dependencies: IPipelineDependencies) {
    super(dependencies);
    this.videoElement_.onwaiting = (): void => {
      this.playbackState_ = PlaybackState.Buffering;
    };
  }

  public static create(dependencies: IPipelineDependencies): NativePipeline {
    dependencies.logger = dependencies.logger.createSubLogger('NativePipeline');

    return new NativePipeline(dependencies);
  }

  public getTextTracks(): Array<IPlayerTextTrack> {
    if (this.videoElement_.textTracks) {
      return PlayerTextTrack.fromTextTracks(this.videoElement_.textTracks);
    }
    return [];
  }

  public removeRemoteThumbnailTrack(id: string): boolean {
    if (this.videoElement_.textTracks) {
      const trackToRemove = this.videoElement_.textTracks.getTrackById(id);

      if (!trackToRemove) {
        return false;
      }
      // disable native track since there is no Track element to remove.
      trackToRemove.mode = TextTrackMode.Disabled;
      return true;
    }
    return false;
  }

  public addRemoteVttThumbnailTrack(options: IRemoteVttThumbnailTrackOptions): boolean {
    // TODO: Request and parse thumbnails.
    if (options.url) {
      this.videoElement_.addTextTrack(TextTrackKind.Metadata, Thumbnails);
      return true;
    }
    return false;
  }

  public selectThumbnailTrack(id: string): boolean {
    if (this.videoElement_.textTracks) {
      const trackToSelect = this.videoElement_.textTracks.getTrackById(id);

      if (trackToSelect && trackToSelect.mode === TextTrackMode.Disabled) {
        trackToSelect.mode = TextTrackMode.Hidden;
        return true;
      }
    }
    return false;
  }

  public getThumbnailTracks(): Array<IPlayerThumbnailTrack> {
    if (this.videoElement_.textTracks) {
      return PlayerThumbnailTrack.fromTextTracks(this.videoElement_.textTracks);
    }
    return [];
  }
  public getPlaybackState(): PlaybackState {
    return this.playbackState_;
  }

  public getAudioTracks(): Array<IPlayerAudioTrack> {
    if (this.videoElement_.audioTracks) {
      return PlayerAudioTrack.fromAudioTracks(this.videoElement_.audioTracks);
    }

    return [];
  }

  public selectAudioTrack(id: string): boolean {
    if (!this.videoElement_.audioTracks) {
      return false;
    }

    const targetTrack = this.videoElement_.audioTracks.getTrackById(id);

    if (!targetTrack) {
      return false;
    }

    if (targetTrack.enabled) {
      return false;
    }

    for (const track of this.videoElement_.audioTracks) {
      track.enabled = track.id === id;
    }

    return true;
  }

  public getQualityLevels(): Array<IQualityLevel> {
    return [];
  }

  public selectQualityLevel(): boolean {
    return false;
  }

  public selectAutoQualityLevel(): boolean {
    return false;
  }

  public start(): void {
    this.videoElement_.src = this.source_.url.toString();

    // TODO: check for autoplay/preload/etc
    this.videoElement_.load();
    this.playbackState_ = PlaybackState.Loading;
  }

  public dispose(): void {
    this.videoElement_.removeAttribute('src');
    this.videoElement_.load();
    this.playbackState_ = PlaybackState.Idle;
  }

  public play(): void {
    super.play();
    this.playbackState_ = PlaybackState.Playing;
  }

  public pause(): void {
    super.pause();
    this.playbackState_ = PlaybackState.Paused;
  }
}
