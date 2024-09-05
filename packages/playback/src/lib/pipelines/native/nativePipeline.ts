/* eslint-disable no-unused-vars,@typescript-eslint/no-unused-vars */
import type {
  PlayerTextTrack,
  PlayerAudioTrack,
  PlayerImageTrack,
  PlayerVideoTrack,
  PlayerStats,
} from '../../types/player';
import type { PipelineDependencies } from '../basePipeline';
import { Pipeline } from '../basePipeline';

export default class NativePipeline extends Pipeline {
  public static create(dependencies: PipelineDependencies): NativePipeline {
    dependencies.logger = dependencies.logger.createSubLogger('NativePipeline');

    return new NativePipeline(dependencies);
  }

  public loadLocalAsset(asset: string | ArrayBuffer, baseUrl: string): void {
    throw new Error('Method not implemented.');
  }

  public loadRemoteAsset(uri: URL): void {
    throw new Error('Method not implemented.');
  }

  public selectTextTrack(textTrack: PlayerTextTrack): void {
    throw new Error('Method not implemented.');
  }
  public selectAudioTrack(audioTrack: PlayerAudioTrack): void {
    throw new Error('Method not implemented.');
  }
  public selectImageTrack(imageTrack: PlayerImageTrack): void {
    throw new Error('Method not implemented.');
  }
  public selectVideoTrack(videoTrack: PlayerVideoTrack): void {
    throw new Error('Method not implemented.');
  }
  public getTextTracks(): Array<PlayerTextTrack> {
    throw new Error('Method not implemented.');
  }
  public getAudioTracks(): Array<PlayerAudioTrack> {
    throw new Error('Method not implemented.');
  }
  public getImageTracks(): Array<PlayerImageTrack> {
    throw new Error('Method not implemented.');
  }
  public getVideoTracks(): Array<PlayerVideoTrack> {
    throw new Error('Method not implemented.');
  }
  public getStats(): PlayerStats {
    throw new Error('Method not implemented.');
  }
  public dispose(): void {
    throw new Error('Method not implemented.');
  }
}
