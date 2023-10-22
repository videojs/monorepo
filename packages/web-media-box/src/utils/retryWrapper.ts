interface AttemptDiagnosticInfo {
  attemptNumber: number;
  currentDelaySec: number;
  expectedFuzzedDelayRangeSec: { from: number; to: number };
  retryReason: unknown | undefined;
}

type WrappedWithRetry<T> = {
  (...args: Array<unknown>): Promise<T>;
  attempts: Array<AttemptDiagnosticInfo>;
};

export interface RetryWrapperOptions {
  maxAttempts: number;
  delay: number;
  delayFactor: number;
  fuzzFactor: number;
}

interface RetryWrapperHooks {
  onAttempt?: (diagnosticInfo: AttemptDiagnosticInfo) => void;
}

class MaxAttemptsExceeded extends Error {
  public constructor() {
    super(`Max attempts number is exceeded.`);
  }
}

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export default class RetryWrapper {
  private readonly maxAttempts: number;
  private readonly delay: number;
  private readonly delayFactor: number;
  private readonly fuzzFactor: number;

  public constructor(options: RetryWrapperOptions) {
    this.maxAttempts = options.maxAttempts;
    this.delay = options.delay;
    this.delayFactor = options.delayFactor;
    this.fuzzFactor = options.fuzzFactor;
  }

  public wrap<T>(
    fn: (...args: Array<unknown>) => Promise<T>,
    shouldRetry: (error: unknown) => boolean = (): boolean => true,
    hooks: RetryWrapperHooks = {},
    waitFn = wait
  ): WrappedWithRetry<T> {
    let attemptNumber = 1;
    let delay = this.delay;
    let lastError: unknown | undefined;

    const attempts: Array<AttemptDiagnosticInfo> = [];

    const wrapped = async (...args: Array<unknown>): Promise<T> => {
      if (attemptNumber > this.maxAttempts) {
        if (lastError) {
          throw lastError;
        }

        throw new MaxAttemptsExceeded();
      }

      try {
        const attemptDiagnosticInfo = this.createDiagnosticInfoForAttempt(attemptNumber, delay, lastError);
        attempts.push(attemptDiagnosticInfo);
        hooks.onAttempt?.call(null, attemptDiagnosticInfo);
        return await fn(...args);
      } catch (e) {
        if (!shouldRetry(e)) {
          throw e;
        }

        lastError = e;
        await waitFn(this.applyFuzzFactor(delay));
        attemptNumber++;
        delay = this.applyDelayFactor(delay);
        return wrapped(...args);
      }
    };

    wrapped.attempts = attempts;

    return wrapped;
  }

  /**
   * For example fuzzFactor is 0.1
   * This means ±10% deviation
   * So if we have delay as 1000
   * This function can generate any value from 900 to 1100
   * @param delay
   * @private
   */
  private applyFuzzFactor(delay: number): number {
    const lowValue = (1 - this.fuzzFactor) * delay;
    const highValue = (1 + this.fuzzFactor) * delay;

    return lowValue + Math.random() * (highValue - lowValue);
  }

  private applyDelayFactor(delay: number): number {
    const delta = delay * this.delayFactor;

    return delay + delta;
  }

  private createDiagnosticInfoForAttempt(
    attemptNumber: number,
    delay: number,
    lastError: unknown | undefined
  ): AttemptDiagnosticInfo {
    const fuzzedDelayFrom = (1 - this.fuzzFactor) * delay;
    const fuzzedDelayTo = (1 + this.fuzzFactor) * delay;

    return {
      attemptNumber,
      currentDelaySec: delay / 1000,
      retryReason: lastError,
      expectedFuzzedDelayRangeSec: { from: fuzzedDelayFrom / 1000, to: fuzzedDelayTo / 1000 },
    };
  }
}
