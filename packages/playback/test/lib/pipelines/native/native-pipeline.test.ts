import type { IPipelineDependencies } from 'src/entry-points/api-reference';
import { NativePipeline } from '../../../../src/lib/pipelines/native/native-pipeline';
import { beforeEach, describe, expect, it } from 'vitest';
import { TextTrackKind, TextTrackMode } from '../../../../src/lib/consts/text-tracks';

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
      videoElement.addTextTrack(TextTrackKind.Metadata, labelTwo, languageTwo);

      // should only return non-metadata tracks.
      tracks = nativePipeline.getTextTracks();
      expect(tracks.length).toEqual(2);
      expect(tracks[1].kind).toEqual(TextTrackKind.Subtitles);
      expect(tracks[1].label).toEqual(labelTwo);
      expect(tracks[1].language).toEqual(languageTwo);
    });

    it('should add, get, and remove existing thumbnail track', () => {
      // add thumbnail track.
      const didAddTrack = nativePipeline.addRemoteVttThumbnailTrack({ url: new URL('https://foo.bar') });
      expect(didAddTrack).toBe(true);

      const thumbnailTracksBeforeRemove = nativePipeline.getThumbnailTracks();
      expect(thumbnailTracksBeforeRemove.length).toEqual(1);
      expect(thumbnailTracksBeforeRemove[0].mode).toEqual(TextTrackMode.Hidden);

      const trackId = '';
      const didRemoveTrack = nativePipeline.removeRemoteThumbnailTrack(trackId);
      expect(didRemoveTrack).toBe(true);

      // native text tracks can only be disabled as there is no track element to remove.
      const thumbnailTracksAfterRemove = nativePipeline.getThumbnailTracks();
      expect(thumbnailTracksAfterRemove.length).toEqual(1);
      expect(thumbnailTracksAfterRemove[0].mode).toEqual(TextTrackMode.Disabled);
    });

    it('should select thumbnail track', () => {
      // add thumbnail track.
      const didAddTrack = nativePipeline.addRemoteVttThumbnailTrack({ url: new URL('https://bar.foo') });
      expect(didAddTrack).toBe(true);

      // select track
      const trackId = '';
      let trackWasSelected = nativePipeline.selectThumbnailTrack(trackId);
      expect(trackWasSelected).toBe(true);

      // should return false for wrong id
      const wrongTrackId = 'foo';
      trackWasSelected = nativePipeline.selectThumbnailTrack(wrongTrackId);
      expect(trackWasSelected).toBe(false);
    });
  });
});
