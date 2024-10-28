import type { ILogger } from '../types/logger.declarations';
import type {
  INetworkManager,
  IRequestPayloadWithMapper,
  INetworkRequest,
  IRequestPayloadWithChunkHandler,
  IRequestPayload,
  INetworkRequestInterceptor,
  INetworkExecutor,
  INetworkHooks,
} from '../types/network.declarations';
import { NetworkRequestWithChunkHandler, NetworkRequestWithMapper } from './network-request';
import type { PlayerNetworkConfiguration } from '../types/configuration.declarations';
import { asyncEntity, noop } from '../utils/fn';

export interface NetworkManagerDependencies {
  logger: ILogger;
  configuration: PlayerNetworkConfiguration;
  executor: INetworkExecutor;
}

class NetworkHooks implements INetworkHooks {
  public onAttemptStarted = noop;
  public onAttemptCompletedSuccessfully = noop;
  public onAttemptCompletedUnsuccessfully = noop;
  public onAttemptFailed = noop;

  public reset(): void {
    this.onAttemptFailed = noop;
    this.onAttemptCompletedUnsuccessfully = noop;
    this.onAttemptCompletedSuccessfully = noop;
    this.onAttemptStarted = noop;
  }
}

export class NetworkManager implements INetworkManager {
  public readonly hooks: NetworkHooks = new NetworkHooks();

  public requestInterceptor: INetworkRequestInterceptor = asyncEntity;

  private readonly logger_: ILogger;
  private readonly executor_: (request: Request) => Promise<Response>;
  private configuration_: PlayerNetworkConfiguration;

  public constructor(dependencies: NetworkManagerDependencies) {
    this.logger_ = dependencies.logger;
    this.configuration_ = dependencies.configuration;
    this.executor_ = dependencies.executor;
  }

  public updateConfiguration(configuration: PlayerNetworkConfiguration): void {
    this.configuration_ = configuration;
  }

  public get<T>(payload: IRequestPayloadWithMapper<T>): INetworkRequest<T> {
    this.updateRequestInit_(payload, 'GET');
    return this.createNetworkRequestWithMapper_(payload);
  }

  public getProgressive(payload: IRequestPayloadWithChunkHandler): INetworkRequest<void> {
    this.updateRequestInit_(payload, 'GET');
    return this.createNetworkRequestWithChunkHandler_(payload);
  }

  public post<T>(payload: IRequestPayloadWithMapper<T>): INetworkRequest<T> {
    this.updateRequestInit_(payload, 'POST');
    return this.createNetworkRequestWithMapper_(payload);
  }

  public postProgressive(payload: IRequestPayloadWithChunkHandler): INetworkRequest<void> {
    this.updateRequestInit_(payload, 'POST');
    return this.createNetworkRequestWithChunkHandler_(payload);
  }

  public reset(): void {
    this.hooks.reset();
    this.requestInterceptor = asyncEntity;
  }

  private createNetworkRequestWithMapper_<T>(payload: IRequestPayloadWithMapper<T>): INetworkRequest<T> {
    return NetworkRequestWithMapper.create(payload, {
      logger: this.logger_,
      configuration: { ...this.configuration_[payload.requestType] },
      executor: (request) => this.sendRequest_(request),
      requestInterceptor: this.requestInterceptor,
      hooks: this.hooks,
    });
  }

  private createNetworkRequestWithChunkHandler_(payload: IRequestPayloadWithChunkHandler): INetworkRequest<void> {
    return NetworkRequestWithChunkHandler.create(payload, {
      logger: this.logger_,
      configuration: { ...this.configuration_[payload.requestType] },
      executor: (request) => this.sendRequest_(request),
      requestInterceptor: this.requestInterceptor,
      hooks: this.hooks,
    });
  }

  private updateRequestInit_(payload: IRequestPayload, method: string): IRequestPayload {
    payload.requestInit = payload.requestInit || {};
    (payload.requestInit as RequestInit).method = method;

    return payload;
  }

  protected sendRequest_(request: Request): Promise<Response> {
    return this.executor_(request);
  }
}
