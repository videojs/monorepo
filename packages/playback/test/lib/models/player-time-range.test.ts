import { describe, it, expect } from 'vitest';
import { PlayerTimeRange } from '../../../src/lib/models/player-time-range';

class MockTimeRange implements TimeRanges {
  public constructor(private timeRangeArray_: Array<{ start: number; end: number }>) {}

  public get length(): number {
    return this.timeRangeArray_.length;
  }

  public start(index: number): number {
    return this.timeRangeArray_[index].start;
  }

  public end(index: number): number {
    return this.timeRangeArray_[index].end;
  }
}

describe('PlayerTimeRange', () => {
  it('Constructor should correctly set start and end values', () => {
    const playerTimeRange = new PlayerTimeRange(10, 20);
    expect(playerTimeRange.start).toEqual(10);
    expect(playerTimeRange.end).toEqual(20);
  });

  it('isInRangeInclusive should correctly assess if time is within range inclusively', () => {
    const playerTimeRange = new PlayerTimeRange(10, 20);
    expect(playerTimeRange.isInRangeInclusive(15)).toBe(true);
    expect(playerTimeRange.isInRangeInclusive(5)).toBe(false);
    expect(playerTimeRange.isInRangeInclusive(10)).toBe(true); // checking edge case
    expect(playerTimeRange.isInRangeInclusive(20)).toBe(true); // checking edge case
  });

  it('isInRangeExclusive should correctly assess if time is within range exclusively', () => {
    const playerTimeRange = new PlayerTimeRange(10, 20);
    expect(playerTimeRange.isInRangeExclusive(15)).toBe(true);
    expect(playerTimeRange.isInRangeExclusive(10)).toBe(false);
  });

  it('isInPast should correctly assess if time is lesser than range start', () => {
    const playerTimeRange = new PlayerTimeRange(10, 20);
    expect(playerTimeRange.isInPast(5)).toBe(true);
    expect(playerTimeRange.isInPast(15)).toBe(false);
  });

  it('isInFuture should correctly assess if time is greater than range end', () => {
    const playerTimeRange = new PlayerTimeRange(10, 20);
    expect(playerTimeRange.isInFuture(25)).toBe(true);
    expect(playerTimeRange.isInFuture(15)).toBe(false);
  });

  it('fromTimeRanges should correctly create PlayerTimeRanges from TimeRanges', () => {
    const mockTimeRange = new MockTimeRange([
      { start: 10, end: 20 },
      { start: 30, end: 40 },
    ]);
    const playerTimeRanges = PlayerTimeRange.fromTimeRanges(mockTimeRange);

    expect(playerTimeRanges[0].start).toEqual(mockTimeRange.start(0));
    expect(playerTimeRanges[0].end).toEqual(mockTimeRange.end(0));
    expect(playerTimeRanges[1].start).toEqual(mockTimeRange.start(1));
    expect(playerTimeRanges[1].end).toEqual(mockTimeRange.end(1));
  });
});
