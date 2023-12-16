import type { ErrorCategory, ErrorCode } from '../consts/errors';

export default abstract class PlayerError {
  public abstract readonly category: keyof typeof ErrorCategory;
  public abstract readonly code: ErrorCode;
  public abstract readonly critical: boolean;
}
