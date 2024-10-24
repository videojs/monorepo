// Interfaces:
import type { ILogger } from './types/logger.declarations';
import type { LoggerDependencies } from './utils/logger';
import type { IInterceptorsStorage } from './types/interceptors.declarations';
import type { PlayerConfiguration } from './types/configuration.declarations';
import type { IStore } from './types/store.declarations';
import type { IEventEmitter } from './types/event-emitter.declarations';
import type { EventTypeToEventMap } from './types/mappers/event-type-to-event-map.declarations';
import type { INetworkManager } from './types/network.declarations';
import type { InterceptorTypeToInterceptorPayloadMap } from './types/mappers/interceptor-type-to-interceptor-map.declarations';
import type { NetworkManagerDependencies } from './network/network-manager';

// Implementations
import { Logger } from './utils/logger';
import { InterceptorsStorage } from './utils/interceptors-storage';
import { ConfigurationManager } from './configuration/configuration-manager';
import { EventEmitter } from './utils/event-emitter';
import { NetworkManager } from './network/network-manager';

export class ServiceLocator {
  public readonly logger: ILogger;
  public readonly interceptorsStorage: IInterceptorsStorage<InterceptorTypeToInterceptorPayloadMap>;
  public readonly configurationManager: IStore<PlayerConfiguration>;
  public readonly eventEmitter: IEventEmitter<EventTypeToEventMap>;
  public readonly networkManager: INetworkManager;

  public constructor() {
    const { console, fetch } = window;

    this.configurationManager = this.createConfigurationManager_();

    const configuration = this.configurationManager.getSnapshot();

    this.logger = this.createLogger_({ console, label: 'Player', delimiter: '>' });

    this.interceptorsStorage = this.createInterceptorsStorage_();
    this.eventEmitter = this.createEventEmitter_();
    this.networkManager = this.createNetworkManager_({
      logger: this.logger.createSubLogger('NetworkManager'),
      eventEmitter: this.eventEmitter,
      configuration: configuration.network,
      executor: (request) => fetch(request),
    });
  }

  protected createLogger_(dependencies: LoggerDependencies): ILogger {
    return new Logger(dependencies);
  }

  protected createInterceptorsStorage_(): IInterceptorsStorage<InterceptorTypeToInterceptorPayloadMap> {
    return new InterceptorsStorage<InterceptorTypeToInterceptorPayloadMap>();
  }

  protected createConfigurationManager_(): IStore<PlayerConfiguration> {
    return new ConfigurationManager();
  }

  protected createEventEmitter_(): IEventEmitter<EventTypeToEventMap> {
    return new EventEmitter<EventTypeToEventMap>();
  }

  protected createNetworkManager_(dependencies: NetworkManagerDependencies): INetworkManager {
    return new NetworkManager(dependencies);
  }
}
