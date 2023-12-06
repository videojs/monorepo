import PlayerError from './basePlayerError';
import { ErrorCategory, PipelineErrorCodes } from '../consts/errors';

abstract class PipelineError extends PlayerError {
  public readonly category = ErrorCategory.Pipeline;
}

export class NoSupportedPipelineError extends PipelineError {
  public readonly code = PipelineErrorCodes.NoSupportedPipeline;
  public readonly critical = true;
}
