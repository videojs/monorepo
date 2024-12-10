import type { LoggerLevel } from '../../../consts/logger-level';
import type { PlayerConfiguration } from '../../../types/configuration.declarations';
import { MainToWorkerMessageType } from '../consts/main-to-worker-message-type';
import type { InterceptorTypeToInterceptorPayloadMap } from '../../../types/mappers/interceptor-type-to-interceptor-map.declarations';
import type { InterceptorType } from '../../../consts/interceptor-type';
import type { IMainToWorkerThreadMessageChannel } from '../../../types/message-channels/main-to-worker-thread-message-channel';

export abstract class MainToWorkerMessage {
  public abstract readonly type: MainToWorkerMessageType;
}

export class SetLoggerLevelMessage extends MainToWorkerMessage {
  public readonly type = MainToWorkerMessageType.SetLoggerLevel;
  public readonly level: LoggerLevel;

  public constructor(level: LoggerLevel) {
    super();
    this.level = level;
  }
}

export class UpdateConfigurationMessage extends MainToWorkerMessage {
  public readonly type = MainToWorkerMessageType.UpdateConfiguration;
  public readonly configuration: PlayerConfiguration;

  public constructor(configuration: PlayerConfiguration) {
    super();
    this.configuration = configuration;
  }
}

export class InterceptorsExecutionResultMessage extends MainToWorkerMessage {
  public readonly type = MainToWorkerMessageType.InterceptorsExecutionResult;
  public readonly executionId: string;
  public readonly result: InterceptorTypeToInterceptorPayloadMap[InterceptorType];

  public constructor(executionId: string, result: InterceptorTypeToInterceptorPayloadMap[InterceptorType]) {
    super();
    this.executionId = executionId;
    this.result = result;
  }
}

export class StopMessage extends MainToWorkerMessage {
  public readonly type = MainToWorkerMessageType.Stop;
}

export class AttachMseFallbackExecutionResultMessage extends MainToWorkerMessage {
  public readonly type = MainToWorkerMessageType.AttachMseFallbackExecutionResult;
  public readonly executionId: string;
  public readonly result: boolean;

  public constructor(executionId: string, result: boolean) {
    super();
    this.executionId = executionId;
    this.result = result;
  }
}

export class MainToWorkerThreadMessageChannel implements IMainToWorkerThreadMessageChannel {
  private readonly worker_: Worker;

  public constructor(worker: Worker) {
    this.worker_ = worker;
  }

  public sendSetLoggerLevelMessage(level: LoggerLevel): void {
    this.sendMessageToWorkerThread_(new SetLoggerLevelMessage(level));
  }

  public sendUpdateConfigurationMessage(configuration: PlayerConfiguration): void {
    this.sendMessageToWorkerThread_(new UpdateConfigurationMessage(configuration));
  }

  public sendInterceptorsExecutionResultMessage(
    executionId: string,
    result: InterceptorTypeToInterceptorPayloadMap[InterceptorType]
  ): void {
    this.sendMessageToWorkerThread_(new InterceptorsExecutionResultMessage(executionId, result));
  }

  public sendStopMessage(): void {
    this.sendMessageToWorkerThread_(new StopMessage());
  }

  private sendMessageToWorkerThread_(message: MainToWorkerMessage): void {
    this.worker_.postMessage(message);
  }
}
