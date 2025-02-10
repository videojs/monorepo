import type { IQualityLevel } from 'src/lib/types/quality-level.declarations';
import { BasePipeline } from '../base-pipeline';
import type { IPlayerAudioTrack } from 'src/lib/types/audio-track.declarations';
import type {
  IPlayerTextTrack,
  IRemoteVttThumbnailTrackOptions,
  IPlayerThumbnailTrack,
} from 'src/entry-points/api-reference';
import type { PlaybackState } from 'src/lib/consts/playback-state';

/* eslint-disable */
export default abstract class MsePipeline extends BasePipeline {
  public dispose(): void {
    throw new Error('Method not implemented.');
  }
  public getAudioTracks(): Array<IPlayerAudioTrack> {
    throw new Error('Method not implemented.');
  }
  public selectAudioTrack(id: string): boolean {
    throw new Error('Method not implemented.');
  }
  public getQualityLevels(): Array<IQualityLevel> {
    throw new Error('Method not implemented.');
  }
  public selectQualityLevel(): boolean {
    throw new Error('Method not implemented.');
  }
  public selectAutoQualityLevel(): boolean {
    throw new Error('Method not implemented.');
  }
  public getTextTracks(): Array<IPlayerTextTrack> {
    throw new Error('Method not implemented.');
  }
  public removeRemoteThumbnailTrack(id: string): boolean {
    throw new Error('Method not implemented.');
  }
  public addRemoteVttThumbnailTrack(options: IRemoteVttThumbnailTrackOptions): boolean {
    throw new Error('Method not implemented.');
  }
  public selectThumbnailTrack(id: string): boolean {
    throw new Error('Method not implemented.');
  }
  public getThumbnailTracks(): Array<IPlayerThumbnailTrack> {
    throw new Error('Method not implemented.');
  }
  public getPlaybackState(): PlaybackState {
    throw new Error('Method not implemented.');
  }
  public start(): void {
    throw new Error('Method not implemented.');
  }
}
