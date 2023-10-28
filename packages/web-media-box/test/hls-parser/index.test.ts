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
    it('should parse value from a playlist', () => {
      const playlist = `#EXTM3U
#EXTINF:9.9766,segment-title
main.ts
`;

      testAllCombinations(playlist, (parsed) => {
        expect(parsed.segments[0]?.title).toBe('segment-title');
        expect(parsed.segments[0]?.duration).toBe(9.9766);
      });
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
        expect(parsed.segments[0].programDateTime).toBeUndefined();
        expect(parsed.segments[1].programDateTime).toBeUndefined();
        expect(parsed.segments[2].programDateTime).toBeUndefined();
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
        expect(parsed.segments[0].programDateTime).toBe(1698516684010);
        expect(parsed.segments[1].programDateTime).toBe(1698516684010 + 4000);
        expect(parsed.segments[2].programDateTime).toBe(1698516684010 + 4000 + 4000);
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
        expect(parsed.segments[0].programDateTime).toBe(1698516684010 - 4000 - 4000);
        expect(parsed.segments[1].programDateTime).toBe(1698516684010 - 4000);
        expect(parsed.segments[2].programDateTime).toBe(1698516684010);
      });
    });
  });
});
