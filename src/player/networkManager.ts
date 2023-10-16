export enum RequestType {}

export type RequestInterceptor = (requestInit: RequestInit) => RequestInit;

export type ResponseInterceptor = (response: Response) => Response;

type RequestOptions = RequestInit & {
  requestType: RequestType;
  requestTimeout: number;
  fuzzFactor: number;
  delayFactor: number;
  initialDelay: number;
  maxAttempts: number;
};

type GetOptions = Omit<RequestOptions, 'method' | 'body'>;

type PostOptions = Omit<RequestOptions, 'method'>;

interface NetworkRequest {
  abort: (reason: string) => void;
  pending: Promise<Response>;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default class NetworkManager {
  private readonly requestInterceptors: Map<RequestType, Array<RequestInterceptor>> = new Map();
  private readonly responseInterceptors: Map<RequestType, Array<ResponseInterceptor>> = new Map();

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

  public addResponseInterceptor(type: RequestType, interceptor: ResponseInterceptor): void {
    this.add(type, interceptor, this.responseInterceptors);
  }

  public removeResponseInterceptor(type: RequestType, interceptor: ResponseInterceptor): void {
    this.remove(type, interceptor, this.responseInterceptors);
  }

  private async sendRequest(
    uri: string,
    method: string,
    options: RequestOptions,
    abortController: AbortController,
    delay: number,
    attemptCount: number = 0
  ): Promise<Response> {
    if (attemptCount > options.maxAttempts) {
      throw new Error(); // TODO max attempts error
    }

    const headers = options.headers ?? new Headers();

    const requestInit = this.applyRequestInterceptors(
      {
        get method() {
          return method;
        },
        get headers() {
          return headers;
        },
        get signal() {
          return abortController.signal;
        },
      },
      options.requestType
    );

    const request = new Request(uri, requestInit);

    try {
      const fetchWithThrow = this.wrapFetch(request);
      const requestStartTime = performance.now();
      const response = await this.requestWithTimeout(fetchWithThrow, options.requestTimeout);

      void this.sampleBandwidth(response, requestStartTime);

      return this.applyResponseInterceptors(response, options.requestType);
    } catch (e) {
      // do not retry if request was aborted
      if (this.isAbortError(e)) {
        throw new Error(); // TODO: aborted error
      }

      // TODO: do not retry if error is from response interceptors

      await wait(this.applyFuzzFactor(delay, options.fuzzFactor));
      return this.sendRequest(
        uri,
        method,
        options,
        abortController,
        this.applyDelayFactor(delay, options.delayFactor),
        ++attemptCount
      );
    }
  }

  private applyRequestInterceptors(requestInit: RequestInit, requestType: RequestType): RequestInit {
    const requestInterceptors = this.requestInterceptors.get(requestType);

    if (!requestInterceptors) {
      return requestInit;
    }

    try {
      return requestInterceptors.reduce((ri: RequestInit, interceptor) => interceptor(ri), requestInit);
    } catch (e) {
      throw new Error(); // TODO request interceptor error
    }
  }

  private applyResponseInterceptors(response: Response, requestType: RequestType): Response {
    const responseInterceptors = this.responseInterceptors.get(requestType);

    if (!responseInterceptors) {
      return response;
    }

    try {
      return responseInterceptors.reduce((response: Response, interceptor) => interceptor(response), response);
    } catch (e) {
      throw new Error(); // TODO response interceptor error
    }
  }

  private async sampleBandwidth(response: Response, requestStartTime: number): Promise<void> {
    let contentLength = response.headers.get('Content-Length');

    if (!contentLength) {
      return;
    }

    contentLength = Number(contentLength);

    const cloneResponse = response.clone();
    const reader = cloneResponse.body?.getReader();

    if (!reader) {
      return;
    }

    const bytesReceived = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const { done, value } = await reader.read();

        if (done) {
          // TODO: update bandwidth
          break;
        }

        // TODO: update bandwidth
      } catch (e) {
        // ignore
        break;
      }
    }
  }

  private isAbortError(e: unknown): boolean {
    return e instanceof DOMException && e.name === 'AbortError';
  }

  private async wrapFetch(request: Request): Promise<Response> {
    const response = await fetch(request);

    if (response.ok) {
      return response;
    }
    throw new Error(); // TODO: error with status code/text/body
  }

  private requestWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race<T>([
      promise,
      new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(); // TODO: timeout error
        }, timeout);
      }),
    ]);
  }

  private applyFuzzFactor(delay: number, fuzzFactor: number): number {
    /**
     * For example fuzzFactor is 0.1
     * This means ±10% deviation
     * So if we have delay as 1000
     * This function can generate any value from 900 to 1100
     */

    const lowValue = (1 - fuzzFactor) * delay;
    const highValue = (1 + fuzzFactor) * delay;

    return lowValue + Math.random() * (highValue - lowValue);
  }

  private applyDelayFactor(delay: number, delayFactor: number): number {
    const delta = delay * delayFactor;

    return delay + delta;
  }

  private createNetworkRequest(uri: string, method: string, options: RequestOptions): NetworkRequest {
    const abortController = new AbortController();

    const pending = this.sendRequest(uri, 'GET', options, abortController, options.initialDelay);

    return {
      abort: (reason) => abortController.abort(reason),
      pending,
    };
  }

  public get(uri: string, options: GetOptions): NetworkRequest {
    return this.createNetworkRequest(uri, 'GET', options);
  }

  public post(uri: string, options: PostOptions): NetworkRequest {
    return this.createNetworkRequest(uri, 'POST', options);
  }
}
