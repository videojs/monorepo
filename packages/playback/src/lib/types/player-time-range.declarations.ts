export interface IPlayerTimeRange {
  readonly start: number;
  readonly end: number;
  isInRangeInclusive(time: number): boolean;
  isInRangeExclusive(time: number): boolean;
  isInPast(time: number): boolean;
  isInFuture(time: number): boolean;
  toString(): string;
}
