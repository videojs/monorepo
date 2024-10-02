import { PlayerError } from './base-player-errors';
import { ErrorCategory, ErrorCode } from '../consts/errors';

abstract class PipelineError extends PlayerError {
  public readonly category = ErrorCategory.Pipeline;
}

export class NoSupportedPipelineError extends PipelineError {
  public readonly code = ErrorCode.NoSupportedPipelines;
  public readonly isFatal: boolean;

  public constructor(isFatal: boolean) {
    super();
    this.isFatal = isFatal;
  }
}

export class PipelineLoaderFailedToDeterminePipelineError extends PipelineError {
  public readonly code = ErrorCode.PipelineLoaderFailedToDeterminePipeline;
  public readonly isFatal: boolean;
  public readonly reason: Error;

  public constructor(isFatal: boolean, reason: Error) {
    super();
    this.isFatal = isFatal;
    this.reason = reason;
  }
}
