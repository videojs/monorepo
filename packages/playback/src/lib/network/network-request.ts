import type {
  INetworkInterceptorsProvider,
  INetworkRequest,
  IRequestPayload,
  IRequestPayloadWithChunkHandler,
  IRequestPayloadWithMapper,
} from '../types/network.declarations';
import type { RequestType } from '../consts/request-type';
import RetryWrapper from '../utils/retry-wrapper';
import {
  BadStatusNetworkError,
  FetchError,
  RequestAbortedNetworkError,
  TimeoutNetworkError,
} from './network-manager-errors';
import type { ILogger } from '../types/logger.declarations';
import type { IEventEmitter } from '../types/event-emitter.declarations';
import type { NetworkEventMap } from '../types/event-type-to-event-map.declarations';
import {
  NetworkRequestStartedEvent,
  NetworkRequestFailedEvent,
  NetworkResponseCompletedSuccessfullyEvent,
  NetworkResponseCompletedUnsuccessfullyEvent,
} from '../events/network-events';
import type { NetworkConfiguration } from '../types/configuration.declarations';
import type { RetryInfo } from '../types/retry.declarations';

interface NetworkRequestDependencies {
  logger: ILogger;
  networkInterceptorsProvider: INetworkInterceptorsProvider;
  eventEmitter: IEventEmitter<NetworkEventMap>;
  configuration: NetworkConfiguration;
  executor: (request: Request) => Promise<Response>;
}

abstract class NetworkRequest<T> implements INetworkRequest<T> {
  private static counter_ = 0;

  protected readonly abortController_: AbortController;
  protected readonly logger_: ILogger;
  protected readonly networkInterceptorsProvider_: INetworkInterceptorsProvider;
  protected readonly eventEmitter_: IEventEmitter<NetworkEventMap>;
  protected readonly wrappedSendRequest_: () => Promise<Response>;
  protected readonly executor_: (request: Request) => Promise<Response>;

  public abstract readonly done: Promise<T>;

  public readonly requestType: RequestType;
  public readonly configuration: NetworkConfiguration;
  public readonly id: string;

  protected constructor(payload: IRequestPayload, dependencies: NetworkRequestDependencies) {
    NetworkRequest.counter_++;

    const { logger, networkInterceptorsProvider, configuration, eventEmitter } = dependencies;
    const { requestType, requestInit, url } = payload;
    const { timeout } = configuration;

    this.id = `${NetworkRequest.counter_}--${requestType}`;
    this.logger_ = logger.createSubLogger(`NetworkRequest (${this.id})`);
    this.networkInterceptorsProvider_ = networkInterceptorsProvider;
    this.eventEmitter_ = eventEmitter;
    this.abortController_ = new AbortController();
    this.executor_ = dependencies.executor;
    this.requestType = requestType;
    this.configuration = configuration;

    const retryWrapper = new RetryWrapper(configuration);
    const request = new Request(url, { ...requestInit, signal: this.abortController_.signal });

    this.wrappedSendRequest_ = retryWrapper.wrap<Response>({
      target: () => this.sendRequest_(request, timeout),
      shouldRetry: this.shouldRetry_,
      onRetry: this.onRetry_,
    });
  }

  private readonly shouldRetry_ = (e: Error): boolean => {
    return !(e instanceof RequestAbortedNetworkError);
  };

  private readonly onRetry_ = (retryInfo: RetryInfo): void => {
    this.logger_.debug('Retrying request: ', retryInfo);
  };

  private sendRequest_(request: Request, timeout: number): Promise<Response> {
    return this.applyRequestInterceptors_(request).then((finalRequest) => {
      return new Promise((resolve, reject) => {
        const requestInfo = {
          id: this.id,
          configuration: { ...this.configuration },
          requestType: this.requestType,
          request: finalRequest.clone(),
        };

        let hitTimeout = false;

        const timeoutId = setTimeout(() => {
          hitTimeout = true;
          this.abortController_.abort();
        }, timeout);

        const onCompleted = (response: Response): void => {
          clearTimeout(timeoutId);

          const responseInfo = {
            response: response.clone(),
          };

          if (response.ok) {
            this.eventEmitter_.emitEvent(new NetworkResponseCompletedSuccessfullyEvent(requestInfo, responseInfo));
            resolve(response);
          } else {
            this.eventEmitter_.emitEvent(new NetworkResponseCompletedUnsuccessfullyEvent(requestInfo, responseInfo));
            reject(new BadStatusNetworkError(response));
          }
        };

        const onFailed = (e: DOMException | TypeError): void => {
          clearTimeout(timeoutId);

          const isAbortError = e instanceof DOMException && e.name === 'AbortError';

          let error: Error;

          if (!isAbortError) {
            // some fetch error
            error = new FetchError(e as TypeError);
          } else if (hitTimeout) {
            // aborted from timeout
            error = new TimeoutNetworkError();
          } else {
            // aborted externally
            error = new RequestAbortedNetworkError();
          }

          this.logger_.warn('Request failed: ', error);
          this.eventEmitter_.emitEvent(new NetworkRequestFailedEvent(requestInfo, error));
          reject(error);
        };

        this.eventEmitter_.emitEvent(new NetworkRequestStartedEvent(requestInfo));
        return this.executor_(finalRequest).then(onCompleted, onFailed);
      });
    });
  }

  private async applyRequestInterceptors_(request: Request): Promise<Request> {
    const requestInterceptors = this.networkInterceptorsProvider_.getNetworkRequestInterceptors();

    for (const requestInterceptor of requestInterceptors) {
      try {
        request = await requestInterceptor(request);
      } catch (e) {
        this.logger_.warn('Got an error during request interceptor execution: ', e);
        // ignore interceptors errors
      }
    }

    return request;
  }

  public abort(reason: string): void {
    return this.abortController_.abort(reason);
  }
}

export class NetworkRequestWithMapper<T> extends NetworkRequest<T> {
  public readonly done: Promise<T>;

  public constructor(payload: IRequestPayloadWithMapper<T>, dependencies: NetworkRequestDependencies) {
    super(payload, dependencies);

    this.done = this.wrappedSendRequest_()
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => payload.mapper(new Uint8Array(arrayBuffer)));
  }
}

export class NetworkRequestWithChunkHandler extends NetworkRequest<void> {
  public readonly done: Promise<void>;

  public constructor(payload: IRequestPayloadWithChunkHandler, dependencies: NetworkRequestDependencies) {
    super(payload, dependencies);

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
