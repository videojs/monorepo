import type { ILogger } from '../types/logger.declarations';
import type {
  INetworkManager,
  IRequestPayloadWithMapper,
  INetworkRequest,
  IRequestPayloadWithChunkHandler,
} from '../types/networkingManager.declarations';
import { NetworkRequestWithChunkHandler, NetworkRequestWithMapper } from './networkRequest';

interface NetworkManagerDependencies {
  logger: ILogger;
}

export class NetworkManager implements INetworkManager {
  private readonly logger_: ILogger;

  public constructor(dependencies: NetworkManagerDependencies) {
    this.logger_ = dependencies.logger;
  }

  public get<T>(payload: IRequestPayloadWithMapper<T>): INetworkRequest<T> {
    (payload.requestInit as RequestInit).method = 'GET';
    return new NetworkRequestWithMapper<T>(payload, this.logger_);
  }

  public getProgressive(payload: IRequestPayloadWithChunkHandler): INetworkRequest<void> {
    (payload.requestInit as RequestInit).method = 'GET';
    return new NetworkRequestWithChunkHandler(payload, this.logger_);
  }

  public post<T>(payload: IRequestPayloadWithMapper<T>): INetworkRequest<T> {
    (payload.requestInit as RequestInit).method = 'POST';
    return new NetworkRequestWithMapper<T>(payload, this.logger_);
  }

  public postProgressive(payload: IRequestPayloadWithChunkHandler): INetworkRequest<void> {
    (payload.requestInit as RequestInit).method = 'POST';
    return new NetworkRequestWithChunkHandler(payload, this.logger_);
  }
}
