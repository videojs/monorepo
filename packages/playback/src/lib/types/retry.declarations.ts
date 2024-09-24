export interface RetryInfo {
  attemptNumber: number;
  delay: number;
  retryReason: Error;
}
