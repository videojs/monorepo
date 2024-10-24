import { WorkerToMainMessageType } from '../consts/worker-to-main-message-type';
import type { PlayerEvent } from '../../../events/base-player-event';
import type { InterceptorType } from '../../../consts/interceptor-type';
import type { InterceptorTypeToInterceptorPayloadMap } from '../../../types/mappers/interceptor-type-to-interceptor-map.declarations';

export abstract class WorkerToMainMessage {
  public abstract readonly type: WorkerToMainMessageType;
}

export class EmitEventMessage extends WorkerToMainMessage {
  public readonly type = WorkerToMainMessageType.EmitEvent;
  public readonly event: PlayerEvent;

  public constructor(event: PlayerEvent) {
    super();
    this.event = event;
  }
}

export class RunInterceptorsMessage extends WorkerToMainMessage {
  public readonly type = WorkerToMainMessageType.RunInterceptors;
  public readonly interceptorType: InterceptorType;
  public readonly payload: InterceptorTypeToInterceptorPayloadMap[InterceptorType];
  public readonly executionId: string = String(Date.now() + Math.random());

  public constructor(
    interceptorType: InterceptorType,
    payload: InterceptorTypeToInterceptorPayloadMap[InterceptorType]
  ) {
    super();
    this.interceptorType = interceptorType;
    this.payload = payload;
  }
}
