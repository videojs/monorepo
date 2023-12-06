import type NetworkManager from '../network/networkManager';

export default abstract class Pipeline {
  protected mapProtocolToNetworkManager = new Map<string, NetworkManager>();

  public loadRemoteAsset(uri: URL): void {
    const networkManager = this.mapProtocolToNetworkManager.get(uri.protocol);

    if (!networkManager) {
      // trigger error;
      return;
    }

    return this.loadRemoteAssetWithNetworkManager(uri, networkManager);
  }

  public abstract loadRemoteAssetWithNetworkManager(uri: URL, networkManager: NetworkManager): void;

  public abstract loadLocalAsset(asset: string | ArrayBuffer): void;

  public setMapProtocolToNetworkManager(map: Map<string, NetworkManager>): void {
    this.mapProtocolToNetworkManager = map;
  }
}
