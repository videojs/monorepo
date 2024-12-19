import { WorkerToMainMessageType } from '../message-types/worker-to-main-message-type';
import type { PlayerEvent } from '../../../events/base-player-event';
import type { InterceptorType } from '../../../consts/interceptor-type';
import type { InterceptorTypeToInterceptorPayloadMap } from '../../../types/mappers/interceptor-type-to-interceptor-map.declarations';
import type {
  AttachMseFallbackExecutionResultMessage,
  InterceptorsExecutionResultMessage,
  MainToWorkerMessage,
} from './main-to-worker-thread-messages';
import { MainToWorkerMessageType } from '../message-types/main-to-worker-message-type';
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

export class AttachMseHandleMessage extends WorkerToMainMessage {
  public readonly type = WorkerToMainMessageType.AttachMseHandle;
  public readonly handle: MediaSourceHandle;
  public readonly isManagedMediaSource: boolean;

  public constructor(handle: MediaSourceHandle, isManagedMediaSource: boolean) {
    super();
    this.handle = handle;
    this.isManagedMediaSource = isManagedMediaSource;
  }
}

export class AttachMseFallbackMessage extends WorkerToMainMessage {
  public readonly type = WorkerToMainMessageType.AttachMseFallback;
  public readonly executionId: string = String(Date.now() + Math.random());
}

export class WorkerToMainThreadMessageChannel implements IWorkerToMainThreadMessageChannel {
  private readonly globalScope_: DedicatedWorkerGlobalScope;

  public constructor(globalScope: DedicatedWorkerGlobalScope) {
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

  public sendAttachMseHandleMessage(handle: MediaSourceHandle, isManagedMediaSource: boolean): void {
    this.globalScope_.postMessage(new AttachMseHandleMessage(handle, isManagedMediaSource), [handle]);
  }

  public sendAttachMseFallbackMessage(): Promise<boolean> {
    return new Promise((resolve) => {
      const message = new AttachMseFallbackMessage();

      const onMessage = (event: MessageEvent<MainToWorkerMessage>): void => {
        if (event.data.type === MainToWorkerMessageType.AttachMseFallbackExecutionResult) {
          const receivedMessage = event.data as AttachMseFallbackExecutionResultMessage;
          const isExpectedExecutionResult = receivedMessage.executionId === message.executionId;

          if (isExpectedExecutionResult) {
            this.globalScope_.removeEventListener('message', onMessage);
            resolve(receivedMessage.result);
          }
        }
      };

      this.globalScope_.addEventListener('message', onMessage);
      this.sendMessageToMainThread_(message);
    });
  }
}
