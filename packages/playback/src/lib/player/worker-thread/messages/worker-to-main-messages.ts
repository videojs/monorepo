import { WorkerToMainMessageType } from '../consts/worker-to-main-message-type';
import type { PlayerEvent } from '../../../events/base-player-event';
import type { InterceptorType } from '../../../consts/interceptor-type';
import type { InterceptorTypeToInterceptorPayloadMap } from '../../../types/mappers/interceptor-type-to-interceptor-map.declarations';
import type { InterceptorsExecutionResultMessage, MainToWorkerMessage } from './main-to-worker-messages';
import { MainToWorkerMessageType } from '../consts/main-to-worker-message-type';
import type { IWorkerToMainThreadMessageChannel } from '../../../types/message-channels/worker-to-main-thread-message-channel';

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

export class WorkerToMainThreadMessageChannel implements IWorkerToMainThreadMessageChannel {
  private readonly globalScope_: Window & typeof globalThis;

  public constructor(globalScope: Window & typeof globalThis) {
    this.globalScope_ = globalScope;
  }

  private sendMessageToMainThread_(message: WorkerToMainMessage): void {
    this.globalScope_.postMessage(message);
  }

  public sendRunInterceptorsMessage<K extends InterceptorType>(
    interceptorType: K,
    payload: InterceptorTypeToInterceptorPayloadMap[K]
  ): Promise<InterceptorTypeToInterceptorPayloadMap[K]> {
    return new Promise((resolve) => {
      const message = new RunInterceptorsMessage(interceptorType, payload);

      const onMessage = (event: MessageEvent<MainToWorkerMessage>): void => {
        if (event.data.type === MainToWorkerMessageType.InterceptorsExecutionResult) {
          const receivedMessage = event.data as InterceptorsExecutionResultMessage;
          const isExpectedExecutionResult = receivedMessage.executionId === message.executionId;

          if (isExpectedExecutionResult) {
            this.globalScope_.removeEventListener('message', onMessage);
            resolve(receivedMessage.result as InterceptorTypeToInterceptorPayloadMap[K]);
          }
        }
      };

      this.globalScope_.addEventListener('message', onMessage);
      this.sendMessageToMainThread_(message);
    });
  }

  public sendEmitEventMessage(event: PlayerEvent): void {
    this.sendMessageToMainThread_(new EmitEventMessage(event));
  }
}
