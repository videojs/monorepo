import type {
  INetworkRequest,
  IRequestPayload,
  IRequestPayloadWithChunkHandler,
  IRequestPayloadWithMapper,
} from '../types/networkingManager.declarations';
import type { RequestType } from '../consts/requestType';
import RetryWrapper from '../utils/retryWrapper';
import {
  BadStatusNetworkError,
  FetchError,
  RequestAbortedNetworkError,
  TimeoutNetworkError,
} from './networkManagerErrors';
import type { ILogger } from '../types/logger.declarations';

abstract class NetworkRequest<T> implements INetworkRequest<T> {
  private readonly abortController_: AbortController;

  protected wrappedSendRequest_: () => Promise<Response>;

  public abstract readonly done: Promise<T>;

  public readonly requestType: RequestType;

  protected constructor(payload: IRequestPayload, logger: ILogger) {
    const { requestType, requestInit, url, configuration } = payload;
    const { timeout } = configuration;

    this.abortController_ = new AbortController();
    this.requestType = requestType;

    const retryWrapper = new RetryWrapper(configuration);
    const request = new Request(url, requestInit);

    this.wrappedSendRequest_ = retryWrapper.wrap<Response>(
      () => this.sendRequest_(request, timeout),
      (e) => !(e instanceof RequestAbortedNetworkError),
      {
        onAttempt: (diagnosticInfo) => {
          logger.debug('attempt network request: ', diagnosticInfo);
        },
      }
    );
  }

  private sendRequest_(request: Request, timeout: number): Promise<Response> {
    return new Promise((resolve, reject) => {
      let hitTimeout = false;

      const timeoutId = setTimeout(() => {
        hitTimeout = true;
        this.abortController_.abort();
      }, timeout);

      const onResponse = (response: Response): void => {
        clearTimeout(timeoutId);
        response.ok ? resolve(response) : reject(new BadStatusNetworkError(response));
      };

      const onError = (fetchError: DOMException | TypeError): void => {
        clearTimeout(timeoutId);

        const isAbortError = fetchError instanceof DOMException && fetchError.name === 'AbortError';

        if (!isAbortError) {
          reject(new FetchError(fetchError));
          return;
        }

        if (hitTimeout) {
          reject(new TimeoutNetworkError());
          return;
        }

        reject(new RequestAbortedNetworkError());
      };

      fetch(request).then(onResponse, onError);
    });
  }

  public abort(reason: string): void {
    return this.abortController_.abort(reason);
  }
}

export class NetworkRequestWithMapper<T> extends NetworkRequest<T> {
  public readonly done: Promise<T>;

  public constructor(payload: IRequestPayloadWithMapper<T>, logger: ILogger) {
    super(payload, logger);

    this.done = this.wrappedSendRequest_()
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => payload.mapper(new Uint8Array(arrayBuffer)));
  }
}

export class NetworkRequestWithChunkHandler extends NetworkRequest<void> {
  public readonly done: Promise<void>;

  public constructor(payload: IRequestPayloadWithChunkHandler, logger: ILogger) {
    super(payload, logger);

    this.done = this.wrappedSendRequest_().then((response) => {
      const reader = response.body?.getReader();

      if (!reader) {
        return;
      }

      return this.readFromBodyStream_(reader, payload.chunkHandler);
    });
  }

  private async readFromBodyStream_(
    reader: ReadableStreamDefaultReader,
    handleChunk: (chunk: Uint8Array) => void
  ): Promise<void> {
    try {
      const { done, value } = await reader.read();

      if (value) {
        handleChunk(value);
      }

      if (done) {
        return;
      }

      return this.readFromBodyStream_(reader, handleChunk);
    } catch (e) {
      reader.releaseLock();
      throw new RequestAbortedNetworkError();
    }
  }
}
