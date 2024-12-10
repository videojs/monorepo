export interface IPlayerTimeRange {
  readonly start: number;
  readonly end: number;
  readonly duration: number;
  isInRangeInclusive(time: number): boolean;
  isInRangeExclusive(time: number): boolean;
  isInPast(time: number): boolean;
  isInFuture(time: number): boolean;
  toString(): string;
}
