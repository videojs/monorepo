import Pipeline from '@/pipelines/basePipeline.ts';

export default class NativePipeline extends Pipeline {
  public loadLocalAsset(asset: string | ArrayBuffer): void {
    //TODO
  }

  public loadRemoteAsset(uri: string): void {
    //TODO
  }
}
