import type NetworkManager from '../network/networkManager';
import type Logger from '../utils/logger';

export interface PipelineDependencies {
  logger: Logger;
  networkManager: NetworkManager;
}

export abstract class Pipeline {
  protected readonly logger: Logger;
  protected readonly networkManager: NetworkManager;

  protected constructor(dependencies: PipelineDependencies) {
    this.logger = dependencies.logger;
    this.networkManager = dependencies.networkManager;
  }

  public abstract loadRemoteAsset(uri: URL): void;

  public abstract loadLocalAsset(asset: string | ArrayBuffer): void;
}
