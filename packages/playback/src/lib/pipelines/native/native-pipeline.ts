import { BasePipeline } from '../base-pipeline';
import type { PipelineDependencies } from '../../types/pipeline.declarations';
import type { IPlayerAudioTrack } from '../../types/audio-track.declarations';
import { PlayerAudioTrack } from '../../models/player-audio-track';
import type { IQualityLevel } from '../../types/quality-level.declarations';
import type { PlaybackState } from 'src/lib/consts/playback-state';
import type { IPlayerTextTrack } from 'src/lib/types/text-track.declarations';
import type {
  IRemoteVttThumbnailTrackOptions,
  IPlayerThumbnailTrack,
} from 'src/lib/types/thumbnail-track.declarations';

export default class NativePipeline extends BasePipeline {
  public dispose(): void {
    throw new Error('Method not implemented.');
  }
  public getTextTracks(): Array<IPlayerTextTrack> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars
  public removeRemoteThumbnailTrack(id: string): boolean {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars
  public addRemoteVttThumbnailTrack(options: IRemoteVttThumbnailTrackOptions): boolean {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars
  public selectThumbnailTrack(id: string): boolean {
    throw new Error('Method not implemented.');
  }
  public getThumbnailTracks(): Array<IPlayerThumbnailTrack> {
    throw new Error('Method not implemented.');
  }
  public getPlaybackState(): PlaybackState {
    throw new Error('Method not implemented.');
  }
  public static create(dependencies: PipelineDependencies): Promise<NativePipeline> {
    dependencies.logger = dependencies.logger.createSubLogger('NativePipeline');

    return Promise.resolve(new NativePipeline(dependencies));
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
}
