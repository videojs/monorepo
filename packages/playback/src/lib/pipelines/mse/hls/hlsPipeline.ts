import type { FullPlaylistParser, ProgressiveParser } from '@videojs/hls-parser';
import MsePipeLine from '../msePipeline';
import type { PipelineDependencies } from '../../basePipeline';
import type {
  PlayerTextTrack,
  PlayerAudioTrack,
  PlayerImageTrack,
  PlayerVideoTrack,
  PlayerStats,
} from '../../../types/player';

export default class HlsPipeline extends MsePipeLine {
  public static create(dependencies: PipelineDependencies): HlsPipeline {
    return new HlsPipeline(dependencies);
  }

  private progressiveParser: ProgressiveParser | null = null;
  private fullPlaylistParser: FullPlaylistParser | null = null;

  public setProgressiveParser(parser: ProgressiveParser): void {
    this.progressiveParser = parser;
  }

  public setFullPlaylistParser(parser: FullPlaylistParser): void {
    this.fullPlaylistParser = parser;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public loadRemoteAsset(uri: URL): void {
    if (this.progressiveParser) {
      // load and parse progressively
    }

    if (this.fullPlaylistParser) {
      // load and parse sequentially
    }

    //trigger error;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public loadLocalAsset(asset: string | ArrayBuffer): void {
    if (this.fullPlaylistParser) {
      // just parse
    }

    if (this.progressiveParser) {
      // push
    }

    // trigger error;
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
