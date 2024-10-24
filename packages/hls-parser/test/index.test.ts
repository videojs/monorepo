import { FullPlaylistParser, ChunkPlaylistParser } from '../src';
import type { ParsedPlaylist, ParseOptions } from '../src';
import type { Mock } from 'vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('hls-parser spec', () => {
  const baseUrl = 'https://baseurl.com';

  let fullPlaylistParser: FullPlaylistParser;
  let chunkPlaylistParser: ChunkPlaylistParser;
  let warnCallback: Mock<(warn: string) => void>;

  const testAllCombinations = (
    playlist: string,
    cb: (parsed: ParsedPlaylist) => void,
    options: ParseOptions = { baseUrl }
  ): void => {
    const buffer = new Uint8Array(playlist.split('').map((char) => char.charCodeAt(0)));

    cb(fullPlaylistParser.parse(playlist, options));
    cb(fullPlaylistParser.parse(buffer, options));

    chunkPlaylistParser.push(playlist, options);
    cb(chunkPlaylistParser.done());

    chunkPlaylistParser.push(buffer, options);
    cb(chunkPlaylistParser.done());
  };

  beforeEach(() => {
    warnCallback = vi.fn(() => {});

    fullPlaylistParser = new FullPlaylistParser({
      warnCallback,
      // debugCallback: (debug, info): void => console.log('Full Playlist Parser debug: ', debug, info),
    });
    chunkPlaylistParser = new ChunkPlaylistParser({
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

  describe('#EXT-X-PART-INF', () => {
    it('should be undefined by default', () => {
      const playlist = `#EXTM3U`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.partInf).toBeUndefined();
      });
    });

    it('should not parse infor from a playlist if required attributes are not presented', () => {
      const playlist = `#EXTM3U\n#EXT-X-PART-INF`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.partInf).toBeUndefined();
      });

      expect(warnCallback).toHaveBeenCalledTimes(4);
    });

    it('should parse info from a playlist', () => {
      const playlist = `#EXTM3U\n#EXT-X-PART-INF:PART-TARGET=3`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.partInf?.partTarget).toBe(3);
      });
    });
  });

  describe('#EXT-X-SERVER-CONTROL', () => {
    it('should be undefined by default', () => {
      const playlist = `#EXTM3U`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.serverControl).toBeUndefined();
      });
    });

    it('should parse info from a playlist', () => {
      let playlist = `#EXTM3U\n#EXT-X-SERVER-CONTROL`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.serverControl?.holdBack).toBeUndefined();
        expect(parsed.serverControl?.canSkipUntil).toBeUndefined();
        expect(parsed.serverControl?.partHoldBack).toBeUndefined();
        expect(parsed.serverControl?.canBlockReload).toBe(false);
        expect(parsed.serverControl?.canSkipDateRanges).toBe(false);
      });

      playlist = `#EXTM3U\n#EXT-X-SERVER-CONTROL:HOLD-BACK=5,PART-HOLD-BACK=5,CAN-SKIP-UNTIL=10,CAN-BLOCK-RELOAD=YES,CAN-SKIP-DATERANGES=YES`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.serverControl?.holdBack).toBe(5);
        expect(parsed.serverControl?.canSkipUntil).toBe(10);
        expect(parsed.serverControl?.partHoldBack).toBe(5);
        expect(parsed.serverControl?.canBlockReload).toBe(true);
        expect(parsed.serverControl?.canSkipDateRanges).toBe(true);
      });
    });

    it('should fallback holdBack and partHoldBack if target durations are presented', () => {
      const playlist = `#EXTM3U\n#EXT-X-TARGETDURATION:5\n#EXT-X-PART-INF:PART-TARGET=3\n#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.serverControl?.holdBack).toBe(15);
        expect(parsed.serverControl?.canSkipUntil).toBeUndefined();
        expect(parsed.serverControl?.partHoldBack).toBe(9);
        expect(parsed.serverControl?.canBlockReload).toBe(true);
        expect(parsed.serverControl?.canSkipDateRanges).toBe(false);
      });
    });
  });

  describe('#EXTINF', () => {
    it('should parse from a playlist', () => {
      let playlist = `#EXTM3U
#EXTINF:5,segment-title-1
segment-1.ts
#EXTINF:5,segment-title-2
segment-2.ts
#EXTINF:5,segment-title-3
segment-3.ts
#EXTINF:5,segment-title-4
segment-4.ts
`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.segments[0]?.title).toBe('segment-title-1');
        expect(parsed.segments[0]?.uri).toBe('segment-1.ts');
        expect(parsed.segments[0]?.duration).toBe(5);
        expect(parsed.segments[0]?.startTime).toBe(0);
        expect(parsed.segments[0]?.endTime).toBe(5);

        expect(parsed.segments[1]?.title).toBe('segment-title-2');
        expect(parsed.segments[1]?.uri).toBe('segment-2.ts');
        expect(parsed.segments[1]?.duration).toBe(5);
        expect(parsed.segments[1]?.startTime).toBe(5);
        expect(parsed.segments[1]?.endTime).toBe(10);

        expect(parsed.segments[2]?.title).toBe('segment-title-3');
        expect(parsed.segments[2]?.uri).toBe('segment-3.ts');
        expect(parsed.segments[2]?.duration).toBe(5);
        expect(parsed.segments[2]?.startTime).toBe(10);
        expect(parsed.segments[2]?.endTime).toBe(15);

        expect(parsed.segments[3]?.title).toBe('segment-title-4');
        expect(parsed.segments[3]?.uri).toBe('segment-4.ts');
        expect(parsed.segments[3]?.duration).toBe(5);
        expect(parsed.segments[3]?.startTime).toBe(15);
        expect(parsed.segments[3]?.endTime).toBe(20);
      });

      playlist = `#EXTM3U
#EXTINF:5,segment-title-1
segment-1.ts
#EXTINF:5,segment-title-2
segment-2.ts
#EXTINF:5,segment-title-3
segment-3.ts
#EXTINF:5,segment-title-4
segment-4.ts
`;

      testAllCombinations(
        playlist,
        (parsed) => {
          expect(parsed.segments[0]?.title).toBe('segment-title-1');
          expect(parsed.segments[0]?.uri).toBe('segment-1.ts');
          expect(parsed.segments[0]?.duration).toBe(5);
          expect(parsed.segments[0]?.startTime).toBe(25);
          expect(parsed.segments[0]?.endTime).toBe(30);

          expect(parsed.segments[1]?.title).toBe('segment-title-2');
          expect(parsed.segments[1]?.uri).toBe('segment-2.ts');
          expect(parsed.segments[1]?.duration).toBe(5);
          expect(parsed.segments[1]?.startTime).toBe(30);
          expect(parsed.segments[1]?.endTime).toBe(35);

          expect(parsed.segments[2]?.title).toBe('segment-title-3');
          expect(parsed.segments[2]?.uri).toBe('segment-3.ts');
          expect(parsed.segments[2]?.duration).toBe(5);
          expect(parsed.segments[2]?.startTime).toBe(35);
          expect(parsed.segments[2]?.endTime).toBe(40);

          expect(parsed.segments[3]?.title).toBe('segment-title-4');
          expect(parsed.segments[3]?.uri).toBe('segment-4.ts');
          expect(parsed.segments[3]?.duration).toBe(5);
          expect(parsed.segments[3]?.startTime).toBe(40);
          expect(parsed.segments[3]?.endTime).toBe(45);
        },
        {
          baseTime: 25,
          baseUrl,
        }
      );
    });

    it('should fallback to 0, if value is invalid', () => {
      const playlist = `#EXTM3U
#EXTINF:X
main.ts
`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.segments[0].duration).toBe(0);
      });

      expect(warnCallback).toHaveBeenCalledTimes(4);
    });
  });

  describe('#EXT-X-BYTERANGE', () => {
    it('should be undefined by default', () => {
      const playlist = `#EXTM3U
#EXT-X-TARGETDURATION:11
#EXT-X-VERSION:4
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:9.9766,\t
main.ts
#EXTINF:9.9433,\t
main.ts
#EXTINF:10.01,\t
main.ts
`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.segments[0]?.byteRange).toBeUndefined();
        expect(parsed.segments[1]?.byteRange).toBeUndefined();
        expect(parsed.segments[2]?.byteRange).toBeUndefined();
      });
    });

    it('should parse values from a playlist', () => {
      const playlist = `#EXTM3U
#EXT-X-TARGETDURATION:11
#EXT-X-VERSION:4
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:9.9766,\t
#EXT-X-BYTERANGE:5@5
main.ts
#EXTINF:9.9433,\t
#EXT-X-BYTERANGE:10@10
main.ts
#EXTINF:10.01,\t
#EXT-X-BYTERANGE:15@20
main.ts
`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.segments[0]?.byteRange?.start).toBe(5);
        expect(parsed.segments[0]?.byteRange?.end).toBe(9);
        expect(parsed.segments[1]?.byteRange?.start).toBe(10);
        expect(parsed.segments[1]?.byteRange?.end).toBe(19);
        expect(parsed.segments[2]?.byteRange?.start).toBe(20);
        expect(parsed.segments[2]?.byteRange?.end).toBe(34);
      });
    });

    it(`If o is not present, the sub-range begins at the next byte following the sub-range of the previous Media Segment`, () => {
      const playlist = `#EXTM3U
#EXT-X-TARGETDURATION:11
#EXT-X-VERSION:4
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:9.9766,\t
#EXT-X-BYTERANGE:5@0
main.ts
#EXTINF:9.9433,\t
#EXT-X-BYTERANGE:10
main.ts
#EXTINF:10.01,\t
#EXT-X-BYTERANGE:15
main.ts
`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.segments[0]?.byteRange?.start).toBe(0);
        expect(parsed.segments[0]?.byteRange?.end).toBe(4);
        expect(parsed.segments[1]?.byteRange?.start).toBe(5);
        expect(parsed.segments[1]?.byteRange?.end).toBe(14);
        expect(parsed.segments[2]?.byteRange?.start).toBe(15);
        expect(parsed.segments[2]?.byteRange?.end).toBe(29);
      });
    });
  });

  describe('#EXT-X-DISCONTINUITY', () => {
    it('timeline should be 0 by default', () => {
      const playlist = `#EXTM3U
#EXT-X-TARGETDURATION:11
#EXT-X-VERSION:4
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:9.9766,\t
#EXT-X-BYTERANGE:5@0
main.ts
#EXTINF:9.9433,\t
#EXT-X-BYTERANGE:10
main.ts
#EXTINF:10.01,\t
#EXT-X-BYTERANGE:15
main.ts
`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.segments[0]?.discontinuitySequence).toBe(0);
        expect(parsed.segments[0]?.isDiscontinuity).toBe(false);
        expect(parsed.segments[1]?.discontinuitySequence).toBe(0);
        expect(parsed.segments[1]?.isDiscontinuity).toBe(false);
        expect(parsed.segments[2]?.discontinuitySequence).toBe(0);
        expect(parsed.segments[2]?.isDiscontinuity).toBe(false);
      });
    });

    it('should parse from a playlist', () => {
      const playlist = `#EXTM3U
#EXT-X-TARGETDURATION:11
#EXT-X-VERSION:4
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:9.9766,\t
main.ts
#EXTINF:9.9433,\t
main.ts
#EXTINF:10.01,\t
main.ts
#EXT-X-DISCONTINUITY
#EXTINF:9.9766,\t
main.ts
#EXTINF:9.9433,\t
main.ts
#EXTINF:10.01,\t
main.ts
#EXT-X-DISCONTINUITY
#EXTINF:9.9766,\t
main.ts
#EXTINF:9.9433,\t
main.ts
#EXTINF:10.01,\t
main.ts
#EXT-X-DISCONTINUITY
#EXTINF:9.9766,\t
main.ts
#EXTINF:9.9433,\t
main.ts
#EXTINF:10.01,\t
main.ts
`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.segments[0]?.discontinuitySequence).toBe(0);
        expect(parsed.segments[0]?.isDiscontinuity).toBe(false);

        expect(parsed.segments[1]?.discontinuitySequence).toBe(0);
        expect(parsed.segments[1]?.isDiscontinuity).toBe(false);

        expect(parsed.segments[2]?.discontinuitySequence).toBe(0);
        expect(parsed.segments[2]?.isDiscontinuity).toBe(false);

        expect(parsed.segments[3]?.discontinuitySequence).toBe(1);
        expect(parsed.segments[3]?.isDiscontinuity).toBe(true);

        expect(parsed.segments[4]?.discontinuitySequence).toBe(1);
        expect(parsed.segments[4]?.isDiscontinuity).toBe(false);

        expect(parsed.segments[5]?.discontinuitySequence).toBe(1);
        expect(parsed.segments[5]?.isDiscontinuity).toBe(false);

        expect(parsed.segments[6]?.discontinuitySequence).toBe(2);
        expect(parsed.segments[6]?.isDiscontinuity).toBe(true);

        expect(parsed.segments[7]?.discontinuitySequence).toBe(2);
        expect(parsed.segments[7]?.isDiscontinuity).toBe(false);

        expect(parsed.segments[8]?.discontinuitySequence).toBe(2);
        expect(parsed.segments[8]?.isDiscontinuity).toBe(false);

        expect(parsed.segments[9]?.discontinuitySequence).toBe(3);
        expect(parsed.segments[9]?.isDiscontinuity).toBe(true);

        expect(parsed.segments[10]?.discontinuitySequence).toBe(3);
        expect(parsed.segments[10]?.isDiscontinuity).toBe(false);

        expect(parsed.segments[11]?.discontinuitySequence).toBe(3);
        expect(parsed.segments[11]?.isDiscontinuity).toBe(false);
      });
    });
  });

  describe('#EXT-X-KEY', () => {
    it('should be undefined by default', () => {
      const playlist = `#EXTM3U
#EXTINF:4.0107,
segment-1.ts
#EXTINF:4.0107,
segment-2.ts
#EXTINF:4.0107,
segment-3.ts
`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.segments[0].encryption).toBeUndefined();
        expect(parsed.segments[1].encryption).toBeUndefined();
        expect(parsed.segments[2].encryption).toBeUndefined();
      });
    });

    it('should parse from a playlist', () => {
      let playlist = `#EXTM3U
#EXT-X-KEY:METHOD=AES-128,URI="https://my-key.com",IV=0x00000000000000000000000000000000
#EXTINF:4.0107,
segment-1.ts
#EXT-X-KEY:METHOD=AES-128,URI="https://my-key.com",IV=0x00000000000000000000000000000001
#EXTINF:4.0107,
segment-2.ts
#EXT-X-KEY:METHOD=AES-128,URI="https://my-key.com",IV=0x00000000000000000000000000000002
#EXTINF:4.0107,
segment-3.ts
`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.segments[0].encryption?.method).toBe('AES-128');
        expect(parsed.segments[0].encryption?.uri).toBe('https://my-key.com');
        expect(parsed.segments[0].encryption?.iv).toBe('0x00000000000000000000000000000000');

        expect(parsed.segments[1].encryption?.method).toBe('AES-128');
        expect(parsed.segments[1].encryption?.uri).toBe('https://my-key.com');
        expect(parsed.segments[1].encryption?.iv).toBe('0x00000000000000000000000000000001');

        expect(parsed.segments[2].encryption?.method).toBe('AES-128');
        expect(parsed.segments[2].encryption?.uri).toBe('https://my-key.com');
        expect(parsed.segments[2].encryption?.iv).toBe('0x00000000000000000000000000000002');
      });

      playlist = `#EXTM3U
#EXT-X-KEY:METHOD=AES-128,URI="https://my-key.com",IV=0x00000000000000000000000000000000
#EXTINF:4.0107,
segment-1.ts
#EXTINF:4.0107,
segment-2.ts
#EXTINF:4.0107,
segment-3.ts
`;
      testAllCombinations(playlist, (parsed) => {
        expect(parsed.segments[0].encryption?.method).toBe('AES-128');
        expect(parsed.segments[0].encryption?.uri).toBe('https://my-key.com');
        expect(parsed.segments[0].encryption?.iv).toBe('0x00000000000000000000000000000000');

        expect(parsed.segments[1].encryption?.method).toBe('AES-128');
        expect(parsed.segments[1].encryption?.uri).toBe('https://my-key.com');
        expect(parsed.segments[1].encryption?.iv).toBe('0x00000000000000000000000000000000');

        expect(parsed.segments[2].encryption?.method).toBe('AES-128');
        expect(parsed.segments[2].encryption?.uri).toBe('https://my-key.com');
        expect(parsed.segments[2].encryption?.iv).toBe('0x00000000000000000000000000000000');
      });
    });

    it('should add encryption for media initialization', () => {
      const playlist = `#EXTM3U
#EXT-X-KEY:METHOD=AES-128,URI="https://my-key.com",IV=0x00000000000000000000000000000000
#EXT-X-MAP:URI="init-segment.mp4",BYTERANGE=5@0
#EXTINF:4.0107,
segment-1.ts
#EXT-X-MAP:URI="init-segment.mp4",BYTERANGE=5@5
#EXTINF:4.0107,
segment-2.ts
#EXT-X-MAP:URI="init-segment.mp4",BYTERANGE=5@10
#EXTINF:4.0107,
segment-3.ts
`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.segments[0].map?.encryption?.uri).toBe('https://my-key.com');
        expect(parsed.segments[0].map?.encryption?.method).toBe('AES-128');
        expect(parsed.segments[0].map?.encryption?.iv).toBe('0x00000000000000000000000000000000');

        expect(parsed.segments[1].map?.encryption?.uri).toBe('https://my-key.com');
        expect(parsed.segments[1].map?.encryption?.method).toBe('AES-128');
        expect(parsed.segments[1].map?.encryption?.iv).toBe('0x00000000000000000000000000000000');

        expect(parsed.segments[2].map?.encryption?.uri).toBe('https://my-key.com');
        expect(parsed.segments[2].map?.encryption?.method).toBe('AES-128');
        expect(parsed.segments[2].map?.encryption?.iv).toBe('0x00000000000000000000000000000000');
      });
    });
  });

  describe('#EXT-X-MAP', () => {
    it('should be undefined by default', () => {
      const playlist = `#EXTM3U
#EXT-X-KEY:METHOD=AES-128,URI="https://my-key.com",IV=0x00000000000000000000000000000000
#EXTINF:4.0107,
segment-1.ts
#EXTINF:4.0107,
segment-2.ts
#EXTINF:4.0107,
segment-3.ts
`;
      testAllCombinations(playlist, (parsed) => {
        expect(parsed.segments[0].map).toBeUndefined();
        expect(parsed.segments[1].map).toBeUndefined();
        expect(parsed.segments[2].map).toBeUndefined();
      });
    });

    it('should parse data from a playlist', () => {
      const playlist = `#EXTM3U
#EXT-X-KEY:METHOD=AES-128,URI="https://my-key.com",IV=0x00000000000000000000000000000000
#EXT-X-MAP:URI="init-segment.mp4",BYTERANGE=5@0
#EXTINF:4.0107,
segment-1.ts
#EXT-X-MAP:URI="init-segment.mp4",BYTERANGE=5@5
#EXTINF:4.0107,
segment-2.ts
#EXT-X-MAP:URI="init-segment.mp4",BYTERANGE=5@10
#EXTINF:4.0107,
segment-3.ts
`;
      testAllCombinations(playlist, (parsed) => {
        expect(parsed.segments[0].map?.uri).toBe('init-segment.mp4');
        expect(parsed.segments[0].map?.byteRange?.start).toBe(0);
        expect(parsed.segments[0].map?.byteRange?.end).toBe(4);

        expect(parsed.segments[1].map?.uri).toBe('init-segment.mp4');
        expect(parsed.segments[1].map?.byteRange?.start).toBe(5);
        expect(parsed.segments[1].map?.byteRange?.end).toBe(9);

        expect(parsed.segments[2].map?.uri).toBe('init-segment.mp4');
        expect(parsed.segments[2].map?.byteRange?.start).toBe(10);
        expect(parsed.segments[2].map?.byteRange?.end).toBe(14);
      });
    });
  });

  describe('#EXT-X-PROGRAM-DATE-TIME', () => {
    it('should be undefined by default', () => {
      const playlist = `#EXTM3U
#EXT-X-KEY:METHOD=AES-128,URI="https://my-key.com",IV=0x00000000000000000000000000000000
#EXT-X-MAP:URI="init-segment.mp4",BYTERANGE=5@0
#EXTINF:4.0107,
segment-1.ts
#EXT-X-MAP:URI="init-segment.mp4",BYTERANGE=5@5
#EXTINF:4.0107,
segment-2.ts
#EXT-X-MAP:URI="init-segment.mp4",BYTERANGE=5@10
#EXTINF:4.0107,
segment-3.ts
`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.segments[0].programDateTimeStart).toBeUndefined();
        expect(parsed.segments[0].programDateTimeEnd).toBeUndefined();
        expect(parsed.segments[1].programDateTimeStart).toBeUndefined();
        expect(parsed.segments[1].programDateTimeEnd).toBeUndefined();
        expect(parsed.segments[2].programDateTimeStart).toBeUndefined();
        expect(parsed.segments[2].programDateTimeEnd).toBeUndefined();
      });
    });

    it('should extrapolate program date time forward', () => {
      const playlist = `#EXTM3U
#EXT-X-PROGRAM-DATE-TIME:2023-10-28T18:11:24.010Z
#EXTINF:4
segment-1.ts
#EXTINF:4
segment-2.ts
#EXTINF:4
segment-3.ts
`;
      testAllCombinations(playlist, (parsed) => {
        expect(parsed.segments[0].programDateTimeStart).toBe(1698516684010);
        expect(parsed.segments[0].programDateTimeEnd).toBe(1698516684010 + 4000);
        expect(parsed.segments[1].programDateTimeStart).toBe(1698516684010 + 4000);
        expect(parsed.segments[1].programDateTimeEnd).toBe(1698516684010 + 4000 + 4000);
        expect(parsed.segments[2].programDateTimeStart).toBe(1698516684010 + 4000 + 4000);
        expect(parsed.segments[2].programDateTimeEnd).toBe(1698516684010 + 4000 + 4000 + 4000);
      });
    });

    it('should extrapolate program date time backward', () => {
      const playlist = `#EXTM3U
#EXTINF:4
segment-1.ts
#EXTINF:4
segment-2.ts
#EXT-X-PROGRAM-DATE-TIME:2023-10-28T18:11:24.010Z
#EXTINF:4
segment-3.ts
`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.segments[0].programDateTimeStart).toBe(1698516684010 - 4000 - 4000);
        expect(parsed.segments[0].programDateTimeEnd).toBe(1698516684010 - 4000);
        expect(parsed.segments[1].programDateTimeStart).toBe(1698516684010 - 4000);
        expect(parsed.segments[1].programDateTimeEnd).toBe(1698516684010);
        expect(parsed.segments[2].programDateTimeStart).toBe(1698516684010);
        expect(parsed.segments[2].programDateTimeEnd).toBe(1698516684010 + 4000);
      });
    });
  });

  describe('#EXT-X-GAP', () => {
    it('should be false by default', () => {
      const playlist = `#EXTM3U
#EXTINF:4
segment-1.ts
#EXTINF:4
segment-2.ts
#EXTINF:4
segment-3.ts
`;
      testAllCombinations(playlist, (parsed) => {
        expect(parsed.segments[0].isGap).toBe(false);
        expect(parsed.segments[1].isGap).toBe(false);
        expect(parsed.segments[2].isGap).toBe(false);
      });
    });

    it('should parse data from a playlist', () => {
      const playlist = `#EXTM3U
#EXT-X-GAP
#EXTINF:4
segment-1.ts
#EXTINF:4
segment-2.ts
#EXT-X-GAP
#EXTINF:4
segment-3.ts
`;
      testAllCombinations(playlist, (parsed) => {
        expect(parsed.segments[0].isGap).toBe(true);
        expect(parsed.segments[1].isGap).toBe(false);
        expect(parsed.segments[2].isGap).toBe(true);
      });
    });
  });

  describe('#EXT-X-BITRATE', () => {
    it('should be undefined by default', () => {
      const playlist = `#EXTM3U
#EXT-X-GAP
#EXTINF:4
segment-1.ts
#EXTINF:4
segment-2.ts
#EXT-X-GAP
#EXTINF:4
segment-3.ts
`;
      testAllCombinations(playlist, (parsed) => {
        expect(parsed.segments[0].bitrate).toBeUndefined();
        expect(parsed.segments[1].bitrate).toBeUndefined();
        expect(parsed.segments[2].bitrate).toBeUndefined();
      });
    });

    it('should apply bitrate to a segment, unless it has byte-range', () => {
      const playlist = `#EXTM3U
#EXT-X-BITRATE:111111
#EXTINF:4
segment-1.ts
#EXTINF:4
segment-2.ts
#EXT-X-BYTERANGE:5@0
#EXTINF:4
segment-3.ts
`;
      testAllCombinations(playlist, (parsed) => {
        expect(parsed.segments[0].bitrate).toBe(111111);
        expect(parsed.segments[1].bitrate).toBe(111111);
        expect(parsed.segments[2].bitrate).toBeUndefined();
      });
    });
  });

  describe('#EXT-X-PART', () => {
    it('should be emty list by default', () => {
      const playlist = `#EXTM3U
#EXT-X-BITRATE:111111
#EXTINF:4
segment-1.ts
#EXTINF:4
segment-2.ts
#EXT-X-BYTERANGE:5@0
#EXTINF:4
segment-3.ts
`;
      testAllCombinations(playlist, (parsed) => {
        expect(parsed.segments[0].parts.length).toBe(0);
        expect(parsed.segments[1].parts.length).toBe(0);
        expect(parsed.segments[2].parts.length).toBe(0);
      });
    });

    it('should parse data from a playlist', () => {
      const playlist = `#EXTM3U
#EXT-X-PART:DURATION=2,INDEPENDENT=YES,URI="part-1.0.mp4"
#EXT-X-PART:DURATION=2,URI="part-1.1.mp4"
#EXTINF:4
segment-1.mp4
#EXT-X-PART:DURATION=2,INDEPENDENT=YES,URI="part-2.0.mp4"
#EXT-X-PART:DURATION=2,URI="part-2.1.mp4"
#EXTINF:4
segment-2.mp4
#EXT-X-BYTERANGE:5@0
#EXTINF:4
segment-3.mp4
`;
      testAllCombinations(playlist, (parsed) => {
        expect(parsed.segments[0].parts.length).toBe(2);

        expect(parsed.segments[0].parts[0].isGap).toBe(false);
        expect(parsed.segments[0].parts[0].independent).toBe(true);
        expect(parsed.segments[0].parts[0].uri).toBe('part-1.0.mp4');
        expect(parsed.segments[0].parts[0].duration).toBe(2);
        expect(parsed.segments[0].parts[0].byteRange).toBeUndefined();

        expect(parsed.segments[0].parts[1].isGap).toBe(false);
        expect(parsed.segments[0].parts[1].independent).toBe(false);
        expect(parsed.segments[0].parts[1].uri).toBe('part-1.1.mp4');
        expect(parsed.segments[0].parts[1].duration).toBe(2);
        expect(parsed.segments[0].parts[1].byteRange).toBeUndefined();

        expect(parsed.segments[1].parts.length).toBe(2);

        expect(parsed.segments[1].parts[0].isGap).toBe(false);
        expect(parsed.segments[1].parts[0].independent).toBe(true);
        expect(parsed.segments[1].parts[0].uri).toBe('part-2.0.mp4');
        expect(parsed.segments[1].parts[0].duration).toBe(2);
        expect(parsed.segments[1].parts[0].byteRange).toBeUndefined();

        expect(parsed.segments[1].parts[1].isGap).toBe(false);
        expect(parsed.segments[1].parts[1].independent).toBe(false);
        expect(parsed.segments[1].parts[1].uri).toBe('part-2.1.mp4');
        expect(parsed.segments[1].parts[1].duration).toBe(2);
        expect(parsed.segments[1].parts[1].byteRange).toBeUndefined();

        expect(parsed.segments[2].parts.length).toBe(0);
      });
    });
  });

  describe('#EXT-X-DATERANGE', () => {
    it('should be empty list by default', () => {
      const playlist = `#EXTM3U
#EXTINF:4
segment-1.mp4
#EXTINF:4
segment-2.mp4
#EXTINF:4
segment-3.mp4
`;
      testAllCombinations(playlist, (parsed) => {
        expect(parsed.dateRanges.length).toBe(0);
      });
    });

    it('should parse from a playlist', () => {
      const playlist = `#EXTM3U
#EXT-X-DATERANGE:ID="splice-6FFFFFF0",START-DATE="2014-03-05T11:15:00Z",PLANNED-DURATION=59.993,SCTE35-OUT=0xFC002F000000000000FF000014056FFFFFF000E081622DCAFF000052636200000000000A0008029896F50000008700000000
#EXTINF:4
segment-1.mp4
#EXTINF:4
segment-2.mp4
#EXT-X-BYTERANGE:5@0
#EXTINF:4
segment-3.mp4
#EXT-X-DATERANGE:ID="splice-6FFFFFF1",X-CUSTOM-ATTRIBUTE=12,START-DATE="2014-03-05T11:15:00Z",PLANNED-DURATION=59.993,SCTE35-OUT=0xFC002F000000000000FF000014056FFFFFF000E081622DCAFF000052636200000000000A0008029896F50000008700000000
`;
      testAllCombinations(playlist, (parsed) => {
        expect(parsed.dateRanges.length).toBe(2);

        expect(parsed.dateRanges[0].id).toBe('splice-6FFFFFF0');
        expect(parsed.dateRanges[0].startDate).toBe(1394018100000);
        expect(parsed.dateRanges[0].plannedDuration).toBe(59.993);
        expect(parsed.dateRanges[0].clientAttributes).toEqual({});
        expect(parsed.dateRanges[0].scte35Out).toEqual(
          new Uint8Array([
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 14, 5, 0, 0, 0, 0, 0, 0, 81, 62, 0, 0, 0, 0, 0, 52, 63, 62, 0, 0, 0, 0,
            0, 0, 0, 8, 2, 98, 96, 0, 0, 0, 0, 87, 0, 0, 0, 0,
          ])
        );

        expect(parsed.dateRanges[1].id).toBe('splice-6FFFFFF1');
        expect(parsed.dateRanges[1].startDate).toBe(1394018100000);
        expect(parsed.dateRanges[1].plannedDuration).toBe(59.993);
        expect(parsed.dateRanges[1].clientAttributes).toEqual({ 'X-CUSTOM-ATTRIBUTE': '12' });

        expect(parsed.dateRanges[1].scte35Out).toEqual(
          new Uint8Array([
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 14, 5, 0, 0, 0, 0, 0, 0, 81, 62, 0, 0, 0, 0, 0, 52, 63, 62, 0, 0, 0, 0,
            0, 0, 0, 8, 2, 98, 96, 0, 0, 0, 0, 87, 0, 0, 0, 0,
          ])
        );
      });
    });
  });

  describe('#EXT-X-SKIP', () => {
    it('should be undefined by default', () => {
      const playlist = `#EXTM3U`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.skip).toBeUndefined();
      });
    });

    it('should parse from a playlist', () => {
      const playlist = `#EXTM3U\n#EXT-X-SKIP:SKIPPED-SEGMENTS=10,RECENTLY-REMOVED-DATERANGES="1\t2\t3\t4"`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.skip?.skippedSegments).toBe(10);
        expect(parsed.skip?.recentlyRemovedDateRanges).toEqual(['1', '2', '3', '4']);
      });
    });
  });

  describe('#EXT-X-PRELOAD-HINT', () => {
    it('should be empty by default', () => {
      const playlist = `#EXTM3U`;
      testAllCombinations(playlist, (parsed) => {
        expect(parsed.preloadHints).toEqual({});
      });
    });

    it('should parse from a playlist', () => {
      let playlist = `#EXTM3U
#EXT-X-PRELOAD-HINT:TYPE=MAP,URI="preload-hint-uri-map"
#EXT-X-PRELOAD-HINT:TYPE=PART,URI="preload-hint-uri"
`;
      testAllCombinations(playlist, (parsed) => {
        // range: entire resource
        expect(parsed.preloadHints).toEqual({
          map: { uri: 'preload-hint-uri-map', resolvedUri: `${baseUrl}/preload-hint-uri-map` },
          part: { uri: 'preload-hint-uri', resolvedUri: `${baseUrl}/preload-hint-uri` },
        });
      });

      playlist = `#EXTM3U
#EXT-X-PRELOAD-HINT:TYPE=MAP,URI="preload-hint-uri-map",BYTERANGE-START=5
#EXT-X-PRELOAD-HINT:TYPE=PART,URI="preload-hint-uri",BYTERANGE-START=10
`;
      testAllCombinations(playlist, (parsed) => {
        // range: from 10 till end of the resource
        expect(parsed.preloadHints).toEqual({
          map: {
            uri: 'preload-hint-uri-map',
            resolvedUri: `${baseUrl}/preload-hint-uri-map`,
            byteRange: { start: 5, end: Number.MAX_SAFE_INTEGER },
          },
          part: {
            uri: 'preload-hint-uri',
            resolvedUri: `${baseUrl}/preload-hint-uri`,
            byteRange: { start: 10, end: Number.MAX_SAFE_INTEGER },
          },
        });
      });

      playlist = `#EXTM3U
#EXT-X-PRELOAD-HINT:TYPE=MAP,URI="preload-hint-uri-map",BYTERANGE-START=5,BYTERANGE-LENGTH=10
#EXT-X-PRELOAD-HINT:TYPE=PART,URI="preload-hint-uri",BYTERANGE-START=10,BYTERANGE-LENGTH=20
`;
      testAllCombinations(playlist, (parsed) => {
        // range: from 10 till 29
        expect(parsed.preloadHints).toEqual({
          map: {
            uri: 'preload-hint-uri-map',
            resolvedUri: `${baseUrl}/preload-hint-uri-map`,
            byteRange: { start: 5, end: 14 },
          },
          part: {
            uri: 'preload-hint-uri',
            resolvedUri: `${baseUrl}/preload-hint-uri`,
            byteRange: { start: 10, end: 29 },
          },
        });
      });

      playlist = `#EXTM3U
#EXT-X-PRELOAD-HINT:TYPE=MAP,URI="preload-hint-uri-map",BYTERANGE-LENGTH=20
#EXT-X-PRELOAD-HINT:TYPE=PART,URI="preload-hint-uri",BYTERANGE-LENGTH=20
`;
      testAllCombinations(playlist, (parsed) => {
        // range: from 0 till 19
        expect(parsed.preloadHints).toEqual({
          map: {
            uri: 'preload-hint-uri-map',
            resolvedUri: `${baseUrl}/preload-hint-uri-map`,
            byteRange: { start: 0, end: 19 },
          },
          part: {
            uri: 'preload-hint-uri',
            resolvedUri: `${baseUrl}/preload-hint-uri`,
            byteRange: { start: 0, end: 19 },
          },
        });
      });
    });
  });

  describe('#EXT-X-RENDITION-REPORT', () => {
    it('should be empty by default', () => {
      const playlist = `#EXTM3U`;
      testAllCombinations(playlist, (parsed) => {
        expect(parsed.renditionReports).toEqual([]);
      });
    });

    it('should parse form a playlist', () => {
      const playlist = `#EXTM3U
#EXT-X-RENDITION-REPORT:URI=rendition-1,LAST-MSN=10,LAST-PART=2
#EXT-X-RENDITION-REPORT:URI=rendition-2,LAST-MSN=10
#EXT-X-RENDITION-REPORT:URI=rendition-3
`;
      testAllCombinations(playlist, (parsed) => {
        expect(parsed.renditionReports).toEqual([
          { uri: 'rendition-1', resolvedUri: `${baseUrl}/rendition-1`, lastMsn: 10, lastPart: 2 },
          { uri: 'rendition-2', resolvedUri: `${baseUrl}/rendition-2`, lastMsn: 10 },
          { uri: 'rendition-3', resolvedUri: `${baseUrl}/rendition-3` },
        ]);
      });
    });
  });

  describe('#EXT-X-STREAM-INF', () => {
    it('should be empty by default', () => {
      const playlist = `#EXTM3U`;
      testAllCombinations(playlist, (parsed) => {
        expect(parsed.variantStreams).toEqual([]);
      });
    });

    it('should parse from a playlist', () => {
      const playlist = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=123,AVERAGE-BANDWIDTH=123,SCORE=2.5,CODECS="mp4a.40.2, avc1.4d401e",SUPPLEMENTAL-CODECS="dvh1.08.07/db4h, dvh1.08.08/db4h",RESOLUTION=416x234,FRAME-RATE=50,HDCP-LEVEL=TYPE-1,ALLOWED-CPC="com.example.drm1:SMART-TV/PC,com.example.drm2:HW",VIDEO-RANGE=SDR,STABLE-VARIANT-ID="stream-1-id",AUDIO="audio-group-id",VIDEO="video-group-id",SUBTITLES="subtitles-group-id",CLOSED-CAPTIONS="closed-captions-group-id",PATHWAY-ID="pathway-id"
stream-1.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=234
stream-2.m3u8
`;
      testAllCombinations(playlist, (parsed) => {
        expect(parsed.variantStreams.length).toBe(2);
        expect(parsed.variantStreams[0]).toEqual({
          uri: 'stream-1.m3u8',
          resolvedUri: `${baseUrl}/stream-1.m3u8`,
          bandwidth: 123,
          averageBandwidth: 123,
          score: 2.5,
          codecs: ['mp4a.40.2', 'avc1.4d401e'],
          supplementalCodecs: ['dvh1.08.07/db4h', 'dvh1.08.08/db4h'],
          resolution: {
            width: 416,
            height: 234,
          },
          hdcpLevel: 'TYPE-1',
          allowedCpc: {
            'com.example.drm1': ['SMART-TV', 'PC'],
            'com.example.drm2': ['HW'],
          },
          videoRange: 'SDR',
          stableVariantId: 'stream-1-id',
          frameRate: 50,
          audio: 'audio-group-id',
          video: 'video-group-id',
          subtitles: 'subtitles-group-id',
          closedCaptions: 'closed-captions-group-id',
          pathwayId: 'pathway-id',
        });
        expect(parsed.variantStreams[1]).toEqual({
          uri: 'stream-2.m3u8',
          resolvedUri: `${baseUrl}/stream-2.m3u8`,
          bandwidth: 234,
          codecs: [],
          supplementalCodecs: [],
          allowedCpc: {},
        });
      });
    });
  });

  describe('#EXT-X-I-FRAME-STREAM-INF', () => {
    it('should be empty by default', () => {
      const playlist = `#EXTM3U`;
      testAllCombinations(playlist, (parsed) => {
        expect(parsed.iFramePlaylists).toEqual([]);
      });
    });

    it('should parse from a playlist', () => {
      const playlist = `#EXTM3U
#EXT-X-I-FRAME-STREAM-INF:URI="stream-1.m3u8",BANDWIDTH=123,AVERAGE-BANDWIDTH=123,SCORE=2.5,CODECS="mp4a.40.2, avc1.4d401e",SUPPLEMENTAL-CODECS="dvh1.08.07/db4h, dvh1.08.08/db4h",RESOLUTION=416x234,HDCP-LEVEL=TYPE-1,ALLOWED-CPC="com.example.drm1:SMART-TV/PC,com.example.drm2:HW",VIDEO-RANGE=SDR,STABLE-VARIANT-ID="stream-1-id",VIDEO="video-group-id",PATHWAY-ID="pathway-id"
#EXT-X-I-FRAME-STREAM-INF:URI="stream-2.m3u8",BANDWIDTH=234
`;
      testAllCombinations(playlist, (parsed) => {
        expect(parsed.iFramePlaylists.length).toBe(2);
        expect(parsed.iFramePlaylists[0]).toEqual({
          uri: 'stream-1.m3u8',
          resolvedUri: `${baseUrl}/stream-1.m3u8`,
          bandwidth: 123,
          averageBandwidth: 123,
          score: 2.5,
          codecs: ['mp4a.40.2', 'avc1.4d401e'],
          supplementalCodecs: ['dvh1.08.07/db4h', 'dvh1.08.08/db4h'],
          resolution: {
            width: 416,
            height: 234,
          },
          hdcpLevel: 'TYPE-1',
          allowedCpc: {
            'com.example.drm1': ['SMART-TV', 'PC'],
            'com.example.drm2': ['HW'],
          },
          videoRange: 'SDR',
          stableVariantId: 'stream-1-id',
          video: 'video-group-id',
          pathwayId: 'pathway-id',
        });
        expect(parsed.iFramePlaylists[1]).toEqual({
          uri: 'stream-2.m3u8',
          resolvedUri: `${baseUrl}/stream-2.m3u8`,
          bandwidth: 234,
          codecs: [],
          supplementalCodecs: [],
          allowedCpc: {},
        });
      });
    });
  });

  describe('#EXT-X-SESSION-DATA', () => {
    it('should be empty by default', () => {
      const playlist = `#EXTM3U`;
      testAllCombinations(playlist, (parsed) => {
        expect(parsed.sessionData).toEqual({});
      });
    });

    it('should parse from a playlist', () => {
      const playlist = `#EXTM3U
#EXT-X-SESSION-DATA:DATA-ID="com.example.movie.title",VALUE="data-value-1",URI="data-uri.json",FORMAT="JSON",LANGUAGE="en"
#EXT-X-SESSION-DATA:DATA-ID="com.example.movie.subtitle",VALUE="data-value-2",URI="data-uri.bin",FORMAT="RAW",LANGUAGE="en"
`;
      testAllCombinations(playlist, (parsed) => {
        expect(parsed.sessionData).toEqual({
          'com.example.movie.title': {
            dataId: 'com.example.movie.title',
            value: 'data-value-1',
            uri: 'data-uri.json',
            resolvedUri: `${baseUrl}/data-uri.json`,
            format: 'JSON',
            language: 'en',
          },
          'com.example.movie.subtitle': {
            dataId: 'com.example.movie.subtitle',
            value: 'data-value-2',
            uri: 'data-uri.bin',
            resolvedUri: `${baseUrl}/data-uri.bin`,
            format: 'RAW',
            language: 'en',
          },
        });
      });
    });
  });

  describe('#EXT-X-SESSION-KEY', () => {
    it('should be undefined by default', () => {
      const playlist = `#EXTM3U`;
      testAllCombinations(playlist, (parsed) => {
        expect(parsed.sessionKey).toBeUndefined();
      });
    });

    it('should parse from a playlist', () => {
      const playlist = `#EXTM3U\n#EXT-X-SESSION-KEY:METHOD=AES-128,URI="https://my-key.com",IV=0x00000000000000000000000000000000`;
      testAllCombinations(playlist, (parsed) => {
        expect(parsed.sessionKey?.method).toBe('AES-128');
        expect(parsed.sessionKey?.uri).toBe('https://my-key.com');
        expect(parsed.sessionKey?.iv).toBe('0x00000000000000000000000000000000');
      });
    });
  });

  describe('#EXT-X-CONTENT-STEERING', () => {
    it('should be undefined by default', () => {
      const playlist = `#EXTM3U`;
      testAllCombinations(playlist, (parsed) => {
        expect(parsed.contentSteering).toBeUndefined();
      });
    });

    it('should parse from a playlist', () => {
      const playlist = `#EXTM3U\n#EXT-X-CONTENT-STEERING:SERVER-URI="https://steering-server.com",PATHWAY-ID="CDN-A"`;
      testAllCombinations(playlist, (parsed) => {
        expect(parsed.contentSteering?.serverUri).toBe('https://steering-server.com');
        expect(parsed.contentSteering?.pathwayId).toBe('CDN-A');
      });
    });
  });

  describe('#EXT-X-MEDIA', () => {
    it('should be an empty object by default', () => {
      const playlist = `#EXTM3U
#EXTINF:4
segment-1.mp4
#EXTINF:4
segment-2.mp4
`;
      testAllCombinations(playlist, (parsed) => {
        expect(parsed.renditionGroups).toEqual({ audio: {}, video: {}, subtitles: {}, closedCaptions: {} });
      });
    });

    it('should parse all attributes from a playlist', () => {
      const playlist = `#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="English",DEFAULT=YES,AUTOSELECT=YES,LANGUAGE="en",ASSOC-LANGUAGE="es",URI="audio.m3u8",CHARACTERISTICS="public.accessibility.transcribes-spoken-dialog,public.accessibility.describes-music-and-sound",CHANNELS="2/0/0",FORCED=NO,STABLE-RENDITION-ID="id-1"
#EXT-X-MEDIA:TYPE=VIDEO,GROUP-ID="video",NAME="720p",DEFAULT=NO,AUTOSELECT=YES,LANGUAGE="en",URI="video.m3u8",CHARACTERISTICS="public.accessibility.transcribes-spoken-dialog,public.accessibility.describes-video",CHANNELS="1/0/0",INSTREAM-ID="CC1",FORCED=YES
`;
      testAllCombinations(playlist, (parsed) => {
        // Audio group
        expect(parsed.renditionGroups.audio['audio'][0].type).toBe('AUDIO');
        expect(parsed.renditionGroups.audio['audio'][0].groupId).toBe('audio');
        expect(parsed.renditionGroups.audio['audio'][0].name).toBe('English');
        expect(parsed.renditionGroups.audio['audio'][0].default).toBe(true);
        expect(parsed.renditionGroups.audio['audio'][0].autoSelect).toBe(true);
        expect(parsed.renditionGroups.audio['audio'][0].language).toBe('en');
        expect(parsed.renditionGroups.audio['audio'][0].assocLanguage).toBe('es');
        expect(parsed.renditionGroups.audio['audio'][0].uri).toBe('audio.m3u8');
        expect(parsed.renditionGroups.audio['audio'][0].characteristics).toEqual([
          'public.accessibility.transcribes-spoken-dialog',
          'public.accessibility.describes-music-and-sound',
        ]);
        expect(parsed.renditionGroups.audio['audio'][0].channels).toEqual(['2', '0', '0']);
        expect(parsed.renditionGroups.audio['audio'][0].forced).toBe(false);
        expect(parsed.renditionGroups.audio['audio'][0].stableRenditionId).toBe('id-1');

        // Video group
        expect(parsed.renditionGroups.video['video'][0].type).toBe('VIDEO');
        expect(parsed.renditionGroups.video['video'][0].groupId).toBe('video');
        expect(parsed.renditionGroups.video['video'][0].name).toBe('720p');
        expect(parsed.renditionGroups.video['video'][0].default).toBe(false);
        expect(parsed.renditionGroups.video['video'][0].autoSelect).toBe(true);
        expect(parsed.renditionGroups.video['video'][0].language).toBe('en');
        expect(parsed.renditionGroups.video['video'][0].uri).toBe('video.m3u8');
        expect(parsed.renditionGroups.video['video'][0].characteristics).toEqual([
          'public.accessibility.transcribes-spoken-dialog',
          'public.accessibility.describes-video',
        ]);
        expect(parsed.renditionGroups.video['video'][0].channels).toEqual(['1', '0', '0']);
        expect(parsed.renditionGroups.video['video'][0].inStreamId).toBe('CC1');
        expect(parsed.renditionGroups.video['video'][0].forced).toBe(true);
      });
    });

    it('should parse multiple #EXT-X-MEDIA tags into correct groups', () => {
      const playlist = `#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="group-audio",NAME="English",LANGUAGE="eng",URI="audio-eng.m3u8"
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="group-audio",NAME="Spanish",LANGUAGE="spa",URI="audio-spa.m3u8"
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="group-sub",NAME="English",LANGUAGE="eng",URI="subs-eng.m3u8"
#EXTINF:4,
segment-1.mp4
#EXTINF:4,
segment-2.mp4
`;
      testAllCombinations(playlist, (parsed) => {
        expect(parsed.renditionGroups.audio['group-audio'].length).toBe(2);
        expect(parsed.renditionGroups.audio['group-audio'][0].language).toBe('eng');
        expect(parsed.renditionGroups.audio['group-audio'][1].language).toBe('spa');
        expect(parsed.renditionGroups.subtitles['group-sub'].length).toBe(1);
        expect(parsed.renditionGroups.subtitles['group-sub'][0].language).toBe('eng');
      });
    });
  });

  describe('#EXT-X-DEFINE', () => {
    it('should be empty by default', () => {
      const playlist = `#EXTM3U`;
      testAllCombinations(playlist, (parsed) => {
        expect(parsed.define.name).toEqual({});
        expect(parsed.define.import).toEqual({});
        expect(parsed.define.queryParam).toEqual({});
      });
    });

    it('should parse from a playlist', () => {
      const playlist = `#EXTM3U
#EXT-X-DEFINE:NAME="token",VALUE="my-token-123"
#EXT-X-DEFINE:IMPORT="key"
#EXT-X-DEFINE:IMPORT="key1"
#EXT-X-DEFINE:IMPORT="key2"
#EXT-X-DEFINE:IMPORT="key3"
#EXT-X-DEFINE:QUERYPARAM="customerId"
`;
      testAllCombinations(
        playlist,
        (parsed) => {
          expect(parsed.define.name).toEqual({ token: 'my-token-123' });
          expect(parsed.define.import).toEqual({
            key: 'my-key-123',
            key1: 'my-key1-123',
            key2: 'my-key2-123',
            key3: null,
          });
          expect(parsed.define.queryParam).toEqual({ customerId: 'my-customer-id-123' });
        },
        {
          baseDefine: {
            name: { key: 'my-key-123' },
            import: { key1: 'my-key1-123' },
            queryParam: { key2: 'my-key2-123' },
          },
          baseUrl: 'https://baseurl.com?customerId=my-customer-id-123',
        }
      );
    });

    it('should substitute variables in a playlist', () => {
      let playlist = `#EXTM3U
#EXT-X-DEFINE:NAME="token",VALUE="my-token-123"
#EXT-X-DEFINE:IMPORT="key"
#EXT-X-DEFINE:QUERYPARAM="customerId"
#EXT-X-MAP:URI=https://host.com?token={$token}&key={$key}&customerId={$customerId}
#EXTINF:5
https://host.com/segment.ts?token={$token}&key={$key}&customerId={$customerId}
`;

      testAllCombinations(
        playlist,
        (parsed) => {
          expect(parsed.segments[0].map).toEqual({
            uri: 'https://host.com?token=my-token-123&key=my-key-123&customerId=my-customer-id-123',
            resolvedUri: 'https://host.com/?token=my-token-123&key=my-key-123&customerId=my-customer-id-123',
            byteRange: undefined,
            encryption: undefined,
          });
          expect(parsed.segments[0].uri).toBe(
            'https://host.com/segment.ts?token=my-token-123&key=my-key-123&customerId=my-customer-id-123'
          );
          expect(parsed.segments[0].resolvedUri).toBe(
            'https://host.com/segment.ts?token=my-token-123&key=my-key-123&customerId=my-customer-id-123'
          );
        },
        {
          baseDefine: { name: { key: 'my-key-123' }, import: {}, queryParam: {} },
          baseUrl: 'https://baseurl.com?customerId=my-customer-id-123',
        }
      );

      playlist = `#EXTM3U
#EXT-X-DEFINE:NAME="token",VALUE="my-token-123"
#EXT-X-DEFINE:IMPORT="key"
#EXT-X-DEFINE:QUERYPARAM="customerId"
#EXT-X-MAP:URI=https://host.com?token={$token}&key={$key}&customerId={$customerId}
#EXTINF:5
https://host.com/segment.ts?token={$token}&key={$key}&customerId={$customerId}
      `;

      testAllCombinations(
        playlist,
        (parsed) => {
          expect(parsed.segments[0].map).toEqual({
            uri: 'https://host.com?token=my-token-123&key={$key}&customerId={$customerId}',
            resolvedUri: 'https://host.com/?token=my-token-123&key={$key}&customerId={$customerId}',
            byteRange: undefined,
            encryption: undefined,
          });
          expect(parsed.segments[0].uri).toBe(
            'https://host.com/segment.ts?token=my-token-123&key={$key}&customerId={$customerId}'
          );
          expect(parsed.segments[0].resolvedUri).toBe(
            'https://host.com/segment.ts?token=my-token-123&key={$key}&customerId={$customerId}'
          );
        },
        {
          baseUrl,
        }
      );

      expect(warnCallback).toHaveBeenCalledTimes(16);
    });
  });
});
