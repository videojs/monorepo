import Pipeline from '../basePipeline';

export default abstract class MsePipeLine extends Pipeline {
  public abstract loadLocalAsset(asset: string | ArrayBuffer): void;

  public abstract loadRemoteAsset(uri: string): void;
}
