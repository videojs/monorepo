import type { LoggerLevel } from '../../consts/logger-level';
import type { PlayerConfiguration } from '../configuration.declarations';
import type { InterceptorTypeToInterceptorPayloadMap } from '../mappers/interceptor-type-to-interceptor-map.declarations';
import type { InterceptorType } from '../../consts/interceptor-type';

export interface IMainToWorkerThreadMessageChannel {
  sendSetLoggerLevelMessage(level: LoggerLevel): void;
  sendUpdateConfigurationMessage(configuration: PlayerConfiguration): void;
  sendInterceptorsExecutionResultMessage(
    executionId: string,
    result: InterceptorTypeToInterceptorPayloadMap[InterceptorType]
  ): void;

  sendStopMessage(): void;
}
