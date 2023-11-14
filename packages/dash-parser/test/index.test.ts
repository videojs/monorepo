import { FullManifestParser, ProgressiveParser } from '../src';
import type { ParsedManifest } from '../src';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('dash-parser spec', () => {
  let fullManifestParser: FullManifestParser;
  let progressiveManifestParser: ProgressiveParser;
  let warnCallback: jest.Mock<(warn: string) => void>;

  const testAllCombinations = (manifest: string, cb: (parsed: ParsedManifest) => void): void => {
    const buffer = new Uint8Array(manifest.split('').map((char) => char.charCodeAt(0)));

    cb(fullManifestParser.parseFullManifestString(manifest));
    cb(fullManifestParser.parseFullManifestBuffer(buffer));

    progressiveManifestParser.pushString(manifest);
    cb(progressiveManifestParser.done());

    progressiveManifestParser.pushBuffer(buffer);
    cb(progressiveManifestParser.done());
  };

  beforeEach(() => {
    warnCallback = jest.fn(() => {});

    fullManifestParser = new FullManifestParser({
      warnCallback,
      // debugCallback: (debug, info): void => console.log('Full Manifest Parser debug: ', debug, info),
    });
    progressiveManifestParser = new ProgressiveParser({
      warnCallback,
      // debugCallback: (debug, info): void => console.log('Progressive Manifest Parser debug: ', debug, info),
    });
  });

  describe('tbd', () => {
    it('tbd', () => {
      const manifest = `<MPD mediaPresentationDuration="PT634.566S" minBufferTime="PT2.00S" profiles="urn:hbbtv:dash:profile:isoff-live:2012,urn:mpeg:dash:profile:isoff-live:2011" type="static" xmlns="urn:mpeg:dash:schema:mpd:2011" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="urn:mpeg:DASH:schema:MPD:2011 DASH-MPD.xsd"></MPD>`;

      testAllCombinations(manifest, (parsed) => {
        expect(parsed.type).toBe('static');
      });
    });
  });
});
