import { describe, expect, it, vi } from 'vitest';
import RetryWrapper from '../../../src/lib/utils/retry-wrapper';
import type { AttemptInfo } from '../../../src/lib/types/retry.declarations';

describe('RetryWrapper', () => {
  // Executes the target function without retries if it succeeds on the first attempt
  it('should execute target function without retries on first attempt', async () => {
    const target = vi.fn().mockResolvedValue('Success');

    const retryWrapper = new RetryWrapper({
      maxAttempts: 3,
      initialDelay: 100,
      delayFactor: 0.5,
      fuzzFactor: 0.1,
      target,
    });

    const result = await retryWrapper.execute();

    expect(result).toBe('Success');
    expect(target).toHaveBeenCalledTimes(1);
  });

  // Throws MaxAttemptsExceeded error when max attempts are exceeded without success
  it('should throw last error from target when max attempts are exceeded without success', async () => {
    const target = vi
      .fn()
      .mockRejectedValueOnce(new Error('Attempt failed 1'))
      .mockRejectedValueOnce(new Error('Attempt failed 2'))
      .mockRejectedValueOnce(new Error('Attempt failed 3'));

    const retryWrapper = new RetryWrapper({
      maxAttempts: 3,
      initialDelay: 100,
      delayFactor: 0.5,
      fuzzFactor: 0.1,
      target,
    });

    await expect(retryWrapper.execute()).rejects.toThrow('Attempt failed 3');
    expect(target).toHaveBeenCalledTimes(3);
  });

  // Successfully retries the target function until it succeeds within max attempts
  it('should retry the target function until it succeeds within max attempts', async () => {
    const target = vi
      .fn()
      .mockRejectedValueOnce(new Error('Attempt failed 1'))
      .mockRejectedValueOnce(new Error('Attempt failed 2'))
      .mockResolvedValueOnce('Success');

    const retryWrapper = new RetryWrapper({
      maxAttempts: 3,
      initialDelay: 100,
      delayFactor: 0.5,
      fuzzFactor: 0.1,
      target,
    });

    const result = await retryWrapper.execute();

    expect(result).toBe('Success');
    expect(target).toHaveBeenCalledTimes(3);
  });

  it('should use initial delay for the first retry and then gradually increase it by applying fuzz factor', async () => {
    // eslint-disable-next-line prefer-const
    let retryWrapper: RetryWrapper<'string'>;

    const result: Array<AttemptInfo> = [];

    const target = vi.fn().mockImplementation(() => {
      result.push(retryWrapper.getAttemptInfo());

      throw new Error('Attempt Failed');
    });

    retryWrapper = new RetryWrapper({
      maxAttempts: 4,
      initialDelay: 100,
      delayFactor: 0.5,
      fuzzFactor: 0.1,
      target,
    });

    await expect(retryWrapper.execute()).rejects.toThrow('Attempt Failed');
    expect(result.length).toBe(4);
    expect(result[0].currentBaseDelay).toBe(100);
    expect(result[0].attemptNumber).toBe(1);
    expect(result[0].minDelay).toBe(0.9 * 100);
    expect(result[0].maxDelay).toBe(1.1 * 100);

    expect(result[1].currentBaseDelay).toBe(150); // 100 + (100 * 0.5)
    expect(result[1].attemptNumber).toBe(2);
    expect(result[1].minDelay).toBe(0.9 * 150);
    expect(result[1].maxDelay).toBe(1.1 * 150);

    expect(result[2].currentBaseDelay).toBe(225); // 150 + (150 * 0.5)
    expect(result[2].attemptNumber).toBe(3);
    expect(result[2].minDelay).toBe(0.9 * 225);
    expect(result[2].maxDelay).toBe(1.1 * 225);

    expect(result[3].currentBaseDelay).toBe(337.5); // 225 + (225 * 0.5)
    expect(result[3].attemptNumber).toBe(4);
    expect(result[3].minDelay).toBe(0.9 * 337.5);
    expect(result[3].maxDelay).toBe(1.1 * 337.5);
  });

  it('should use the provided shouldRetry function to determine if the error should be retried', async () => {
    const target = vi.fn().mockRejectedValue(new Error('Attempt failed'));
    const shouldRetry = vi.fn().mockReturnValue(false);

    const retryWrapper = new RetryWrapper({
      maxAttempts: 3,
      initialDelay: 100,
      delayFactor: 0.5,
      fuzzFactor: 0.1,
      target,
      shouldRetry,
    });

    await expect(retryWrapper.execute()).rejects.toThrow('Attempt failed');
    expect(target).toHaveBeenCalledTimes(1);
  });
});
