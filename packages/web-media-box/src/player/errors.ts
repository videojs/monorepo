export enum ErrorCategory {
  Pipeline,
}

export enum ErrorCode {
  // pipeline
  NoSupportedPipelines,
}

export default abstract class PlayerError {
  public abstract readonly category: ErrorCategory;
  public abstract readonly code: ErrorCode;
  public abstract readonly critical: boolean;
}

export class NoSupportedPipelinesError extends PlayerError {
  public readonly category = ErrorCategory.Pipeline;
  public readonly code = ErrorCode.NoSupportedPipelines;
  public readonly critical = true;
}
