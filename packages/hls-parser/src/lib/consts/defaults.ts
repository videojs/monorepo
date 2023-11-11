import type { ParsedPlaylist, Segment, VariantStream } from '../types/parsedPlaylist';
import type { SharedState } from '../types/sharedState';

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
  codecs: [],
  supplementalCodecs: [],
  allowedCpc: {},
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
  renditionReports: [],
  sessionData: {},
  preloadHints: {},
});

export const createDefaultSharedState = (): SharedState => ({
  isMultivariantPlaylist: false,
  currentSegment: createDefaultSegment(),
  currentVariant: createDefaultVariantStream(),
});
