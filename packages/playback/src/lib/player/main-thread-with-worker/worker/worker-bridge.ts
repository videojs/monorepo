/**
 * This file should be entry point for worker bundle
 */
import { WorkerToMainThreadMessageChannel } from '../messages/worker-to-main-thread-messages';
import type {
  LoadPipelineLoaderMessage,
  MainToWorkerMessage,
  SetLoggerLevelMessage,
  UpdateConfigurationMessage,
} from '../messages/main-to-worker-thread-messages';
import { MainToWorkerMessageType } from '../message-types/main-to-worker-message-type';
import type { ILogger } from '../../../types/logger.declarations';
import type { PlayerConfiguration } from '../../../types/configuration.declarations';
// services:
import { Logger } from '../../../utils/logger';
import { getPlayerConfigurationDefaults } from '../../../configuration/configuration-defaults';
import { NetworkManager } from '../../../network/network-manager';
import type { INetworkManager, INetworkRequestInfo, INetworkResponseInfo } from '../../../types/network.declarations';
import { InterceptorType } from '../../../consts/interceptor-type';
import {
  NetworkRequestAttemptCompletedSuccessfullyEvent,
  NetworkRequestAttemptCompletedUnsuccessfullyEvent,
  NetworkRequestAttemptFailedEvent,
  NetworkRequestAttemptStartedEvent,
} from '../../../events/network-events';
import type { IWorkerToMainThreadMessageChannel } from '../../../types/message-channels/worker-to-main-thread-message-channel';
import type { PipelineLoaderFactoryStorage } from '../../base/pipeline-loader-factory-storage';
import type { IPipelineLoaderFactory } from '../../../types/pipeline.declarations';

interface WorkerBridgeDependencies {
  readonly globalScope: DedicatedWorkerGlobalScope;
  readonly logger: ILogger;
  readonly configuration: PlayerConfiguration;
  readonly networkManager: INetworkManager;
  readonly messageChannel: IWorkerToMainThreadMessageChannel;
  readonly pipelineLoaderFactoryStorage: PipelineLoaderFactoryStorage;
}

export class WorkerBridge {
  /**
   * we pass pipeline loader factory storage instance,
   * so we can create alternative bundles with pre-bundled set of features
   * @param pipelineLoaderFactoryStorage - pipeline loader factory storage
   */
  public static create(pipelineLoaderFactoryStorage: PipelineLoaderFactoryStorage): WorkerBridge {
    const globalScope = self as DedicatedWorkerGlobalScope;
    const logger = new Logger({ console: console, delimiter: '>', label: 'Player' }).createSubLogger('WorkerBridge');
    const configuration = getPlayerConfigurationDefaults();

    return new WorkerBridge({
      globalScope,
      logger,
      configuration,
      pipelineLoaderFactoryStorage,
      messageChannel: new WorkerToMainThreadMessageChannel(globalScope),
      networkManager: new NetworkManager({
        logger: logger.createSubLogger('NetworkManager'),
        configuration: configuration.network,
        executor: (request) => fetch(request),
      }),
    });
  }

  private readonly pipelineLoaderFactoryStorage_: PipelineLoaderFactoryStorage;
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
    this.pipelineLoaderFactoryStorage_ = dependencies.pipelineLoaderFactoryStorage;

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
      case MainToWorkerMessageType.LoadPipelineLoader:
        return this.handleLoadPipelineLoaderMessage_(event.data as LoadPipelineLoaderMessage);
      default: {
        break;
      }
    }
  };

  private handleLoadPipelineLoaderMessage_(message: LoadPipelineLoaderMessage): void {
    let isLoaded = false;

    try {
      importScripts(message.url);

      if (message.namespace in this.globalScope_) {
        // @ts-expect-error we expect namespace to be available
        const loader = this.globalScope_[message.namespace] as IPipelineLoaderFactory;

        this.logger_.info('Pipeline loader script was loaded: ', loader);
        this.pipelineLoaderFactoryStorage_.add(message.mimeType, {
          loader,
          alias: message.alias,
        });
        isLoaded = true;
      } else {
        this.logger_.warn('Pipeline loader script was loaded, but namespace was not found');
        isLoaded = false;
      }
    } catch (e) {
      this.logger_.warn('Unable to load pipeline loader script: ', e);
      isLoaded = false;
    }

    this.messageChannel_.sendLoadPipelineLoaderExecutionResultMessage(isLoaded, message.executionId);
  }

  private handleSetLoggerLevelMessage_(message: SetLoggerLevelMessage): void {
    this.logger_.setLoggerLevel(message.level);
  }

  private handleUpdateConfigurationMessage_(message: UpdateConfigurationMessage): void {
    this.configuration_ = message.configuration;
    this.networkManager_.updateConfiguration(this.configuration_.network);
  }
}
