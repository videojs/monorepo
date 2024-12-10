import { LinkedListQueue } from '../utils/linked-list-queue';
import type { IMseAppendPayload, IMseController } from '../types/mse-controller';
import type { ILogger } from '../types/logger.declarations';
import type { PlayerMseConfiguration } from '../types/configuration.declarations';
import { MseBufferType } from '../consts/mse-buffer-type';
import { PlayerTimeRange } from '../models/player-time-range';
import type { IPlayerTimeRange } from '../types/player-time-range.declarations';
import { LinkedListNode } from '../utils/linked-list';

export interface MseControllerDependencies {
  mediaSource?: MediaSource | null;
  logger: ILogger;
  configuration: PlayerMseConfiguration;
}

class SourceBufferController {
  private readonly logger_: ILogger;
  private readonly queue_: LinkedListQueue<() => void>;

  private totalDuration_: number = 0;
  private bufferedTimeRangesPerAppends_: LinkedListNode<IPlayerTimeRange> | null = null;
  private sourceBuffer_: SourceBuffer | null = null;
  private mimeType_: string | null = null;

  public constructor(logger: ILogger) {
    this.logger_ = logger;
    this.queue_ = new LinkedListQueue();
  }

  public get hasBuffer(): boolean {
    return this.sourceBuffer_ !== null;
  }

  public get mimeType(): string | null {
    return this.mimeType_;
  }

  public get buffered(): Array<IPlayerTimeRange> {
    return this.sourceBuffer_ ? PlayerTimeRange.fromTimeRanges(this.sourceBuffer_.buffered) : [];
  }

  public updateBuffer(sourceBuffer: SourceBuffer, mimeType: string): void {
    this.sourceBuffer_ = sourceBuffer;
    this.sourceBuffer_.onupdateend = this.getNextFromTheQueueAndExecute_.bind(this);
    this.mimeType_ = mimeType;
  }

  public changeMimeType(mimeType: string): void {
    this.sourceBuffer_?.changeType(mimeType);
    this.mimeType_ = mimeType;
  }

  public appendBuffer(data: Uint8Array): void {
    const before = this.buffered;
    this.sourceBuffer_?.appendBuffer(data);
    const after = this.buffered;

    this.logger_.debug(`source buffer append completed. buffered Range Before Append: (${before})`);
    this.logger_.debug(`source buffer append completed. buffered Range After Append: (${after})`);

    const lastBefore = before.length ? before[before.length - 1] : null;
    const lastAfter = after.length ? after[after.length - 1] : null;

    if (!lastAfter) {
      return;
    }

    let node;

    if (!lastBefore) {
      // eg: before: null, after: 0 -> 5
      // result: 0 -> 5
      node = new LinkedListNode(lastAfter);
    } else {
      // eg: before: 0 -> 5, after: 0 -> 10
      // result: 5 -> 10
      const range = new PlayerTimeRange(lastAfter.end - lastBefore.end, lastAfter.end);
      node = new LinkedListNode(range);
    }

    if (this.bufferedTimeRangesPerAppends_) {
      this.bufferedTimeRangesPerAppends_.next = node;
    } else {
      this.bufferedTimeRangesPerAppends_ = node;
    }

    this.totalDuration_ += node.value.duration;
  }

  public getSafeTrimBufferRange(requiredBufferDuration: number): IPlayerTimeRange | null {
    if (this.totalDuration_ <= requiredBufferDuration) {
      return null;
    }

    if (!this.bufferedTimeRangesPerAppends_) {
      return null;
    }

    let head: LinkedListNode<IPlayerTimeRange> | null = this.bufferedTimeRangesPerAppends_;
    let prev = null;
    let total = this.totalDuration_;

    while (head && total - head.value.duration > requiredBufferDuration) {
      total -= head.value.duration;
      prev = head;
      head = head.next;
    }

    const start = this.bufferedTimeRangesPerAppends_.value.start;
    let end;

    if (head) {
      end = head.value.end;
    } else if (prev) {
      end = prev.value.end;
    } else {
      end = this.bufferedTimeRangesPerAppends_.value.end;
    }

    return new PlayerTimeRange(start, end);
  }

  public trimBuffer(range: IPlayerTimeRange): void {
    if (!this.sourceBuffer_) {
      return;
    }

    this.sourceBuffer_.remove(range.start, range.end);

    if (!this.bufferedTimeRangesPerAppends_) {
      return;
    }

    let head: LinkedListNode<IPlayerTimeRange> | null = this.bufferedTimeRangesPerAppends_;

    while (head && head.value.end <= range.end) {
      this.totalDuration_ -= head.value.duration;
      head = head.next;
    }

    this.bufferedTimeRangesPerAppends_ = head;
  }

