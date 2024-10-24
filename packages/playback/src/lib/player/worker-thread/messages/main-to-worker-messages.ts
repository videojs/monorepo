import type { LoggerLevel } from '../../../consts/logger-level';
import type { PlayerConfiguration } from '../../../types/configuration.declarations';
import { MainToWorkerMessageType } from '../consts/main-to-worker-message-type';
import type { InterceptorTypeToInterceptorPayloadMap } from '../../../types/mappers/interceptor-type-to-interceptor-map.declarations';
import type { InterceptorType } from '../../../consts/interceptor-type';

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
