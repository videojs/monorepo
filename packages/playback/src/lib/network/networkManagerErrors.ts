export class RequestInterceptorNetworkError extends Error {}

export class ResponseInterceptorNetworkError extends Error {}

export class RequestAbortedNetworkError extends Error {}

export class TimeoutNetworkError extends Error {}

export class BadStatusNetworkError extends Error {
  public readonly response: Response;

  public constructor(response: Response) {
    super();

    this.response = response;
  }
}

export class FetchError extends Error {
  public readonly fetchError: TypeError;

  public constructor(fetchError: TypeError) {
    super();

    this.fetchError = fetchError;
  }
}
