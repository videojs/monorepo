import type { AttemptInfo } from '../types/retry.declarations';
import { t } from './fn';

interface RetryWrapperOptions<T> {
  maxAttempts: number;
  initialDelay: number;
  delayFactor: number;
  fuzzFactor: number;
  target: (...args: Array<unknown>) => Promise<T>;
  shouldRetry?: (error: Error) => boolean;
}

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export default class RetryWrapper<T> {
  private readonly maxAttempts_: number;
  private readonly initialDelay_: number;
  private readonly delayFactor_: number;
  private readonly fuzzFactor_: number;
  private readonly target_: (...args: Array<unknown>) => Promise<T>;
  private readonly shouldRetry_: (error: Error) => boolean;

  private attemptNumber_: number;
  private currentBaseDelay_: number;

  public constructor(options: RetryWrapperOptions<T>) {
    this.maxAttempts_ = options.maxAttempts;
    this.initialDelay_ = options.initialDelay;
    this.delayFactor_ = options.delayFactor;
    this.fuzzFactor_ = options.fuzzFactor;
    this.target_ = options.target;
    this.shouldRetry_ = options.shouldRetry ?? t;

    this.attemptNumber_ = 1;
    this.currentBaseDelay_ = this.initialDelay_;
  }

  public getAttemptInfo(): AttemptInfo {
    return {
      attemptNumber: this.attemptNumber_,
      currentBaseDelay: this.currentBaseDelay_,
      minDelay: (1 - this.fuzzFactor_) * this.currentBaseDelay_,
      maxDelay: (1 + this.fuzzFactor_) * this.currentBaseDelay_,
    };
  }

  public async execute(...args: Array<unknown>): Promise<T> {
    try {
      return await this.target_(...args);
    } catch (e) {
      const error = e as Error;

      if (this.attemptNumber_ >= this.maxAttempts_) {
        throw error;
      }

      if (!this.shouldRetry_(error)) {
        throw error;
      }

      /**
       * For example fuzzFactor is 0.1
       * This means ±10% deviation
       * So if we have delay as 1000
       * This function will generate min=900 and max=1100
       */
      const { minDelay, maxDelay } = this.getAttemptInfo();
      /**
       * pick up any value from min to max
       */
      const randomizedDelay = minDelay + Math.random() * (maxDelay - minDelay);

      await wait(randomizedDelay);

      this.attemptNumber_++;
      this.currentBaseDelay_ += this.currentBaseDelay_ * this.delayFactor_;

      return this.execute(...args);
    }
  }
}
