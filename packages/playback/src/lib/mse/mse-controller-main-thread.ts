import type { MseControllerDependencies } from './mse-controller-base';
import { BaseMseController } from './mse-controller-base';
import type { IMainThreadMseController } from '../types/mse-controller';

export class MainThreadMseController extends BaseMseController implements IMainThreadMseController {
  public static create(dependencies: MseControllerDependencies): MainThreadMseController {
    const { useManagedMediaSourceIfAvailable } = dependencies.configuration;

    let mediaSource: MediaSource;

    if (useManagedMediaSourceIfAvailable && 'ManagedMediaSource' in self) {
      // @ts-expect-error managed media source is available in safari (both worker or main thread)
      mediaSource = new ManagedMediaSource();
    } else {
      mediaSource = new MediaSource();
    }

    return new MainThreadMseController({
      ...dependencies,
      mediaSource,
      logger: dependencies.logger.createSubLogger('MainThreadMseController'),
    });
  }

  private mediaSourceBlobUrl_: string | null = null;

  public attach(videoElement: HTMLVideoElement, fallbackSource?: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.mediaSourceBlobUrl_) {
        this.logger_.debug('Media source is already attached.');
        resolve();
        return;
      }

      if (!this.mediaSource_) {
        this.logger_.error('No available media source during attach.');
        reject();
        return;
      }

      this.mediaSourceBlobUrl_ = URL.createObjectURL(this.mediaSource_);

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

      if (fallbackSource) {
        /**
         * If we have fallback source we should append 2 source elements: 1st: MSE, 2nd: Fallback.
         * Use-case: Remote playback, for example Airplay will check fallback URL and try to play it.
         */
        const mseSourceElement = document.createElement('source');
        const fallbackSourceElement = document.createElement('source');

        mseSourceElement.setAttribute('src', this.mediaSourceBlobUrl_);
        fallbackSourceElement.setAttribute('src', fallbackSource);

        videoElement.appendChild(mseSourceElement);
        videoElement.appendChild(fallbackSourceElement);
      } else if (this.isManagedMediaSource_) {
        /**
         * If we don't have fallback source, but we use managed media source
         * We should explicitly disable remote playback
         */
        videoElement.src = this.mediaSourceBlobUrl_;
        videoElement.disableRemotePlayback = true;
      } else {
        videoElement.src = this.mediaSourceBlobUrl_;
      }
    });
  }
}