  public enqueue(operation: () => void): void {
    this.queue_.enqueue(operation);
    this.getNextFromTheQueueAndExecute_();
  }

  private getNextFromTheQueueAndExecute_(): void {
    if (!this.sourceBuffer_) {
      return;
    }

    if (this.sourceBuffer_.updating) {
      return;
    }

    if (this.queue_.isEmpty) {
      return;
    }

    const headOperation = this.queue_.dequeue();

    if (!headOperation) {
      return;
    }

    headOperation();
  }
}

export class BaseMseController implements IMseController {
  protected readonly mediaSource_: MediaSource | null = null;
  protected readonly logger_: ILogger;

  protected readonly videoBufferController_: SourceBufferController;
  protected readonly audioBufferController_: SourceBufferController;

  protected configuration_: PlayerMseConfiguration;

  public constructor(dependencies: MseControllerDependencies) {
    this.mediaSource_ = dependencies.mediaSource ?? null;
    this.logger_ = dependencies.logger;
    this.configuration_ = dependencies.configuration;
    this.videoBufferController_ = new SourceBufferController(this.logger_.createSubLogger('VideoBufferController'));
    this.audioBufferController_ = new SourceBufferController(this.logger_.createSubLogger('AudioBufferController'));
  }

  protected get isManagedMediaSource_(): boolean {
    // @ts-expect-error mms should be available in Safari
    return this.mediaSource_ instanceof ManagedMediaSource;
  }

  public updateConfiguration(configuration: PlayerMseConfiguration): void {
    this.configuration_ = configuration;
  }

  public dispose(): void {}

  public append(payload: IMseAppendPayload): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.mediaSource_) {
        this.logger_.debug('No available media source during append.');
        reject();
        return;
      }

      if (this.mediaSource_.readyState !== 'open') {
        this.logger_.debug('Media source is not ready to append data.');
        reject();
        return;
      }

      const bufferController =
        payload.type === MseBufferType.Video ? this.videoBufferController_ : this.audioBufferController_;

      let isNewSourceBuffer = false;

      if (!bufferController.hasBuffer) {
        isNewSourceBuffer = true;

        try {
          const sourceBuffer = this.mediaSource_.addSourceBuffer(payload.mimeType);
          bufferController.updateBuffer(sourceBuffer, payload.mimeType);
          this.logger_.debug('creating source buffer for mime type: ', payload.mimeType);
        } catch (e) {
          this.logger_.error('Failed to create source buffer for mime type: ', payload.mimeType, e);
          reject();
          return;
        }
      }

      let data: Uint8Array = payload.data;

      if (payload.initData && (isNewSourceBuffer || bufferController.mimeType !== payload.mimeType)) {
        // if we have init data and this is new source buffer or mime type is different
        const initDataWithSegmentData = new Uint8Array(payload.initData.byteLength + payload.data.byteLength);
        initDataWithSegmentData.set(payload.initData, 0);
        initDataWithSegmentData.set(payload.data, payload.initData.byteLength);
        // override data with concatenated init data and segment data
        data = initDataWithSegmentData;
      }

      const operation = (): void => {
        if (!bufferController.hasBuffer) {
          this.logger_.debug('buffer was removed, while operation was in the queue');
          reject();
          return;
        }

        const safeTrimBufferRange = bufferController.getSafeTrimBufferRange(this.configuration_.requiredBufferDuration);

        if (safeTrimBufferRange) {
          try {
            bufferController.trimBuffer(safeTrimBufferRange);
            this.logger_.debug(`safe trim buffer completed: ${safeTrimBufferRange}`);
          } catch (e) {
            this.logger_.error(`safe trim buffer failed: ${safeTrimBufferRange}`, e);
            reject();
            return;
          }
        }

        if (bufferController.mimeType !== payload.mimeType) {
          const { mimeType } = bufferController;

          try {
            bufferController.changeMimeType(payload.mimeType);
            this.logger_.debug(`changing buffer type: ${mimeType} to ${payload.mimeType}`);
          } catch (e) {
            this.logger_.error(`Failed to change buffer type: ${mimeType} to ${payload.mimeType}`, e);
            reject();
            return;
          }
        }

        if (data.byteLength) {
          try {
            bufferController.appendBuffer(data);
            this.logger_.debug(`${payload.type} source buffer append completed.`);
            resolve();
          } catch (e) {
            this.logger_.error(`${payload.type} source buffer append failed. See error: `, e);
            reject();
            return;
          }
        }
      };

      bufferController.enqueue(operation);
    });
  }
}
