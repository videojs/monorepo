// base
import { BasePlayer } from '../base/base-player';
import type { PlayerDependencies } from '../base/base-player';
//enums
import type { LoggerLevel } from '../../consts/logger-level';
// types
import type { DeepPartial } from '../../types/utility.declarations';
import type { PlayerConfiguration } from '../../types/configuration.declarations';
import { ServiceLocator } from '../../service-locator';
import type {
  EmitEventMessage,
  RunInterceptorsMessage,
  WorkerToMainMessage,
} from './messages/worker-to-main-thread-messages';
import { WorkerToMainMessageType } from './message-types/worker-to-main-message-type';
import type {
  IMainToWorkerThreadMessageChannel,
  LoadPipelineLoaderPayload,
} from '../../types/message-channels/main-to-worker-thread-message-channel';
import { MainToWorkerThreadMessageChannel } from './messages/main-to-worker-thread-messages';
import type { ILoadLocalSource, ILoadRemoteSource } from '../../types/source.declarations';

declare const __WORKER_CODE: string;
declare const __BUNDLED_WORKER_PIPELINE_LOADERS: Record<string, Array<string>>;

interface PlayerWorkerDependencies extends PlayerDependencies {
  readonly worker: Worker;
  readonly workerScriptBlobUrl: string;
  readonly messageChannel: IMainToWorkerThreadMessageChannel;
  readonly workerPipelineLoaders: Record<string, Array<string>>;
  // TODO: We want to create a fallback mse controller on the main thread,
  // Since during build-time, we don't know whether it will be possible to create mediaSource in the worker
}

// TODO: create activePipeline which posts messages to the worker to align with native pipeline

export class Player extends BasePlayer {
  public static create(): Player {
    const serviceLocator = new ServiceLocator();
    const workerPipelineLoaders = __BUNDLED_WORKER_PIPELINE_LOADERS;
    const workerScriptBlob = new Blob([__WORKER_CODE], { type: 'application/javascript' });
    const workerScriptBlobUrl = URL.createObjectURL(workerScriptBlob);
    const worker = new Worker(workerScriptBlobUrl);

    return new Player({
      ...serviceLocator,
      worker,
      workerPipelineLoaders,
      workerScriptBlobUrl: workerScriptBlobUrl,
      messageChannel: new MainToWorkerThreadMessageChannel(worker),
    });
  }

  private readonly worker_: Worker;
  private readonly workerScriptBlobUrl_: string;
  private readonly messageChannel_: IMainToWorkerThreadMessageChannel;
  private readonly workerPipelineLoaders_ = new Map<string, Set<string>>();

  public constructor(dependencies: PlayerWorkerDependencies) {
    super(dependencies);

    this.worker_ = dependencies.worker;
    this.workerScriptBlobUrl_ = dependencies.workerScriptBlobUrl;
    this.messageChannel_ = dependencies.messageChannel;
    this.worker_.addEventListener('message', this.onWorkerMessage_);

    for (const [mimeType, aliases] of Object.entries(dependencies.workerPipelineLoaders)) {
      this.workerPipelineLoaders_.set(mimeType, new Set(aliases));
    }
  }

  private readonly onWorkerMessage_ = (event: MessageEvent<WorkerToMainMessage>): void => {
    switch (event.data.type) {
      case WorkerToMainMessageType.EmitEvent:
        return this.handleEmitEventMessage_(event.data as EmitEventMessage);
      case WorkerToMainMessageType.RunInterceptors:
        return this.handleRunInterceptorsMessage_(event.data as RunInterceptorsMessage);
      default:
        return this.handleUnknownMessage_(event.data);
    }
  };

  private handleEmitEventMessage_(message: EmitEventMessage): void {
    this.eventEmitter_.emitEvent(message.event);
  }

  private handleRunInterceptorsMessage_(message: RunInterceptorsMessage): void {
    this.interceptorsStorage_.executeInterceptors(message.interceptorType, message.payload).then((result) => {
      this.messageChannel_.sendInterceptorsExecutionResultMessage(message.executionId, result);
    });
  }

  private handleUnknownMessage_(message: WorkerToMainMessage): void {
    this.logger_.warn('Unknown message received from worker: ', message);
  }

  public hasWorkerPipelineLoaderFor(mimeType: string, alias?: string): boolean {
    if (!alias) {
      return this.workerPipelineLoaders_.has(mimeType);
    }

    const aliases = this.workerPipelineLoaders_.get(mimeType);
    return aliases ? aliases.has(alias) : false;
  }

  public loadPipelineLoaderScript(payload: LoadPipelineLoaderPayload): Promise<void> {
    const promise = this.messageChannel_.sendLoadPipelineLoaderMessage(payload);

    promise.then(() => {
      if (this.workerPipelineLoaders_.has(payload.mimeType)) {
        this.workerPipelineLoaders_.get(payload.mimeType)?.add(payload.alias);
      } else {
        this.workerPipelineLoaders_.set(payload.mimeType, new Set([payload.alias]));
      }
    });

    return promise;
  }

  public setLoggerLevel(loggerLevel: LoggerLevel): void {
    super.setLoggerLevel(loggerLevel);
    this.messageChannel_.sendSetLoggerLevelMessage(loggerLevel);
  }

  public updateConfiguration(configurationChunk: DeepPartial<PlayerConfiguration>): void {
    super.updateConfiguration(configurationChunk);
    this.messageChannel_.sendUpdateConfigurationMessage(this.getConfigurationSnapshot());
  }

  public resetConfiguration(): void {
    super.resetConfiguration();
    this.messageChannel_.sendUpdateConfigurationMessage(this.getConfigurationSnapshot());
  }

  public stop(reason: string): void {
    super.stop(reason);
    this.messageChannel_.sendStopMessage();
  }

  public dispose(): void {
    super.dispose();
    this.worker_.terminate();
    URL.revokeObjectURL(this.workerScriptBlobUrl_);
  }

  public load(source: ILoadRemoteSource | ILoadLocalSource): void {
    if (this.hasWorkerPipelineLoaderFor(source.mimeType, source.loaderAlias)) {
      // TODO: send load request to worker
      return;
    }

    super.load(source);
  }
}
