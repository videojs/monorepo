export type ManifestType = 'static' | 'dynamic';

export type Segment = {
  duration: number;
  uri: string;
  resolvedUri: string;
  segmentNumber: number;
  presentationTime: number;
  timeline: number;
};

export type Attributes = Record<string, unknown>;

export type RepresentationScheme = {
  id?: string;
  codecs?: string;
  bandwidth?: number;
  initialization?: string;
  segments: Array<Segment>;
  [key: string]: unknown;
};

export type EventScheme = {
  id?: string;
  schemeIdUri?: string;
  value: string | number;
  start: number;
  end: number;
  messageData?: string;
  contentEncoding?: string;
  presentationTimeOffest?: string | number;
};

export type UTCTimingScheme = {
  schemeIdUri: string;
  method?: string;
  value?: string | number;
  [key: string]: unknown;
};

// TODO:
interface Representation {}

export interface ParsedManifest {
  representations: Array<Representation>;
  id?: number;
  type: ManifestType;
  availabilityStartTime?: number;
  availabilityEndTime?: number;
  utcTimingScheme?: UTCTimingScheme;
  events?: Array<EventScheme>;
  custom: Record<string, unknown>;
}
