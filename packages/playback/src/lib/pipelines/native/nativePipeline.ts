import Pipeline from '../basePipeline';
import type NetworkManager from '../../network/networkManager';

export default class NativePipeline extends Pipeline {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public loadLocalAsset(asset: string | ArrayBuffer): void {
    //TODO
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public loadRemoteAssetWithNetworkManager(uri: URL, networkManager: NetworkManager): void {}
}
