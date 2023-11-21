export default abstract class Pipeline {
  public abstract loadRemoteAsset(uri: string): void;
  public abstract loadLocalAsset(asset: string | ArrayBuffer): void;
}
