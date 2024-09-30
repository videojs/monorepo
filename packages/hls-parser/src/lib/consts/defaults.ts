import type { Define, ParsedPlaylist, Segment, VariantStream } from '../types/parsed-playlist';
import type { SharedState } from '../types/shared-state';

export const createDefaultSegment = (): Segment => ({
  duration: 0,
  startTime: 0,
  endTime: 0,
  mediaSequence: 0,
  discontinuitySequence: 0,
  isDiscontinuity: false,
  isGap: false,
  uri: '',
  resolvedUri: '',
  parts: [],
});

export const createDefaultVariantStream = (): VariantStream => ({
  bandwidth: 0,
  uri: '',
  resolvedUri: '',
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
  baseUrl: '',
  currentSegment: createDefaultSegment(),
  currentVariant: createDefaultVariantStream(),
});
