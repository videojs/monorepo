import MsePipeLine from '../msePipeline';
import type NetworkManager from '../../../network/networkManager';

export default class DashPipeline extends MsePipeLine {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public loadRemoteAssetWithNetworkManager(uri: URL, networkManager: NetworkManager): void {
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
