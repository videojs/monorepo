import type { FullPlaylistParser, ProgressiveParser } from '@videojs/hls-parser';
import MsePipeLine from '../msePipeline';
import type { PipelineDependencies } from '../../basePipeline';

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
}
