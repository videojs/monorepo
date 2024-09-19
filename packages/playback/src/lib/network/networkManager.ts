import {
  BadStatusNetworkError,
  FetchError,
  RequestAbortedNetworkError,
  RequestInterceptorNetworkError,
  ResponseInterceptorNetworkError,
  TimeoutNetworkError,
} from './networkManagerErrors';
import type { RetryWrapperOptions } from '../utils/retryWrapper';
import RetryWrapper from '../utils/retryWrapper';
import type { RequestType } from '../types/network.ts';
import type { ILogger } from '../types/logger.declarations';

export type RequestInterceptor = (request: Request) => Promise<Request>;
export type ResponseHandler = (response: Response) => void;

type RequestInitGet = Omit<RequestInit, 'method' | 'body' | 'signal'>;
type RequestInitPost = Omit<RequestInit, 'method' | 'signal'>;

interface NetworkRequest {
  abort: (reason: string) => void;
  headersReceived: Promise<Response>;
}

interface NetworkRequestWithFullResponse<T> {
  abort: (reason: string) => void;
  done: Promise<T>;
}

interface NetworkRequestWithProgressiveResponse {
  abort: (reason: string) => void;
  done: Promise<void>;
}

interface NetworkManagerDependencies {
  logger: ILogger;
}

export default class NetworkManager {
  public static create(dependencies: NetworkManagerDependencies): NetworkManager {
    return new NetworkManager(dependencies);
  }

  private readonly requestInterceptors_ = new Map<RequestType, Array<RequestInterceptor>>();
  private readonly responseHandlers_ = new Map<RequestType, Array<ResponseHandler>>();

  private readonly logger_: ILogger;

  public constructor(dependencies: NetworkManagerDependencies) {
    this.logger_ = dependencies.logger;
  }

  private add_<T>(type: RequestType, interceptor: T, interceptors: Map<RequestType, Array<T>>): void {
    if (interceptors.has(type)) {
      interceptors.get(type)?.push(interceptor);
    } else {
      interceptors.set(type, [interceptor]);
    }
  }

  private remove_<T>(type: RequestType, interceptorToRemove: T, interceptors: Map<RequestType, Array<T>>): void {
    if (!interceptors.has(type)) {
      return;
    }

    interceptors.set(
      type,
      interceptors.get(type)!.filter((interceptor) => interceptor !== interceptorToRemove)
    );
  }

  public addRequestInterceptor(type: RequestType, interceptor: RequestInterceptor): void {
    this.add_(type, interceptor, this.requestInterceptors_);
  }

  public removeRequestInterceptor(type: RequestType, interceptor: RequestInterceptor): void {
    this.remove_(type, interceptor, this.requestInterceptors_);
  }

  public addResponseHandler(type: RequestType, interceptor: ResponseHandler): void {
    this.add_(type, interceptor, this.responseHandlers_);
  }

  public removeResponseHandler(type: RequestType, interceptor: ResponseHandler): void {
    this.remove_(type, interceptor, this.responseHandlers_);
  }

  public get<T>(
    uri: string,
    type: RequestType,
    requestInit: RequestInitGet,
    retryOptions: RetryWrapperOptions,
    timeout: number,
    mapper: (body: Uint8Array) => T
  ): NetworkRequestWithFullResponse<T> {
    (requestInit as RequestInit).method = 'GET';

    return this.createNetworkRequestWithFullBody_<T>(uri, type, requestInit, retryOptions, timeout, mapper);
  }

  public getProgressive(
    uri: string,
    type: RequestType,
    requestInit: RequestInitGet,
    retryOptions: RetryWrapperOptions,
    timeout: number,
    chunkHandler: (chunk: Uint8Array) => void
  ): NetworkRequestWithProgressiveResponse {
    (requestInit as RequestInit).method = 'GET';

    return this.createProgressiveNetworkRequest_(uri, type, requestInit, retryOptions, timeout, chunkHandler);
  }

  public post<T>(
    uri: string,
    type: RequestType,
    requestInit: RequestInitPost,
    retryOptions: RetryWrapperOptions,
    timeout: number,
    mapper: (body: Uint8Array) => T
  ): NetworkRequestWithFullResponse<T> {
    (requestInit as RequestInit).method = 'POST';

    return this.createNetworkRequestWithFullBody_<T>(uri, type, requestInit, retryOptions, timeout, mapper);
  }

  public postProgressive(
    uri: string,
    type: RequestType,
    requestInit: RequestInitPost,
    retryOptions: RetryWrapperOptions,
    timeout: number,
    chunkHandler: (chunk: Uint8Array) => void
  ): NetworkRequestWithProgressiveResponse {
    (requestInit as RequestInit).method = 'POST';

    return this.createProgressiveNetworkRequest_(uri, type, requestInit, retryOptions, timeout, chunkHandler);
  }

