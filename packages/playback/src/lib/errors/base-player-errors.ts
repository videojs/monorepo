import type { ErrorCategory, ErrorCode } from '../consts/errors';

export abstract class PlayerError {
  public abstract readonly category: ErrorCategory;
  public abstract readonly code: ErrorCode;
  public abstract readonly isFatal: boolean;
}
