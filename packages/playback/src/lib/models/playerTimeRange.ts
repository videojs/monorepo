import type { IPlayerTimeRange } from '../types/playerTimeRange.declarations';

export class PlayerTimeRange implements IPlayerTimeRange {
  private readonly rangeStart_: number;
  private readonly rangeEnd_: number;

  public constructor(start: number, end: number) {
    this.rangeStart_ = start;
    this.rangeEnd_ = end;
  }

  public get start(): number {
    return this.rangeStart_;
  }

  public get end(): number {
    return this.rangeEnd_;
  }

  public isInRangeInclusive(time: number): boolean {
    return time >= this.rangeStart_ && time <= this.rangeEnd_;
  }

  public isInRangeExclusive(time: number): boolean {
    return time > this.rangeStart_ && time < this.rangeEnd_;
  }

  // Additional Methods
  public isInPast(time: number): boolean {
    return time < this.rangeStart_;
  }

  public isInFuture(time: number): boolean {
    return time > this.rangeEnd_;
  }

  public toString(): string {
    return `{${this.rangeStart_}-->${this.rangeEnd_}}`;
  }

  public static fromTimeRanges(timeRanges: TimeRanges): Array<IPlayerTimeRange> {
    const result = [];

    for (let i = 0; i < timeRanges.length; i++) {
      const start = timeRanges.start(i);
      const end = timeRanges.end(i);

      result.push(new PlayerTimeRange(start, end));
    }

    return result;
  }
}
