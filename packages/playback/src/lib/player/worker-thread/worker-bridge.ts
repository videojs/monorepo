/**
 * This file should be entry point for worker bundle
 */
import type { WorkerToMainMessage } from './messages/worker-to-main-messages';
import type { MainToWorkerMessage } from './messages/main-to-worker-messages';
import { MainToWorkerMessageType } from './consts/main-to-worker-message-type';

interface WorkerBridgeDependencies {
  readonly globalScope: Window & typeof globalThis;
}

class WorkerBridge {
  public static create(): WorkerBridge {
    return new WorkerBridge({
      globalScope: self,
    });
  }

  private readonly globalScope_: Window & typeof globalThis;

  public constructor(dependencies: WorkerBridgeDependencies) {
    this.globalScope_ = dependencies.globalScope;
    // We don't care about clean-up, since terminate() call on main thread should fully destroy worker
    this.globalScope_.addEventListener('message', this.onMessageFromMainThread_);
  }

  private readonly onMessageFromMainThread_ = (event: MessageEvent<MainToWorkerMessage>): void => {
    switch (event.data.type) {
      case MainToWorkerMessageType.SetLoggerLevel: {
        break;
      }
      case MainToWorkerMessageType.UpdateConfiguration: {
        break;
      }
      default: {
        break;
      }
    }
  };

  private sendMessageToMainThread_(message: WorkerToMainMessage): void {
    this.globalScope_.postMessage(message);
  }
}

WorkerBridge.create();