  private createProgressiveNetworkRequest_(
    uri: string,
    type: RequestType,
    requestInit: RequestInit,
    retryOptions: RetryWrapperOptions,
    timeout: number,
    chunkHandler: (chunk: Uint8Array) => void
  ): NetworkRequestWithProgressiveResponse {
    const { abort, headersReceived } = this.createNetworkRequest_(uri, type, requestInit, retryOptions, timeout);

    const done = headersReceived.then((response) => {
      const reader = response.body?.getReader();

      if (!reader) {
        return;
      }

      return this.readFromBodyStream_(reader, chunkHandler);
    });

    headersReceived
      .then((response) => this.applyResponseHandlers_(type, response))
      .catch((e) => {
        this.logger_.debug('Error catched from response handlers: ', e);
      });

    return { done, abort };
  }

  private createNetworkRequestWithFullBody_<T>(
    uri: string,
    type: RequestType,
    requestInit: RequestInitPost,
    retryOptions: RetryWrapperOptions,
    timeout: number,
    mapper: (body: Uint8Array) => T
  ): NetworkRequestWithFullResponse<T> {
    const { abort, headersReceived } = this.createNetworkRequest_(uri, type, requestInit, retryOptions, timeout);

    const chunks: Array<Uint8Array> = [];

    const done = headersReceived
      .then((response) => {
        const reader = response.body?.getReader();

        if (!reader) {
          return;
        }

        return this.readFromBodyStream_(reader, (chunk) => chunks.push(chunk));
      })
      .then(() => {
        const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
        const { fullBody } = chunks.reduce(
          (data, chunk) => {
            data.fullBody.set(chunk, data.offset);
            data.offset += chunk.length;
            return data;
          },
          { fullBody: new Uint8Array(totalLength), offset: 0 }
        );

        return mapper(fullBody);
      });

    headersReceived
      .then((response) => this.applyResponseHandlers_(type, response))
      .catch((e) => {
        this.logger_.debug('Error catched from response handlers: ', e);
      });

    return { done, abort };
  }

  private createNetworkRequest_(
    uri: string,
    type: RequestType,
    requestInit: RequestInit,
    retryOptions: RetryWrapperOptions,
    timeout: number
  ): NetworkRequest {
    const retryWrapper = new RetryWrapper(retryOptions);
    const abortController = new AbortController();
    const request = new Request(uri, requestInit);

    const wrappedSendRequest = retryWrapper.wrap<Response>(
      () => this.sendRequest_(request, type, abortController, timeout),
      (e) => !(e instanceof RequestAbortedNetworkError),
      {
        onAttempt: (diagnosticInfo) => this.logger_.debug('attempt network request: ', diagnosticInfo),
      }
    );

    return {
      abort: () => abortController.abort(),
      headersReceived: wrappedSendRequest(),
    };
  }

  private applyResponseHandlers_(type: RequestType, response: Response): void {
    const responseHandlers = this.responseHandlers_.get(type);

    if (responseHandlers) {
      for (const responseHandler of responseHandlers) {
        try {
          responseHandler(response);
        } catch (e) {
          throw new ResponseInterceptorNetworkError();
        }
      }
    }
  }

  private async sendRequest_(
    request: Request,
    type: RequestType,
    abortController: AbortController,
    timeout: number
  ): Promise<Response> {
    const requestInterceptors = this.requestInterceptors_.get(type);

    if (requestInterceptors) {
      for (const requestInterceptor of requestInterceptors) {
        try {
          request = await requestInterceptor(request);
        } catch (e) {
          throw new RequestInterceptorNetworkError();
        }
      }
    }

    return await this.wrapFetch_(request, abortController, timeout);
  }

  private wrapFetch_(request: Request, abortController: AbortController, timeout: number): Promise<Response> {
    return new Promise((resolve, reject) => {
      let hitTimeout = false;

      const timeoutId = setTimeout(() => {
        hitTimeout = true;
        abortController.abort();
      }, timeout);

      const onResponse = (response: Response): void => {
        clearTimeout(timeoutId);
        response.ok ? resolve(response) : reject(new BadStatusNetworkError(response));
      };

      const onError = (fetchError: DOMException | TypeError): void => {
        clearTimeout(timeoutId);

        if (this.isAbortError_(fetchError)) {
          if (hitTimeout) {
            // abort from timeout:
            reject(new TimeoutNetworkError());
          } else {
            // external abort
            reject(new RequestAbortedNetworkError());
          }
        } else {
          reject(new FetchError(fetchError));
        }
      };

      fetch(request).then(onResponse, onError);
    });
  }

  private isAbortError_(e: unknown): boolean {
    return e instanceof DOMException && e.name === 'AbortError';
  }

  private async readFromBodyStream_(
    reader: ReadableStreamDefaultReader,
    handleChunk: (chunk: Uint8Array) => void
  ): Promise<void> {
    try {
      const { done, value } = await reader.read();

      value && handleChunk(value);

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
