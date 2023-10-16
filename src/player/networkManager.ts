export enum RequestType {}

export type RequestInterceptor = (requestInit: RequestInit) => RequestInit;

export interface ResponseInterceptor {}

type RequestOptions = RequestInit & { type: RequestType };

type GetOptions = Omit<RequestOptions, 'method' | 'body'>;

type PostOptions = Omit<RequestOptions, 'method'>;

interface NetworkResponse {}

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

  public removeResponseInterceptor(type: RequestType, interceptor: RequestInterceptor): void {
    this.remove(type, interceptor, this.responseInterceptors);
  }

  private async sendRequest(uri: string, method: string, options: RequestOptions): Promise<NetworkResponse> {
    const headers = options.headers ?? new Headers();

    const abortController = new AbortController();

    let requestInit: RequestInit = {
      get method() {
        return method;
      },
      get headers() {
        return headers;
      },
      get signal() {
        return abortController.signal;
      },
    };

    const requestInterceptors = this.requestInterceptors.get(options.type);

    if (requestInterceptors) {
      requestInit = requestInterceptors.reduce((ri: RequestInit, interceptor) => interceptor(ri), requestInit);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const request = new Request(uri, requestInit);

    // TODO  retry wrapper/timeout/abort/progress
    return {};
  }

  public get(uri: string, options: GetOptions): Promise<NetworkResponse> {
    return this.sendRequest(uri, 'GET', options);
  }

  public post(uri: string, options: PostOptions): Promise<NetworkResponse> {
    return this.sendRequest(uri, 'POST', options);
  }
}
