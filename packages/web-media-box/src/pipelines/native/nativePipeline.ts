import Pipeline from '@/pipelines/basePipeline.ts';

export default class NativePipeline extends Pipeline {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public loadLocalAsset(asset: string | ArrayBuffer): void {
    //TODO
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public loadRemoteAsset(uri: string): void {
    //TODO
  }
}
