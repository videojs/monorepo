import type { PipelineDependencies } from '../basePipeline';
import { Pipeline } from '../basePipeline';

export default class NativePipeline extends Pipeline {
  public static create(dependencies: PipelineDependencies): NativePipeline {
    return new NativePipeline(dependencies);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public loadLocalAsset(asset: string | ArrayBuffer): void {
    //TODO
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public loadRemoteAsset(uri: URL): void {
    //TODO
  }
}
