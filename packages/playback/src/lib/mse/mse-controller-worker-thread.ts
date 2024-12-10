import type { MseControllerDependencies } from './mse-controller-base';
import { BaseMseController } from './mse-controller-base';
import type { IWorkerThreadMseController } from '../types/mse-controller';
import type { IWorkerToMainThreadMessageChannel } from '../types/message-channels/worker-to-main-thread-message-channel';

interface WorkerThreadMseControllerDependencies extends MseControllerDependencies {
  messageChannel: IWorkerToMainThreadMessageChannel;
}

export class WorkerThreadMseController extends BaseMseController implements IWorkerThreadMseController {
  private readonly messageChannel_: IWorkerToMainThreadMessageChannel;

  public static create(dependencies: WorkerThreadMseControllerDependencies): WorkerThreadMseController {
    const { useManagedMediaSourceIfAvailable } = dependencies.configuration;

    let mediaSource: MediaSource | null;

    if (useManagedMediaSourceIfAvailable && 'ManagedMediaSource' in self) {
      // @ts-expect-error managed media source is available in safari (both worker or main thread)
      mediaSource = ManagedMediaSource.canConstructInDedicatedWorker ? new ManagedMediaSource() : null;
    } else {
      mediaSource = MediaSource.canConstructInDedicatedWorker ? new MediaSource() : null;
    }

    return new WorkerThreadMseController({
      ...dependencies,
      mediaSource,
      logger: dependencies.logger.createSubLogger('WorkerThreadMseController'),
    });
  }

  public constructor(dependencies: WorkerThreadMseControllerDependencies) {
    super(dependencies);
    this.messageChannel_ = dependencies.messageChannel;
  }

  public attach(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.mediaSource_) {
        this.messageChannel_.sendAttachMseFallbackMessage().then((isSuccessful) => {
          isSuccessful ? resolve() : reject();
        });

        return;
      }

      const onOpen = (): void => {
        if (!this.mediaSource_) {
          return;
        }

        this.mediaSource_.onsourceopen = null;
        this.mediaSource_.onsourceclose = null;
        this.mediaSource_.onsourceended = null;

        this.logger_.debug('Media source attach is successful: readyState is "open"');
        resolve();
      };

      const onClose = (): void => {
        if (!this.mediaSource_) {
          return;
        }

        this.mediaSource_.onsourceopen = null;
        this.mediaSource_.onsourceclose = null;
        this.mediaSource_.onsourceended = null;

        this.logger_.debug('Media source attach is not successful: readyState is "closed"');
        reject();
      };

      const onEnd = (): void => {
        if (!this.mediaSource_) {
          return;
        }

        this.mediaSource_.onsourceopen = null;
        this.mediaSource_.onsourceclose = null;
        this.mediaSource_.onsourceended = null;

        this.logger_.debug('Media source attach is not successful: readyState is "ended"');
        reject();
      };

      this.mediaSource_.onsourceopen = onOpen;
      this.mediaSource_.onsourceclose = onClose;
      this.mediaSource_.onsourceended = onEnd;

      // @ts-expect-error mediaSource.handle is available
      this.messageChannel_.sendAttachMseHandleMessage(this.mediaSource_.handle, this.isManagedMediaSource_);
    });
  }
}
