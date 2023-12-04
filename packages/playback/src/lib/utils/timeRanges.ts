export default class PlayerTimeRange {
  private readonly rangeStart: number;
  private readonly rangeEnd: number;

  public constructor(start: number, end: number) {
    this.rangeStart = start;
    this.rangeEnd = end;
  }

  public get start(): number {
    return this.rangeStart;
  }

  public get end(): number {
    return this.rangeEnd;
  }

  public isInRangeInclusive(time: number): boolean {
    return time >= this.rangeStart && time <= this.rangeEnd;
  }

  public isInRangeExclusive(time: number): boolean {
    return time > this.rangeStart && time < this.rangeEnd;
  }

  // Additional Methods
  public isInPast(time: number): boolean {
    return time < this.rangeStart;
  }

  public isInFuture(time: number): boolean {
    return time > this.rangeEnd;
  }

  public static fromTimeRanges(timeRanges: TimeRanges): Array<PlayerTimeRange> {
    const result = [];

    for (let i = 0; i < timeRanges.length; i++) {
      const start = timeRanges.start(i);
      const end = timeRanges.end(i);

      result.push(new PlayerTimeRange(start, end));
    }

    return result;
  }
}
