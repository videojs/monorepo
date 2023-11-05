export interface Start {
  timeOffset: number;
  precise: boolean;
}

export interface Define {
  name: Record<string, string | null>;
  import: Record<string, string | null>;
  queryParam: Record<string, string | null>;
}

export interface PartInf {
  partTarget: number;
}

export interface ServerControl {
  canSkipUntil?: number;
  canSkipDateRanges: boolean;
  holdBack?: number;
  partHoldBack?: number;
  canBlockReload: boolean;
}

export interface Encryption {
  method: 'NONE' | 'AES-128' | 'SAMPLE-AES';
  uri?: string;
  iv?: string;
  keyFormat?: string;
  keyFormatVersions: Array<number>;
}

export interface MediaInitializationSection {
  uri: string;
  byteRange?: Range;
  encryption?: Encryption;
}

export interface Range {
  start: number;
  end: number;
}

export interface PartialSegment {
  uri: string;
  duration: number;
  byteRange?: Range;
  independent: boolean;
  isGap: boolean;
}

export interface Segment {
  mediaSequence: number;
  discontinuitySequence: number;
  duration: number;
  title?: string;
  programDateTime?: number;
  byteRange?: Range;
  bitrate?: number;
  uri: string;
  isDiscontinuity: boolean;
  isGap: boolean;
  encryption?: Encryption;
  map?: MediaInitializationSection;
  parts: Array<PartialSegment>;
}

export type RenditionType = 'AUDIO' | 'VIDEO' | 'SUBTITLES' | 'CLOSED-CAPTIONS';

export interface Rendition {
  type: RenditionType;
  uri?: string;
  groupId: string;
  language?: string;
  assocLanguage?: string;
  name: string;
  stableRenditionId?: string;
  default: boolean;
  autoSelect: boolean;
  forced: boolean;
  inStreamId?: string;
  characteristics?: Array<string>;
  channels?: Array<string>;
}

export type GroupId = string;
export type RenditionGroup = Array<Rendition>;

export interface RenditionGroups {
  audio: Record<GroupId, RenditionGroup>;
  video: Record<GroupId, RenditionGroup>;
  subtitles: Record<GroupId, RenditionGroup>;
  closedCaptions: Record<GroupId, RenditionGroup>;
}

export type DateRangeCue = 'PRE' | 'POST' | 'ONCE';

export interface DateRange {
  id: string;
  class?: string;
  startDate: number;
  cues: Array<DateRangeCue>;
  endDate?: string;
  duration?: number;
  plannedDuration?: number;
  clientAttributes: Record<string, string | number>;
  scte35Cmd?: ArrayBuffer;
  scte35Out?: ArrayBuffer;
  scte35In?: ArrayBuffer;
  endOnNext: boolean;
}

export interface Resolution {
  width: number;
  height: number;
}

export type CpcRecord = Record<string, Array<string>>;
export type AllowedCpc = Array<CpcRecord>;

export interface BaseStreamInf {
  uri: string;
  bandwidth: number;
  averageBandwidth?: number;
  score?: number;
  codecs?: Array<string>;
  supplementalCodecs?: Array<string>;
  resolution?: Resolution;
  hdcpLevel?: 'TYPE-0' | 'TYPE-1' | 'NONE';
  allowedCpc?: AllowedCpc;
  videoRange?: 'SDR' | 'HLG' | 'PQ';
  stableVariantId?: string;
  video?: string;
  pathwayId?: string;
}

// VariantStream properties that are not in BaseStreamInf
export interface VariantStreamSpecific {
  frameRate?: number;
  audio?: string;
  subtitles?: string;
  closedCaptions?: string;
}

export interface VariantStream extends BaseStreamInf, VariantStreamSpecific {}
export interface IFramePlaylist extends BaseStreamInf {}

export interface Skip {
  skippedSegments: number;
  recentlyRemovedDateranges?: Array<string>;
}

export enum HintType {
  PART = 'PART',
  MAP = 'MAP',
}

export interface PreloadHint {
  type: HintType;
  uri: string;
  byterangeStart?: number;
  byterangeLength?: number;
}

export interface RenditionReport {
  uri?: string;
  lastMsn?: number;
  lastPart?: number;
}

export interface SessionData {
  dataId: string;
  value?: string;
  uri?: string;
  format?: 'JSON' | 'RAW';
  language?: string;
}

export type PlaylistType = 'EVENT' | 'VOD';

export interface ParsedPlaylist {
  // https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis#section-4.4.1.1
  m3u: boolean;
  // https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis#section-4.4.1.2
  version?: number;
  // https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis#section-4.4.2.1
  independentSegments: boolean;
  // https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis#section-4.4.2.2
  start?: Start;
  // https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis#section-4.4.2.3
  define?: Define;
  // https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis#section-4.4.3.1
  targetDuration?: number;
  // https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis#section-4.4.3.2
  mediaSequence?: number;
  // https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis#section-4.4.3.3
  discontinuitySequence?: number;
  // https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis#section-4.4.3.4
  endList: boolean;
  // https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis#section-4.4.3.5
  playlistType?: PlaylistType;
  // https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis#section-4.4.3.6
  iFramesOnly: boolean;
  // https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis#section-4.4.3.7
  partInf?: PartInf;
  // https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis#section-4.4.3.8
  serverControl?: ServerControl;
  segments: Array<Segment>;
  custom: Record<string, unknown>;
  renditionGroups: RenditionGroups;
  // https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis#section-4.4.5.1
  dateRanges: Array<DateRange>;
  variantStreams: Array<VariantStream>;
  iFramePlaylists: Array<IFramePlaylist>;
  // https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis#section-4.4.5.2
  skip?: Skip;
  // https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis#section-4.4.5.3
  preloadHints: Array<PreloadHint>;
  // https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis#section-4.4.5.4
  renditionReports: Array<RenditionReport>;
  // https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis#section-4.4.6.4
  sessionDataTags: Array<SessionData>;
}
