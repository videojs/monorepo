import type { IPipelineDependencies } from 'src/entry-points/api-reference';
import { NativePipeline } from '../../../../src/lib/pipelines/native/native-pipeline';
import { beforeEach, describe, expect, it } from 'vitest';
import { TextTrackKind } from '../../../../src/lib/consts/text-tracks';

describe('NativePipeline', () => {
  let nativePipeline: NativePipeline;
  let videoElement: HTMLVideoElement;
  beforeEach(() => {
    videoElement = document.createElement('video');
    nativePipeline = NativePipeline.create({
      logger: {
        createSubLogger: (name) => {
          name;
        },
      },
      videoElement,
    } as IPipelineDependencies);
  });

  describe('Basic Pipeline Operations', () => {
    it('should create native pipeline', () => {
      expect(nativePipeline).toBeInstanceOf(NativePipeline);
    });

    it('should get text tracks', () => {
      // add text tracks.
      let tracks = nativePipeline.getTextTracks();
      const labelOne = 'foo';
      const languageOne = 'en';

      expect(tracks).toEqual([]);

      // add one track
      videoElement.addTextTrack(TextTrackKind.Captions, labelOne, languageOne);
      tracks = nativePipeline.getTextTracks();
      expect(tracks.length).toEqual(1);
      expect(tracks[0].kind).toEqual(TextTrackKind.Captions);
      expect(tracks[0].label).toEqual(labelOne);
      expect(tracks[0].language).toEqual(languageOne);

      // add more tracks
      const labelTwo = 'bar';
      const languageTwo = 'sp';
      videoElement.addTextTrack(TextTrackKind.Subtitles, labelTwo, languageTwo);

      // add metadata track
      videoElement.addTextTrack(TextTrackKind.Metadata, labelTwo, languageTwo);

      // should only return non-metadata tracks.
      tracks = nativePipeline.getTextTracks();
      expect(tracks.length).toEqual(2);
      expect(tracks[1].kind).toEqual(TextTrackKind.Subtitles);
      expect(tracks[1].label).toEqual(labelTwo);
      expect(tracks[1].language).toEqual(languageTwo);
    });
  });
});
