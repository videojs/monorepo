import type { RetryInfo } from '../types/retry.declarations';
import { noop, t } from './fn';

class MaxAttemptsExceeded extends Error {
  public constructor() {
    super(`Max attempts number is exceeded.`);
  }
}

type WrappedWithRetry<T> = (...args: Array<unknown>) => Promise<T>;

interface WrapPayload<T> {
  target: (...args: Array<unknown>) => Promise<T>;
  shouldRetry?: (error: Error) => boolean;
  onRetry?: (retryInfo: RetryInfo) => void;
}

interface RetryWrapperOptions {
  maxAttempts: number;
  initialDelay: number;
  delayFactor: number;
  fuzzFactor: number;
}

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export default class RetryWrapper {
  private readonly maxAttempts_: number;
  private readonly initialDelay_: number;
  private readonly delayFactor_: number;
  private readonly fuzzFactor_: number;

  public constructor(options: RetryWrapperOptions) {
    this.maxAttempts_ = options.maxAttempts;
    this.initialDelay_ = options.initialDelay;
    this.delayFactor_ = options.delayFactor;
    this.fuzzFactor_ = options.fuzzFactor;
  }

  public wrap<T>(payload: WrapPayload<T>): WrappedWithRetry<T> {
    const { target, shouldRetry = t, onRetry = noop } = payload;

    let attemptNumber = 1;
    let delay = this.initialDelay_;
    let retryReason: Error;

    const wrapped = async (...args: Array<unknown>): Promise<T> => {
      if (attemptNumber > this.maxAttempts_) {
        if (retryReason) {
          throw retryReason;
        }

        throw new MaxAttemptsExceeded();
      }

      try {
        return await target(...args);
      } catch (e) {
        const error = e as Error;

        if (!shouldRetry(error)) {
          throw error;
        }

        await wait(this.applyFuzzFactor_(delay));

        retryReason = error;
        attemptNumber++;
        delay += delay * this.delayFactor_;

        onRetry({ attemptNumber, delay, retryReason });

        return wrapped(...args);
      }
    };

    return wrapped;
  }

  /**
   * For example fuzzFactor is 0.1
   * This means ±10% deviation
   * So if we have delay as 1000
   * This function can generate any value from 900 to 1100
   * @param delay - current delay
   */
  private applyFuzzFactor_(delay: number): number {
    const lowValue = (1 - this.fuzzFactor_) * delay;
    const highValue = (1 + this.fuzzFactor_) * delay;

    return lowValue + Math.random() * (highValue - lowValue);
  }
}
