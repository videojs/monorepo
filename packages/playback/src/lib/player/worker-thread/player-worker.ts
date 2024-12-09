// base
import { BasePlayer } from '../base/base-player';
import type { PlayerDependencies } from '../base/base-player';
//enums
import type { LoggerLevel } from '../../consts/logger-level';
// types
import type { DeepPartial } from '../../types/utility.declarations';
import type { PlayerConfiguration } from '../../types/configuration.declarations';
import { ServiceLocator } from '../../service-locator';
import { MainToWorkerThreadMessageChannel } from './messages/main-to-worker-messages';
import type { EmitEventMessage, RunInterceptorsMessage, WorkerToMainMessage } from './messages/worker-to-main-messages';
import { WorkerToMainMessageType } from './consts/worker-to-main-message-type';
import type { IMainToWorkerThreadMessageChannel } from '../../types/message-channels/main-to-worker-thread-message-channel';

declare const __WORKER_CODE: string;

interface PlayerWorkerDependencies extends PlayerDependencies {
  readonly worker: Worker;
  readonly workerScriptBlobUrl: string;
  readonly messageChannel: IMainToWorkerThreadMessageChannel;
}

// TODO: create activePipeline which posts messages to the worker to align with native pipeline

export class Player extends BasePlayer {
  public static create(): Player {
    const serviceLocator = new ServiceLocator();

    const workerScriptBlob = new Blob([__WORKER_CODE], { type: 'application/javascript' });
    const workerScriptBlobUrl = URL.createObjectURL(workerScriptBlob);
    const worker = new Worker(workerScriptBlobUrl);

    return new Player({
      ...serviceLocator,
      worker,
      workerScriptBlobUrl: workerScriptBlobUrl,
      messageChannel: new MainToWorkerThreadMessageChannel(worker),
    });
  }

  private readonly worker_: Worker;
  private readonly workerScriptBlobUrl_: string;
  private readonly messageChannel_: IMainToWorkerThreadMessageChannel;

  public constructor(dependencies: PlayerWorkerDependencies) {
    super(dependencies);

    this.worker_ = dependencies.worker;
    this.workerScriptBlobUrl_ = dependencies.workerScriptBlobUrl;
    this.messageChannel_ = dependencies.messageChannel;
    this.worker_.addEventListener('message', this.onWorkerMessage_);
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
}
