import parse from '@/dash-parser/parse';
import { testString } from '@/dash-parser/examples/mpd';
import { describe, it, expect } from 'bun:test';

describe('dash-parser spec', () => {
  // TODO: create valid tests
  it('testString should give us JSON', () => {
    const parsed = parse(testString);
    expect(parsed.segments.length).toBe(0);
  });
});
