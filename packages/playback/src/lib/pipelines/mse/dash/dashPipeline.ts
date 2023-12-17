import MsePipeLine from '../msePipeline';
import type { PipelineDependencies } from '../../basePipeline';

export default class DashPipeline extends MsePipeLine {
  public static create(dependencies: PipelineDependencies): DashPipeline {
    return new DashPipeline(dependencies);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public loadRemoteAsset(uri: URL): void {
    // if (this.progressiveParser) {
    // load and parse progressively
    // }
    // if (this.fullPlaylistParser) {
    // load and parse sequentially
    // }
    //trigger error;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public loadLocalAsset(asset: string | ArrayBuffer): void {
    // if (this.fullPlaylistParser) {
    // just parse
    // }
    // if (this.progressiveParser) {
    // push
    // }
    // trigger error;
  }
}
