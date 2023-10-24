import { FullPlaylistParser, ProgressiveParser } from '@/hls-parser';
import type { Mock } from 'bun:test';
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import type { ParsedPlaylist } from '@/hls-parser/types/parsedPlaylist';

describe('hls-parser spec', () => {
  let fullPlaylistParser: FullPlaylistParser;
  let progressivePlaylistParser: ProgressiveParser;
  let warnCallback: Mock<(warn: string) => void>;

  const testAllCombinations = (playlist: string, cb: (parsed: ParsedPlaylist) => void): void => {
    const buffer = new Uint8Array(playlist.split('').map((char) => char.charCodeAt(0)));

    cb(fullPlaylistParser.parseFullPlaylistString(playlist));
    cb(fullPlaylistParser.parseFullPlaylistBuffer(buffer));

    progressivePlaylistParser.pushString(playlist);
    cb(progressivePlaylistParser.done());

    progressivePlaylistParser.pushBuffer(buffer);
    cb(progressivePlaylistParser.done());
  };

  beforeEach(() => {
    warnCallback = mock(() => {});

    fullPlaylistParser = new FullPlaylistParser({
      warnCallback,
      // debugCallback: (debug, info): void => console.log('Full Playlist Parser debug: ', debug, info),
    });
    progressivePlaylistParser = new ProgressiveParser({
      warnCallback,
      // debugCallback: (debug, info): void => console.log('Progressive Playlist Parser debug: ', debug, info),
    });
  });

  describe('#EXT-X-VERSION', () => {
    it('should be undefined if it is not presented in playlist', () => {
      const playlist = `#EXTM3U`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.version).toBeUndefined();
      });
    });

    it('should parse value from playlist to a number', () => {
      const playlist = `#EXTM3U\n#EXT-X-VERSION:4`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.version).toBe(4);
      });
    });

    it('should not pare value from playlist if it is not possible to cast to number', () => {
      const playlist = `#EXTM3U\n#EXT-X-VERSION:X`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.version).toBeUndefined();
      });
      expect(warnCallback).toHaveBeenCalledTimes(4);
    });
  });

  describe('#EXT-X-INDEPENDENT-SEGMENTS', () => {
    it('should be false by default', () => {
      const playlist = `#EXTM3U`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.independentSegments).toBe(false);
      });
    });

    it('should be true if presented in a playlist', () => {
      const playlist = `#EXTM3U\n#EXT-X-INDEPENDENT-SEGMENTS`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.independentSegments).toBe(true);
      });
    });
  });

  describe('#EXT-X-START', () => {
    it('should be undefined by default', () => {
      const playlist = `#EXTM3U`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.start).toBeUndefined();
      });
    });

    it('should parse values from a playlist', () => {
      const playlist = '#EXTM3U\n#EXT-X-START:TIME-OFFSET=12,PRECISE=YES';

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.start?.timeOffset).toBe(12);
        expect(parsed.start?.precise).toBe(true);
      });
    });

    it('should not parse values if required attributes are not presented', () => {
      const playlist = '#EXTM3U\n#EXT-X-START:PRECISE=YES';

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.start).toBeUndefined();
      });
    });

    it('precise should fallback to false if not presented', () => {
      const playlist = '#EXTM3U\n#EXT-X-START:TIME-OFFSET=12';

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.start?.timeOffset).toBe(12);
        expect(parsed.start?.precise).toBe(false);
      });
    });
  });

  describe('#EXT-X-TARGETDURATION', () => {
    it('should be undefined if it is not presented in playlist', () => {
      const playlist = `#EXTM3U`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.targetDuration).toBeUndefined();
      });
    });

    it('should parse value from playlist to a number', () => {
      const playlist = `#EXTM3U\n#EXT-X-TARGETDURATION:5`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.targetDuration).toBe(5);
      });
    });

    it('should not pare value from playlist if it is not possible to cast to number', () => {
      const playlist = `#EXTM3U\n#EXT-X-TARGETDURATION:X`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.targetDuration).toBeUndefined();
      });
      expect(warnCallback).toHaveBeenCalledTimes(4);
    });
  });

  describe('#EXT-X-MEDIA-SEQUENCE', () => {
    it('should be undefined if it is not presented in playlist', () => {
      const playlist = `#EXTM3U`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.mediaSequence).toBeUndefined();
      });
    });

    it('should parse value from playlist to a number', () => {
      const playlist = `#EXTM3U\n#EXT-X-MEDIA-SEQUENCE:10`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.mediaSequence).toBe(10);
      });
    });

    it('should not pare value from playlist if it is not possible to cast to number', () => {
      const playlist = `#EXTM3U\n#EXT-X-MEDIA-SEQUENCE:X`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.mediaSequence).toBeUndefined();
      });
      expect(warnCallback).toHaveBeenCalledTimes(4);
    });

    it('should be used as initial value for segments', () => {
      const playlist = `#EXTM3U
#EXT-X-MEDIA-SEQUENCE:2
#EXTINF:9.9766,\t
main.ts
#EXTINF:9.9433,\t
main.ts
#EXTINF:10.01,\t
main.ts`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.segments[0].mediaSequence).toBe(2);
        expect(parsed.segments[1].mediaSequence).toBe(3);
        expect(parsed.segments[2].mediaSequence).toBe(4);
      });
    });

    it('Should set initial value as 0 if media sequence is not presented', () => {
      const playlist = `#EXTM3U
#EXTINF:9.9766,\t
main.ts
#EXTINF:9.9433,\t
main.ts
#EXTINF:10.01,\t
main.ts`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.segments[0].mediaSequence).toBe(0);
        expect(parsed.segments[1].mediaSequence).toBe(1);
        expect(parsed.segments[2].mediaSequence).toBe(2);
      });
    });
  });

  describe('#EXT-X-DISCONTINUITY-SEQUENCE', () => {
    it('should be undefined if it is not presented in playlist', () => {
      const playlist = `#EXTM3U`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.discontinuitySequence).toBeUndefined();
      });
    });

    it('should parse value from playlist to a number', () => {
      const playlist = `#EXTM3U\n#EXT-X-DISCONTINUITY-SEQUENCE:10`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.discontinuitySequence).toBe(10);
      });
    });

    it('should not pare value from playlist if it is not possible to cast to number', () => {
      const playlist = `#EXTM3U\n#EXT-X-DISCONTINUITY-SEQUENCE:X`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.discontinuitySequence).toBeUndefined();
      });
      expect(warnCallback).toHaveBeenCalledTimes(4);
    });

    it('should be used as initial value for segments', () => {
      const playlist = `#EXTM3U
#EXT-X-DISCONTINUITY-SEQUENCE:2
#EXTINF:9.9766,\t
main.ts
#EXTINF:9.9433,\t
main.ts
#EXTINF:10.01,\t
main.ts
#EXT-X-DISCONTINUITY
#EXTINF:10.01,\t
main.ts
#EXTINF:10.01,\t
main.ts`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.segments[0].discontinuitySequence).toBe(2);
        expect(parsed.segments[1].discontinuitySequence).toBe(2);
        expect(parsed.segments[2].discontinuitySequence).toBe(2);
        expect(parsed.segments[3].discontinuitySequence).toBe(3);
        expect(parsed.segments[4].discontinuitySequence).toBe(3);
      });
    });

    it('Should set initial value as 0 if media sequence is not presented', () => {
      const playlist = `#EXTM3U
#EXTINF:9.9766,\t
main.ts
#EXTINF:9.9433,\t
main.ts
#EXTINF:10.01,\t
main.ts
#EXT-X-DISCONTINUITY
#EXTINF:10.01,\t
main.ts
#EXTINF:10.01,\t
main.ts`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.segments[0].discontinuitySequence).toBe(0);
        expect(parsed.segments[1].discontinuitySequence).toBe(0);
        expect(parsed.segments[2].discontinuitySequence).toBe(0);
        expect(parsed.segments[3].discontinuitySequence).toBe(1);
        expect(parsed.segments[4].discontinuitySequence).toBe(1);
      });
    });
  });

  describe('#EXT-X-ENDLIST', () => {
    it('should be false by default', () => {
      const playlist = `#EXTM3U`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.endList).toBe(false);
      });
    });

    it('should be parsed from a playlist regardless of its location', () => {
      const playlist = `#EXTM3U
#EXT-X-ENDLIST
#EXTINF:9.9766,\t
main.ts
#EXTINF:9.9433,\t
main.ts
#EXTINF:10.01,\t
main.ts
#EXT-X-DISCONTINUITY
#EXTINF:10.01,\t
main.ts
#EXTINF:10.01,\t
main.ts
`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.endList).toBe(true);
      });
    });
  });

  describe('#EXT-X-PLAYLIST-TYPE', () => {
    it('should be undefined by default', () => {
      const playlist = `#EXTM3U`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.playlistType).toBeUndefined();
      });
    });

    it('should be parsed from playlist', () => {
      let playlist = `#EXTM3U\n#EXT-X-PLAYLIST-TYPE:EVENT`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.playlistType).toBe('EVENT');
      });

      playlist = `#EXTM3U\n#EXT-X-PLAYLIST-TYPE:VOD`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.playlistType).toBe('VOD');
      });
    });

    it('should not be parsed from playlist if value is not an EVENT or VOD', () => {
      const playlist = `#EXTM3U\n#EXT-X-PLAYLIST-TYPE:LIVE`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.playlistType).toBeUndefined();
      });
      expect(warnCallback).toHaveBeenCalledTimes(4);
    });
  });

  describe('#EXT-X-I-FRAMES-ONLY', () => {
    it('should be false by default', () => {
      const playlist = `#EXTM3U`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.iFramesOnly).toBe(false);
      });
    });

    it('should be parsed from a playlist', () => {
      const playlist = `#EXTM3U\n#EXT-X-I-FRAMES-ONLY`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.iFramesOnly).toBe(true);
      });
    });
  });
});
