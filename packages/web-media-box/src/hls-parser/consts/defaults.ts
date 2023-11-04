import type { ParsedPlaylist, Segment, VariantStream } from '@/hls-parser/types/parsedPlaylist';
import type { SharedState } from '@/hls-parser/types/sharedState';

export const createDefaultSegment = (): Segment => ({
  duration: 0,
  mediaSequence: 0,
  discontinuitySequence: 0,
  isDiscontinuity: false,
  isGap: false,
  uri: '',
  parts: [],
});

export const createDefaultVariantStream = (): VariantStream => ({
  bandwidth: 0,
  uri: '',
});

export const createDefaultParsedPlaylist = (): ParsedPlaylist => ({
  m3u: false,
  independentSegments: false,
  endList: false,
  iFramesOnly: false,
  segments: [],
  custom: {},
  renditionGroups: {
    audio: {},
    video: {},
    subtitles: {},
    closedCaptions: {},
  },
  variantStreams: [],
  iFramePlaylists: [],
  dateRanges: [],
  preloadHints: [],
  renditionReports: [],
  sessionDataTags: [],
});

export const createDefaultSharedState = (): SharedState => ({
  isMultivariantPlaylist: false,
  currentSegment: createDefaultSegment(),
  currentVariant: createDefaultVariantStream(),
});
