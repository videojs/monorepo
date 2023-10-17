export enum ErrorCategory {
  Pipeline = 1,
  Network,
}

export enum ErrorCode {
  // pipeline
  NoSupportedPipeline = 1000,
  // network
  RequestInterceptor = 2000,
  ResponseInterceptor,
  NetworkRequestAborted,
  FetchError,
  BadStatus,
  Timeout,
}

export default abstract class PlayerError {
  public abstract readonly category: ErrorCategory;
  public abstract readonly code: ErrorCode;
  public abstract readonly critical: boolean;
}

abstract class PipelineError extends PlayerError {
  public readonly category = ErrorCategory.Pipeline;
}

export class NoSupportedPipelineError extends PipelineError {
  public readonly code = ErrorCode.NoSupportedPipeline;
  public readonly critical = true;
}

abstract class NetworkError extends PlayerError {
  public readonly category = ErrorCategory.Network;
  public readonly critical = false;
}

export class RequestInterceptorNetworkError extends NetworkError {
  public readonly code = ErrorCode.RequestInterceptor;
}

export class ResponseInterceptorNetworkError extends NetworkError {
  public readonly code = ErrorCode.ResponseInterceptor;
}

export class RequestAbortedNetworkError extends NetworkError {
  public readonly code = ErrorCode.NetworkRequestAborted;
}

export class TimeoutNetworkError extends NetworkError {
  public readonly code = ErrorCode.Timeout;
}

export class BadStatusNetworkError extends NetworkError {
  public readonly code = ErrorCode.BadStatus;
  public readonly response: Response;

  public constructor(response: Response) {
    super();

    this.response = response;
  }
}

export class FetchError extends NetworkError {
  public readonly code = ErrorCode.FetchError;
  public readonly fetchError: TypeError;

  public constructor(fetchError: TypeError) {
    super();

    this.fetchError = fetchError;
  }
}
