import type { ILogger } from '../types/logger.declarations';
import type {
  INetworkManager,
  IRequestPayloadWithMapper,
  INetworkRequest,
  IRequestPayloadWithChunkHandler,
  INetworkInterceptorsProvider,
} from '../types/network.declarations';
import { NetworkRequestWithChunkHandler, NetworkRequestWithMapper } from './networkRequest';
import type { PlayerNetworkConfiguration } from '../types/configuration.declarations';
import type { IEventEmitter } from '../types/eventEmitter.declarations';
import type { NetworkEventMap } from '../types/eventTypeToEventMap.declarations';

interface NetworkManagerDependencies {
  logger: ILogger;
  networkInterceptorsProvider: INetworkInterceptorsProvider;
  eventEmitter: IEventEmitter<NetworkEventMap>;
  configuration: PlayerNetworkConfiguration;
}

export class NetworkManager implements INetworkManager {
  private readonly logger_: ILogger;
  private readonly networkInterceptorsProvider_: INetworkInterceptorsProvider;
  private readonly eventEmitter_: IEventEmitter<NetworkEventMap>;
  private configuration_: PlayerNetworkConfiguration;

  public constructor(dependencies: NetworkManagerDependencies) {
    this.logger_ = dependencies.logger;
    this.networkInterceptorsProvider_ = dependencies.networkInterceptorsProvider;
    this.eventEmitter_ = dependencies.eventEmitter;
    this.configuration_ = dependencies.configuration;
  }

  public updateConfiguration(configuration: PlayerNetworkConfiguration): void {
    this.configuration_ = configuration;
  }

  public get<T>(payload: IRequestPayloadWithMapper<T>): INetworkRequest<T> {
    (payload.requestInit as RequestInit).method = 'GET';
    return this.createNetworkRequestWithMapper_(payload);
  }

  public getProgressive(payload: IRequestPayloadWithChunkHandler): INetworkRequest<void> {
    (payload.requestInit as RequestInit).method = 'GET';
    return this.createNetworkRequestWithChunkHandler_(payload);
  }

  public post<T>(payload: IRequestPayloadWithMapper<T>): INetworkRequest<T> {
    (payload.requestInit as RequestInit).method = 'POST';
    return this.createNetworkRequestWithMapper_(payload);
  }

  public postProgressive(payload: IRequestPayloadWithChunkHandler): INetworkRequest<void> {
    (payload.requestInit as RequestInit).method = 'POST';
    return this.createNetworkRequestWithChunkHandler_(payload);
  }

  private createNetworkRequestWithMapper_<T>(payload: IRequestPayloadWithMapper<T>): INetworkRequest<T> {
    return new NetworkRequestWithMapper<T>(payload, {
      logger: this.logger_,
      networkInterceptorsProvider: this.networkInterceptorsProvider_,
      eventEmitter: this.eventEmitter_,
      configuration: { ...this.configuration_[payload.requestType] },
    });
  }

  private createNetworkRequestWithChunkHandler_(payload: IRequestPayloadWithChunkHandler): INetworkRequest<void> {
    return new NetworkRequestWithChunkHandler(payload, {
      logger: this.logger_,
      networkInterceptorsProvider: this.networkInterceptorsProvider_,
      eventEmitter: this.eventEmitter_,
      configuration: { ...this.configuration_[payload.requestType] },
    });
  }
}
