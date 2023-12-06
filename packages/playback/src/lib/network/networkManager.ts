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
import type Logger from '../utils/logger';

export enum RequestType {
  InitSegment,
  Segment,
  DashManifest,
  HlsPlaylist,
  LicenseCertificate,
  LicenseKey,
}

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

export default class NetworkManager {
  private readonly requestInterceptors = new Map<RequestType, Array<RequestInterceptor>>();
  private readonly responseHandlers = new Map<RequestType, Array<ResponseHandler>>();

  private readonly logger: Logger;

  public constructor(logger: Logger) {
    this.logger = logger.createSubLogger('NetworkManager');
  }

  private add<T>(type: RequestType, interceptor: T, interceptors: Map<RequestType, Array<T>>): void {
    if (interceptors.has(type)) {
      interceptors.get(type)?.push(interceptor);
    } else {
      interceptors.set(type, [interceptor]);
    }
  }

  private remove<T>(type: RequestType, interceptorToRemove: T, interceptors: Map<RequestType, Array<T>>): void {
    if (!interceptors.has(type)) {
      return;
    }

    interceptors.set(
      type,
      interceptors.get(type)!.filter((interceptor) => interceptor !== interceptorToRemove)
    );
  }

  public addRequestInterceptor(type: RequestType, interceptor: RequestInterceptor): void {
    this.add(type, interceptor, this.requestInterceptors);
  }

  public removeRequestInterceptor(type: RequestType, interceptor: RequestInterceptor): void {
    this.remove(type, interceptor, this.requestInterceptors);
  }

  public addResponseHandler(type: RequestType, interceptor: ResponseHandler): void {
    this.add(type, interceptor, this.responseHandlers);
  }

  public removeResponseHandler(type: RequestType, interceptor: ResponseHandler): void {
    this.remove(type, interceptor, this.responseHandlers);
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

    return this.createNetworkRequestWithFullBody<T>(uri, type, requestInit, retryOptions, timeout, mapper);
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

    return this.createProgressiveNetworkRequest(uri, type, requestInit, retryOptions, timeout, chunkHandler);
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

    return this.createNetworkRequestWithFullBody<T>(uri, type, requestInit, retryOptions, timeout, mapper);
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

    return this.createProgressiveNetworkRequest(uri, type, requestInit, retryOptions, timeout, chunkHandler);
  }

  private createProgressiveNetworkRequest(
    uri: string,
    type: RequestType,
    requestInit: RequestInit,
    retryOptions: RetryWrapperOptions,
    timeout: number,
    chunkHandler: (chunk: Uint8Array) => void
  ): NetworkRequestWithProgressiveResponse {
    const { abort, headersReceived } = this.createNetworkRequest(uri, type, requestInit, retryOptions, timeout);

    const done = headersReceived.then((response) => {
      const reader = response.body?.getReader();

      if (!reader) {
        return;
      }

      return this.readFromBodyStream(reader, chunkHandler);
    });

    headersReceived
      .then((response) => this.applyResponseHandlers(type, response))
      .catch((e) => {
        this.logger.debug('Error catched from response handlers: ', e);
      });

    return { done, abort };
  }

  private createNetworkRequestWithFullBody<T>(
    uri: string,
    type: RequestType,
    requestInit: RequestInitPost,
    retryOptions: RetryWrapperOptions,
    timeout: number,
    mapper: (body: Uint8Array) => T
  ): NetworkRequestWithFullResponse<T> {
    const { abort, headersReceived } = this.createNetworkRequest(uri, type, requestInit, retryOptions, timeout);

    const chunks: Array<Uint8Array> = [];

    const done = headersReceived
      .then((response) => {
        const reader = response.body?.getReader();

        if (!reader) {
          return;
        }

        return this.readFromBodyStream(reader, (chunk) => chunks.push(chunk));
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
      .then((response) => this.applyResponseHandlers(type, response))
      .catch((e) => {
        this.logger.debug('Error catched from response handlers: ', e);
      });

    return { done, abort };
  }

  private createNetworkRequest(
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
      () => this.sendRequest(request, type, abortController, timeout),
      (e) => !(e instanceof RequestAbortedNetworkError),
      {
        onAttempt: (diagnosticInfo) => this.logger.debug('attempt network request: ', diagnosticInfo),
      }
    );

    return {
      abort: () => abortController.abort(),
      headersReceived: wrappedSendRequest(),
    };
  }

  private applyResponseHandlers(type: RequestType, response: Response): void {
    const responseHandlers = this.responseHandlers.get(type);

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

  private async sendRequest(
    request: Request,
    type: RequestType,
    abortController: AbortController,
    timeout: number
  ): Promise<Response> {
    const requestInterceptors = this.requestInterceptors.get(type);

    if (requestInterceptors) {
      for (const requestInterceptor of requestInterceptors) {
        try {
          request = await requestInterceptor(request);
        } catch (e) {
          throw new RequestInterceptorNetworkError();
        }
      }
    }

    return await this.wrapFetch(request, abortController, timeout);
  }

  private wrapFetch(request: Request, abortController: AbortController, timeout: number): Promise<Response> {
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

        if (this.isAbortError(fetchError)) {
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

  private isAbortError(e: unknown): boolean {
    return e instanceof DOMException && e.name === 'AbortError';
  }

  private async readFromBodyStream(
    reader: ReadableStreamDefaultReader,
    handleChunk: (chunk: Uint8Array) => void
  ): Promise<void> {
    try {
      const { done, value } = await reader.read();

      value && handleChunk(value);

      if (done) {
        return;
      }

      return this.readFromBodyStream(reader, handleChunk);
    } catch (e) {
      reader.releaseLock();
      throw new RequestAbortedNetworkError();
    }
  }
}
