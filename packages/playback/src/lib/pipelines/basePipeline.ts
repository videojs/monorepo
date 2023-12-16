import type NetworkManager from '../network/networkManager';
import type Logger from '../utils/logger';

interface PipelineDependencies {
  logger: Logger;
}

export default abstract class Pipeline {
  private readonly logger: Logger;

  public constructor(dependencies: PipelineDependencies) {
    this.logger = dependencies.logger;
  }

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
