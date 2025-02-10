import type {
  AudioTrack,
  AudioTrackList,
  IPipelineDependencies,
  IRemoteVttThumbnailTrackOptions,
} from 'src/entry-points/api-reference';
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
      source: {
        url: new URL('https://foo.bar.m3u8'),
      },
    } as IPipelineDependencies);

    // text mocks.
    window.HTMLMediaElement.prototype.addTextTrack = (kind: string, label?: string, language?: string): TextTrack => {
      const textTrack = {
        kind,
        label,
        language,
        mode: TextTrackMode.Hidden,
        id: `id-${label}-${language}`,
      } as TextTrack;
      videoElement.textTracks[videoElement.textTracks.length] = textTrack;
      return textTrack;
    };
    videoElement.textTracks.getTrackById = (id: string): TextTrack | null => {
      for (let i = 0; i < videoElement.textTracks.length; i++) {
        if (videoElement.textTracks[i].id === id) {
          return videoElement.textTracks[i];
        }
      }
      return null;
    };
    window.HTMLMediaElement.prototype.play = (): Promise<void> => {
      return Promise.resolve();
    };
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
      // no tracks.
      expect(nativePipeline.getThumbnailTracks()).toEqual([]);

      // add thumbnail track.
      let didAddTrack = nativePipeline.addRemoteVttThumbnailTrack({} as IRemoteVttThumbnailTrackOptions);
      expect(didAddTrack).toBe(false);
      didAddTrack = nativePipeline.addRemoteVttThumbnailTrack({ url: new URL('https://foo.bar') });
      expect(didAddTrack).toBe(true);

      // get thumbnail tracks.
      const thumbnailTracksBeforeRemove = nativePipeline.getThumbnailTracks();
      expect(thumbnailTracksBeforeRemove.length).toEqual(1);
      expect(thumbnailTracksBeforeRemove[0].mode).toEqual(TextTrackMode.Hidden);

      // remove wrong thumbnail track.
      const wrongTrackId = 'id-foo-bar';
      let didRemoveTrack = nativePipeline.removeRemoteThumbnailTrack(wrongTrackId);
      expect(didRemoveTrack).toBe(false);

      // remove thumbnail track.
      const trackId = 'id-thumbnails-undefined';
      didRemoveTrack = nativePipeline.removeRemoteThumbnailTrack(trackId);
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
      const trackId = 'id-thumbnails-undefined';
      let trackWasSelected = nativePipeline.selectThumbnailTrack(trackId);
      expect(trackWasSelected).toBe(true);

      // should return false for wrong id
      const wrongTrackId = 'foo';
      trackWasSelected = nativePipeline.selectThumbnailTrack(wrongTrackId);
      expect(trackWasSelected).toBe(false);
    });

    // chrome does not support the audioTrack API. So need to mock everything.
    it('should get audio tracks', () => {
      const id = 'foo';
      const enabled = true;
      const kind = 'main';
      const label = 'bar';
      const language = 'en';
      const audioTrack: AudioTrack = {
        id,
        enabled,
        kind,
        label,
        language,
      };

      let nativeAudioTracks = nativePipeline.getAudioTracks();
      expect(nativeAudioTracks).toEqual([]);

      // add audio track
      const audioTracks = {
        length: 1,
        [Symbol.iterator]: function* () {
          yield audioTrack;
        },
      } as unknown as AudioTrackList;
      Object.defineProperty(videoElement, 'audioTracks', { value: audioTracks });
      if (videoElement.audioTracks) {
        videoElement.audioTracks[0] = audioTrack;
      }
      nativeAudioTracks = nativePipeline.getAudioTracks();
      expect(nativeAudioTracks.length).toEqual(1);
      expect(nativeAudioTracks).toBeDefined();
      expect(nativeAudioTracks[0].id).toEqual(id);
      expect(nativeAudioTracks[0].isActive).toEqual(enabled);
      expect(nativeAudioTracks[0].kind).toEqual(kind);
      expect(nativeAudioTracks[0].label).toEqual(label);
      expect(nativeAudioTracks[0].language).toEqual(language);
    });

    it('should select audio track', () => {
      const id = 'foo';
      const audioTrack: AudioTrack = {
        id,
        enabled: false,
        kind: 'alternate',
        label: 'bar',
        language: 'sp',
      };
      // add audio track
      const audioTracks = {
        length: 1,
        getTrackById: (id_: string) => {
          // simple mock for one track
          const isSameId = videoElement.audioTracks && videoElement.audioTracks[0].id === id_;
          if (isSameId) {
            return videoElement.audioTracks ? videoElement.audioTracks[0] : null;
          }
          return null;
        },
        [Symbol.iterator]: function* () {
          yield audioTrack;
        },
      } as unknown as AudioTrackList;
      Object.defineProperty(videoElement, 'audioTracks', { value: audioTracks });
      if (videoElement.audioTracks) {
        videoElement.audioTracks[0] = audioTrack;
      }

      let didSelectTrack = nativePipeline.selectAudioTrack('bar');
      expect(didSelectTrack).toBe(false);

      didSelectTrack = nativePipeline.selectAudioTrack(id);
      expect(didSelectTrack).toBe(true);
    });

    it('should set src and state on start', () => {
      const expectedSrc = 'https://foo.bar.m3u8/';
      expect(videoElement.src).toBe('');
      nativePipeline.start();
      expect(videoElement.src).toEqual(expectedSrc);
    });

    it('should remove src and state on dispose', () => {
      nativePipeline.start();
      nativePipeline.dispose();
      expect(videoElement.src).toBe('');
    });

    it('getQualityLevels should return empty array', () => {
      expect(nativePipeline.getQualityLevels()).toEqual([]);
    });

    it('selectQualityLevel should return false', () => {
      expect(nativePipeline.selectQualityLevel()).toBe(false);
    });

    it('selectAutoQualityLevel should return false', () => {
      expect(nativePipeline.selectAutoQualityLevel()).toBe(false);
    });
  });
});
