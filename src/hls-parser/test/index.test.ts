import { describe, it, expect } from 'bun:test';
import { parse } from '../index.ts';
import mainPlaylistBase from './playlists/mainPlaylistBase.ts';

describe('hls-parser spec', () => {
  it('should parse m3u8 file', () => {
    expect(
      parse(mainPlaylistBase, {
        warnCallback: console.log,
      })
    ).toEqual({
      m3u: true,
      version: NaN,
      independentSegments: false,
      start: null,
      targetDuration: NaN,
      mediaSequence: 0,
      discontinuitySequence: 0,
      endList: false,
      playlistType: null,
      iFramesOnly: false,
    });
  });
});
