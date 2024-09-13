import { PlayerError } from './basePlayerErrors';
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
