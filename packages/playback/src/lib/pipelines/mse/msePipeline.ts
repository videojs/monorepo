import Pipeline from '../basePipeline';
import type NetworkManager from '../../network/networkManager';

export default abstract class MsePipeLine extends Pipeline {
  public abstract loadLocalAsset(asset: string | ArrayBuffer): void;

  public abstract loadRemoteAssetWithNetworkManager(uri: URL, networkManager: NetworkManager): void;
}
