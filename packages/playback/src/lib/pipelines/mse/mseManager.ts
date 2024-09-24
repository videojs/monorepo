import type Logger from '../../utils/logger';

enum OperationType {
  append,
  remove,
}

interface SourceBufferWrapper {
  buffer: SourceBuffer;
  queue: Array<() => Promise<void>>;
}

export default class MseManager {
  private readonly logger_: Logger;
  //TODO: ManagedMediaSource
  private readonly mediaSource_: MediaSource = new MediaSource();
  private readonly sourceBuffers_ = new Map<string, SourceBufferWrapper>();
  private readonly sourceOpen_: Promise<void> = this.initMediaSource_();
  private readonly srcURL_: string = URL.createObjectURL(this.mediaSource_);

  public constructor(logger: Logger) {
    this.logger_ = logger.createSubLogger('MseManager');
  }

  public initBuffers(mimeCodecs: Array<string>): void {
    mimeCodecs.forEach((mimeCodec) => {
      if (MediaSource.isTypeSupported(mimeCodec)) {
        this.addSourceBuffer_(mimeCodec);
      } else {
        throw new Error(`MediaSource cannot create SourceBuffer for type ${mimeCodec}`);
      }
    });
  }

  public appendData(mimeType: string, data: ArrayBuffer): void {
    this.addOperation_(mimeType, OperationType.append, (buffer: SourceBuffer) => buffer.appendBuffer(data));
  }

  public removeData(mimeType: string, start: number, end: number = Infinity): void {
    this.addOperation_(mimeType, OperationType.remove, (buffer: SourceBuffer) => buffer.remove(start, end));
  }

  public getDuration(): number {
    return this.mediaSource_.duration;
  }

  public setLiveSeekableRange(start: number, end: number): void {
    this.mediaSource_.setLiveSeekableRange(start, end);
  }

  public clearLiveSeekableRange(): void {
    this.mediaSource_.clearLiveSeekableRange();
  }

  public getSource(): string {
    return this.srcURL_;
  }

  public changeType(mimeCodec: string): void {
    const mimeType = mimeCodec.substring(0, mimeCodec.indexOf(';'));
    this.sourceBuffers_.get(mimeType)?.buffer.changeType(mimeCodec);
  }

  public buffered(mimeType: string): TimeRanges | undefined {
    return this.sourceBuffers_.get(mimeType)?.buffer.buffered;
  }

  public endOfStream(reason: EndOfStreamError): void {
    this.mediaSource_.endOfStream(reason);
  }

  private initMediaSource_(): Promise<void> {
    return new Promise((resolve) => {
      const sourceOpen = (): void => {
        this.mediaSource_.removeEventListener('sourceopen', sourceOpen);
        resolve();
      };
      this.mediaSource_.addEventListener('sourceopen', sourceOpen);
    });
  }

  private async addSourceBuffer_(mimeCodec: string): Promise<void> {
    // Resolve 'sourceopen' promise before adding source buffers
    await this.sourceOpen_;
    const buffer = this.mediaSource_.addSourceBuffer(mimeCodec);
    const wrappedBuffer: SourceBufferWrapper = {
      buffer,
      queue: [],
    };
    // TODO: Is mymeType the best key?
    // Use the mimeType from the codec string as the key for the source buffer.
    const mimeType = mimeCodec.substring(0, mimeCodec.indexOf(';'));
    this.sourceBuffers_.set(mimeType, wrappedBuffer);
  }

  private removeSourceBuffer_(buffer: SourceBuffer): void {
    this.mediaSource_.removeSourceBuffer(buffer);
  }

  private processQueue_(bufferWrapper: SourceBufferWrapper): void {
    if (bufferWrapper.queue.length > 0) {
      const bufferOperation = bufferWrapper.queue.shift();
      if (bufferOperation) {
        bufferOperation().then(() => {
          this.processQueue_(bufferWrapper);
        });
      }
    }
  }

  private addOperation_(mimeType: string, type: OperationType, bufferFn: (buffer: SourceBuffer) => void): void {
    const bufferWrapper = this.sourceBuffers_.get(mimeType);

    if (!bufferWrapper) {
      this.logger_.error(`No SourceBuffer for ${mimeType}`);
      return;
    }
    const buffer = bufferWrapper.buffer;
    const operation = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        const removeAllEventListeners = (): void => {
          buffer.removeEventListener('updateend', updateEnd);
          buffer.removeEventListener('error', onError);
        };
        const updateEnd = (): void => {
          removeAllEventListeners();
          this.logger_.debug(`${type} complete to ${mimeType} SourceBuffer`);
          resolve();
        };
        const onError = (event: Event): void => {
          removeAllEventListeners();
          this.logger_.warn(`Error ${event.type} ${type} to SourceBuffer of type ${mimeType}`);
          reject();
        };
        buffer.addEventListener('updateend', updateEnd);
        buffer.addEventListener('error', onError);
        try {
          bufferFn(buffer);
        } catch (error) {
          removeAllEventListeners();
          this.logger_.warn(`${error} cannot ${type} data for ${mimeType} to the SourceBuffer`);
        }
      });
    };

    this.logger_.debug(`${type} added to ${mimeType} SourceBuffer operation queue`);
    bufferWrapper.queue.push(operation);
    this.processQueue_(bufferWrapper);
  }
}
