import type {
  INetworkInterceptorsProvider,
  INetworkRequest,
  IRequestPayload,
  IRequestPayloadWithChunkHandler,
  IRequestPayloadWithMapper,
  INetworkRequestInfo,
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
  NetworkRequestAttemptStartedEvent,
  NetworkRequestAttemptFailedEvent,
  NetworkRequestAttemptCompletedSuccessfullyEvent,
  NetworkRequestAttemptCompletedUnsuccessfullyEvent,
} from '../events/network-events';
import type { NetworkConfiguration } from '../types/configuration.declarations';

interface NetworkRequestDependencies {
  logger: ILogger;
  networkInterceptorsProvider: INetworkInterceptorsProvider;
  eventEmitter: IEventEmitter<NetworkEventMap>;
  configuration: NetworkConfiguration;
  executor: (request: Request) => Promise<Response>;
}

abstract class NetworkRequest<T> implements INetworkRequest<T> {
  private static counter_ = 0;

  private isAborted_ = false;

  protected readonly abortController_: AbortController;
  protected readonly logger_: ILogger;
  protected readonly networkInterceptorsProvider_: INetworkInterceptorsProvider;
  protected readonly eventEmitter_: IEventEmitter<NetworkEventMap>;
  protected readonly retryWrapper_: RetryWrapper<Response>;
  protected readonly executor_: (request: Request) => Promise<Response>;

  public abstract readonly done: Promise<T>;

  public readonly requestType: RequestType;
  public readonly configuration: NetworkConfiguration;
  public readonly id: string;

  public get isAborted(): boolean {
    return this.isAborted_;
  }

  protected constructor(payload: IRequestPayload, dependencies: NetworkRequestDependencies) {
    NetworkRequest.counter_++;

    const { logger, networkInterceptorsProvider, configuration, eventEmitter } = dependencies;
    const { requestType, requestInit, url } = payload;

    this.id = `${NetworkRequest.counter_}--${requestType}`;
    this.logger_ = logger.createSubLogger(`NetworkRequest (${this.id})`);
    this.networkInterceptorsProvider_ = networkInterceptorsProvider;
    this.eventEmitter_ = eventEmitter;
    this.abortController_ = new AbortController();
    this.executor_ = dependencies.executor;
    this.requestType = requestType;
    this.configuration = configuration;

    const request = new Request(url, { ...requestInit, signal: this.abortController_.signal });

    this.retryWrapper_ = new RetryWrapper({
      ...configuration,
      target: (): Promise<Response> => this.sendRequest_(request),
      shouldRetry: (e): boolean => !(e instanceof RequestAbortedNetworkError),
    });
  }

  /**
   * this function is wrapped with retry logic
   * so network manager will apply request interceptors on each network attempt.
   * This make sense, since retry wrapper will gradually increase delay for each attempt,
   * so user's credentials may expire between attempts.
   * @param initialRequest - init request
   */
  private async sendRequest_(initialRequest: Request): Promise<Response> {
    const finalRequest = await this.applyRequestInterceptors_(initialRequest);

    return await this.wrapNetworkRequestExecutor_(finalRequest);
  }

  private wrapNetworkRequestExecutor_(request: Request): Promise<Response> {
    return new Promise((resolve, reject) => {
      let hitTimeout = false;

      const timeoutId = setTimeout(() => {
        hitTimeout = true;
        this.abortController_.abort();
      }, this.configuration.timeout);

      const onCompleted = (response: Response): void => {
        clearTimeout(timeoutId);

        const responseInfo = {
          response: response.clone(),
        };

        if (response.ok) {
          this.eventEmitter_.emitEvent(
            new NetworkRequestAttemptCompletedSuccessfullyEvent(this.generateRequestInfo_(request), responseInfo)
          );
          resolve(response);
        } else {
          this.logger_.warn('Attempt Completed Unsuccessfully: ', responseInfo);
          this.eventEmitter_.emitEvent(
            new NetworkRequestAttemptCompletedUnsuccessfullyEvent(this.generateRequestInfo_(request), responseInfo)
          );
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
          this.isAborted_ = true;
        }

        this.logger_.warn('Attempt Failed: ', error);
        this.eventEmitter_.emitEvent(new NetworkRequestAttemptFailedEvent(this.generateRequestInfo_(request), error));
        reject(error);
      };

      this.eventEmitter_.emitEvent(new NetworkRequestAttemptStartedEvent(this.generateRequestInfo_(request)));
      return this.executor_(request).then(onCompleted, onFailed);
    });
  }

  private generateRequestInfo_(request: Request): INetworkRequestInfo {
    return {
      id: this.id,
      configuration: { ...this.configuration },
      requestType: this.requestType,
      request: request.clone(),
      attemptInfo: this.retryWrapper_.getAttemptInfo(),
    };
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

    this.done = this.retryWrapper_
      .execute()
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => payload.mapper(new Uint8Array(arrayBuffer)));
  }
}

export class NetworkRequestWithChunkHandler extends NetworkRequest<void> {
  public readonly done: Promise<void>;

  public constructor(payload: IRequestPayloadWithChunkHandler, dependencies: NetworkRequestDependencies) {
    super(payload, dependencies);

    this.done = this.retryWrapper_.execute().then((response) => {
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
