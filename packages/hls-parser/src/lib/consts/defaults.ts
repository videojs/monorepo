import type { Define, ParsedPlaylist, Segment, VariantStream } from '../types/parsedPlaylist';
import type { SharedState } from '../types/sharedState';

export const createDefaultSegment = (): Segment => ({
  duration: 0,
  startTime: 0,
  endTime: 0,
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

export const createDefaultDefine = (): Define => ({
  import: {},
  name: {},
  queryParam: {},
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
  define: createDefaultDefine(),
});

export const createDefaultSharedState = (): SharedState => ({
  isMultivariantPlaylist: false,
  hasVariablesForSubstitution: false,
  baseTime: 0,
  currentSegment: createDefaultSegment(),
  currentVariant: createDefaultVariantStream(),
});
