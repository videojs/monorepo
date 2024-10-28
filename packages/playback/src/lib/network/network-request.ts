import type {
  INetworkRequest,
  IRequestPayload,
  IRequestPayloadWithChunkHandler,
  IRequestPayloadWithMapper,
  INetworkRequestInfo,
  INetworkResponseInfo,
  INetworkRequestInterceptor,
  INetworkHooks,
  INetworkExecutor,
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
import type { NetworkConfiguration } from '../types/configuration.declarations';

export interface NetworkRequestDependencies {
  logger: ILogger;
  configuration: NetworkConfiguration;
  requestInterceptor: INetworkRequestInterceptor;
  hooks: INetworkHooks;
  executor: INetworkExecutor;
}

abstract class NetworkRequest<T> implements INetworkRequest<T> {
  private isAborted_ = false;
  private abortController_: AbortController;

  protected readonly logger_: ILogger;
  protected readonly retryWrapper_: RetryWrapper<Response>;
  protected readonly executor_: INetworkExecutor;
  protected readonly requestInterceptor_: INetworkRequestInterceptor;
  protected readonly hooks_: INetworkHooks;

  public abstract readonly done: Promise<T>;

  public readonly requestType: RequestType;
  public readonly configuration: NetworkConfiguration;
  public readonly id: string;

  public get isAborted(): boolean {
    return this.isAborted_;
  }

  protected constructor(id: string, payload: IRequestPayload, dependencies: NetworkRequestDependencies) {
    const { logger, configuration, hooks, requestInterceptor, executor } = dependencies;
    const { requestType, requestInit, url } = payload;

    this.id = id;
    this.configuration = configuration;
    this.requestType = requestType;

    this.logger_ = logger;
    this.hooks_ = hooks;
    this.requestInterceptor_ = requestInterceptor;
    this.executor_ = executor;
    this.abortController_ = new AbortController();

    this.retryWrapper_ = new RetryWrapper({
      ...configuration,
      target: (): Promise<Response> => this.sendRequest_(url, requestInit as RequestInit),
      shouldRetry: (e): boolean => !(e instanceof RequestAbortedNetworkError),
    });
  }

  /**
   * this function is wrapped with retry logic
   * so network manager will apply request interceptors on each network attempt.
   * This make sense, since retry wrapper will gradually increase delay for each attempt,
   * so user's credentials may expire between attempts.
   * @param url - request url
   * @param requestInit - request init
   */
  private async sendRequest_(url: URL, requestInit: RequestInit): Promise<Response> {
    let requestInfo = this.generateRequestInfo_(url.toString(), requestInit);

    try {
      requestInfo = await this.requestInterceptor_(requestInfo);
    } catch (e) {
      // ignore
    }

    const request = new Request(requestInfo.url, { ...requestInfo.requestInit, signal: this.abortController_.signal });

    return await this.wrapNetworkRequestExecutor_(request, requestInfo.requestInit);
  }

  private wrapNetworkRequestExecutor_(request: Request, requestInit: RequestInit): Promise<Response> {
    return new Promise((resolve, reject) => {
      let hitTimeout = false;

      const timeoutId = setTimeout(() => {
        hitTimeout = true;
        this.abortController_.abort();
      }, this.configuration.timeout);

      const onCompleted = (response: Response): void => {
        clearTimeout(timeoutId);

        if (response.ok) {
          this.generateResponseInfo_(response).then((responseInfo) => {
            this.hooks_.onAttemptCompletedSuccessfully(
              this.generateRequestInfo_(request.url, requestInit),
              responseInfo
            );
          });

          resolve(response);
        } else {
          this.generateResponseInfo_(response).then((responseInfo) => {
            this.hooks_.onAttemptCompletedUnsuccessfully(
              this.generateRequestInfo_(request.url, requestInit),
              responseInfo
            );
          });

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
          // we have to re-create abort controller,
          // to update abort signal for the next request attempt
          this.abortController_ = new AbortController();
        } else {
          // aborted externally
          error = new RequestAbortedNetworkError();
          this.isAborted_ = true;
        }

        this.logger_.warn('Attempt Failed: ', error);
        this.hooks_.onAttemptFailed(this.generateRequestInfo_(request.url, requestInit), error);
        reject(error);
      };

      this.hooks_.onAttemptStarted(this.generateRequestInfo_(request.url, requestInit));
      return this.executor_(request).then(onCompleted, onFailed);
    });
  }

  private generateRequestInfo_(url: string, requestInit: RequestInit): INetworkRequestInfo {
    return {
      url,
      requestInit,
      id: this.id,
      configuration: { ...this.configuration },
      requestType: this.requestType,
      attemptInfo: this.retryWrapper_.getAttemptInfo(),
    };
  }

  private async generateResponseInfo_(response: Response): Promise<INetworkResponseInfo> {
    const clone = response.clone();
    let body: ArrayBuffer;
    try {
      body = await clone.arrayBuffer();
    } catch (e) {
      body = new ArrayBuffer(0);
    }

    return {
      url: response.url,
      // @ts-expect-error response.headers is iterable and it has entries method
      headers: Object.fromEntries(response.headers.entries()),
      redirected: response.redirected,
      status: response.status,
      statusText: response.statusText,
      body,
    };
  }

  public abort(reason: string): void {
    return this.abortController_.abort(reason);
  }
}

export class NetworkRequestWithMapper<T> extends NetworkRequest<T> {
  public readonly done: Promise<T>;

  /* v8 ignore start */
  public static create<T>(
    payload: IRequestPayloadWithMapper<T>,
    dependencies: NetworkRequestDependencies
  ): NetworkRequestWithMapper<T> {
    const id = `mapper-${payload.requestType}-${Date.now()}-${(Math.random() * 1000).toFixed()}`;
    dependencies.logger = dependencies.logger.createSubLogger(`NetworkRequestWithMapper (${id})`);

    return new NetworkRequestWithMapper(id, payload, dependencies);
  }
  /* v8 ignore stop */

  public constructor(id: string, payload: IRequestPayloadWithMapper<T>, dependencies: NetworkRequestDependencies) {
    super(id, payload, dependencies);

    this.done = this.retryWrapper_
      .execute()
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => payload.mapper(new Uint8Array(arrayBuffer)));
  }
}

export class NetworkRequestWithChunkHandler extends NetworkRequest<void> {
  public readonly done: Promise<void>;

  /* v8 ignore start */
  public static create(
    payload: IRequestPayloadWithChunkHandler,
    dependencies: NetworkRequestDependencies
  ): NetworkRequestWithChunkHandler {
    const id = `chunk-${payload.requestType}-${Date.now()}-${(Math.random() * 1000).toFixed()}`;
    dependencies.logger = dependencies.logger.createSubLogger(`NetworkRequestWithChunkHandler (${id})`);

    return new NetworkRequestWithChunkHandler(id, payload, dependencies);
  }
  /* v8 ignore stop */

  public constructor(id: string, payload: IRequestPayloadWithChunkHandler, dependencies: NetworkRequestDependencies) {
    super(id, payload, dependencies);

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
