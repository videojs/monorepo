import type Logger from '../../utils/logger';
import { OperationType, type SourceBufferWrapper } from './types/bufferOperation';

export default class MseManager {
  private readonly logger: Logger;
  //TODO: ManagedMediaSource
  private readonly mediaSource: MediaSource = new MediaSource();
  private readonly sourceBuffers = new Map<string, SourceBufferWrapper>();
  private readonly sourceOpen: Promise<void> = this.initMediaSource();
  private readonly srcURL: string = URL.createObjectURL(this.mediaSource);

  public constructor(logger: Logger) {
    this.logger = logger.createSubLogger('MseManager');
  }

  public initBuffers(mimeCodecs: Array<string>): void {
    mimeCodecs.forEach((mimeCodec) => {
      if (MediaSource.isTypeSupported(mimeCodec)) {
        this.addSourceBuffer(mimeCodec);
      } else {
        throw new Error(`MediaSource cannot create SourceBuffer for type ${mimeCodec}`);
      }
    });
  }

  public appendData(mimeType: string, data: ArrayBuffer): void {
    this.addOperation(mimeType, OperationType.append, (buffer: SourceBuffer) => buffer.appendBuffer(data));
  }

  public removeData(mimeType: string, start: number, end: number = Infinity): void {
    this.addOperation(mimeType, OperationType.remove, (buffer: SourceBuffer) => buffer.remove(start, end));
  }

  public getDuration(): number {
    return this.mediaSource.duration;
  }

  public setLiveSeekableRange(start: number, end: number): void {
    this.mediaSource.setLiveSeekableRange(start, end);
  }

  public clearLiveSeekableRange(): void {
    this.mediaSource.clearLiveSeekableRange();
  }

  public getSource(): string {
    return this.srcURL;
  }

  public changeType(mimeCodec: string): void {
    const mimeType = mimeCodec.substring(0, mimeCodec.indexOf(';'));
    this.sourceBuffers.get(mimeType)?.buffer.changeType(mimeCodec);
  }

  public buffered(mimeType: string): TimeRanges | undefined {
    return this.sourceBuffers.get(mimeType)?.buffer.buffered;
  }

  public endOfStream(reason: EndOfStreamError): void {
    this.mediaSource.endOfStream(reason);
  }

  private initMediaSource(): Promise<void> {
    return new Promise((resolve) => {
      const sourceOpen = (): void => {
        this.mediaSource.removeEventListener('sourceopen', sourceOpen);
        resolve();
      };
      this.mediaSource.addEventListener('sourceopen', sourceOpen);
    });
  }

  private async addSourceBuffer(mimeCodec: string): Promise<void> {
    // Resolve 'sourceopen' promise before adding source buffers
    await this.sourceOpen;
    const buffer = this.mediaSource.addSourceBuffer(mimeCodec);
    const wrappedBuffer: SourceBufferWrapper = {
      buffer,
      queue: [],
    };
    // TODO: Is mymeType the best key?
    // Use the mimeType from the codec string as the key for the source buffer.
    const mimeType = mimeCodec.substring(0, mimeCodec.indexOf(';'));
    this.sourceBuffers.set(mimeType, wrappedBuffer);
  }

  private removeSourceBuffer(buffer: SourceBuffer): void {
    this.mediaSource.removeSourceBuffer(buffer);
  }

  private processQueue(bufferWrapper: SourceBufferWrapper): void {
    if (bufferWrapper.queue.length > 0) {
      const bufferOperation = bufferWrapper.queue.shift();
      if (bufferOperation) {
        bufferOperation().then(() => {
          this.processQueue(bufferWrapper);
        });
      }
    }
  }

  private addOperation(mimeType: string, type: OperationType, bufferFn: (buffer: SourceBuffer) => void): void {
    const bufferWrapper = this.sourceBuffers.get(mimeType);

    if (!bufferWrapper) {
      this.logger.error(`No SourceBuffer for ${mimeType}`);
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
          this.logger.debug(`${type} complete to ${mimeType} SourceBuffer`);
          resolve();
        };
        const onError = (event: Event): void => {
          removeAllEventListeners();
          this.logger.warn(`Error ${event.type} ${type} to SourceBuffer of type ${mimeType}`);
          reject();
        };
        buffer.addEventListener('updateend', updateEnd);
        buffer.addEventListener('error', onError);
        try {
          bufferFn(buffer);
        } catch (error) {
          removeAllEventListeners();
          this.logger.warn(`${error} cannot ${type} data for ${mimeType} to the SourceBuffer`);
        }
      });
    };

    this.logger.debug(`${type} added to ${mimeType} SourceBuffer operation queue`);
    bufferWrapper.queue.push(operation);
    this.processQueue(bufferWrapper);
  }
}
