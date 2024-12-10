/**
 * This file should be entry point for worker bundle
 */
import { WorkerToMainThreadMessageChannel } from './messages/worker-to-main-messages';
import type {
  MainToWorkerMessage,
  SetLoggerLevelMessage,
  UpdateConfigurationMessage,
} from './messages/main-to-worker-messages';
import { MainToWorkerMessageType } from './consts/main-to-worker-message-type';
import type { ILogger } from '../../types/logger.declarations';
import type { PlayerConfiguration } from '../../types/configuration.declarations';
// services:
import { Logger } from '../../utils/logger';
import { getPlayerConfigurationDefaults } from '../../configuration/configuration-defaults';
import { NetworkManager } from '../../network/network-manager';
import type { INetworkManager, INetworkRequestInfo, INetworkResponseInfo } from '../../types/network.declarations';
import { InterceptorType } from '../../consts/interceptor-type';
import {
  NetworkRequestAttemptCompletedSuccessfullyEvent,
  NetworkRequestAttemptCompletedUnsuccessfullyEvent,
  NetworkRequestAttemptFailedEvent,
  NetworkRequestAttemptStartedEvent,
} from '../../events/network-events';
import type { IWorkerToMainThreadMessageChannel } from '../../types/message-channels/worker-to-main-thread-message-channel';

interface WorkerBridgeDependencies {
  readonly globalScope: DedicatedWorkerGlobalScope;
  readonly logger: ILogger;
  readonly configuration: PlayerConfiguration;
  readonly networkManager: INetworkManager;
  readonly messageChannel: IWorkerToMainThreadMessageChannel;
}

class WorkerBridge {
  public static create(): WorkerBridge {
    const globalScope = self;
    const logger = new Logger({ console: console, delimiter: '>', label: 'Player' }).createSubLogger('WorkerBridge');
    const configuration = getPlayerConfigurationDefaults();

    return new WorkerBridge({
      globalScope,
      logger,
      configuration,
      messageChannel: new WorkerToMainThreadMessageChannel(globalScope),
      networkManager: new NetworkManager({
        logger: logger.createSubLogger('NetworkManager'),
        configuration: configuration.network,
        executor: (request) => fetch(request),
      }),
    });
  }

  private readonly logger_: ILogger;
  private readonly globalScope_: DedicatedWorkerGlobalScope;
  private readonly networkManager_: INetworkManager;
  private readonly messageChannel_: IWorkerToMainThreadMessageChannel;

  private configuration_: PlayerConfiguration;

  public constructor(dependencies: WorkerBridgeDependencies) {
    this.globalScope_ = dependencies.globalScope;
    this.logger_ = dependencies.logger;
    this.configuration_ = dependencies.configuration;
    this.networkManager_ = dependencies.networkManager;
    this.messageChannel_ = dependencies.messageChannel;

    // We don't care about clean-up, since terminate() call on main thread should fully destroy worker
    this.globalScope_.addEventListener('message', this.onMessageFromMainThread_);

    // setup network manager:
    this.networkManager_.hooks.onAttemptStarted = this.onNetworkRequestAttemptStarted_;
    this.networkManager_.hooks.onAttemptCompletedSuccessfully = this.onNetworkRequestAttemptCompletedSuccessfully_;
    this.networkManager_.hooks.onAttemptCompletedUnsuccessfully = this.onNetworkRequestAttemptCompletedUnsuccessfully_;
    this.networkManager_.hooks.onAttemptFailed = this.onNetworkRequestAttemptFailed_;
    this.networkManager_.requestInterceptor = this.networkRequestInterceptor_;
  }

  private readonly networkRequestInterceptor_ = (requestInfo: INetworkRequestInfo): Promise<INetworkRequestInfo> => {
    return this.messageChannel_.sendRunInterceptorsMessage(InterceptorType.NetworkRequest, requestInfo);
  };

  private readonly onNetworkRequestAttemptStarted_ = (requestInfo: INetworkRequestInfo): void => {
    const event = new NetworkRequestAttemptStartedEvent(requestInfo);
    this.messageChannel_.sendEmitEventMessage(event);
  };

  private readonly onNetworkRequestAttemptCompletedSuccessfully_ = (
    requestInfo: INetworkRequestInfo,
    responseInfo: INetworkResponseInfo
  ): void => {
    const event = new NetworkRequestAttemptCompletedSuccessfullyEvent(requestInfo, responseInfo);
    this.messageChannel_.sendEmitEventMessage(event);
  };

  private readonly onNetworkRequestAttemptCompletedUnsuccessfully_ = (
    requestInfo: INetworkRequestInfo,
    responseInfo: INetworkResponseInfo
  ): void => {
    const event = new NetworkRequestAttemptCompletedUnsuccessfullyEvent(requestInfo, responseInfo);
    this.messageChannel_.sendEmitEventMessage(event);
  };

  private readonly onNetworkRequestAttemptFailed_ = (requestInfo: INetworkRequestInfo, error: Error): void => {
    const event = new NetworkRequestAttemptFailedEvent(requestInfo, error);
    this.messageChannel_.sendEmitEventMessage(event);
  };

  private readonly onMessageFromMainThread_ = (event: MessageEvent<MainToWorkerMessage>): void => {
    switch (event.data.type) {
      case MainToWorkerMessageType.SetLoggerLevel:
        return this.handleSetLoggerLevelMessage_(event.data as SetLoggerLevelMessage);
      case MainToWorkerMessageType.UpdateConfiguration:
        return this.handleUpdateConfigurationMessage_(event.data as UpdateConfigurationMessage);
      default: {
        break;
      }
    }
  };

  private handleSetLoggerLevelMessage_(message: SetLoggerLevelMessage): void {
    this.logger_.setLoggerLevel(message.level);
  }

  private handleUpdateConfigurationMessage_(message: UpdateConfigurationMessage): void {
    this.configuration_ = message.configuration;
    this.networkManager_.updateConfiguration(this.configuration_.network);
  }
}

WorkerBridge.create();
