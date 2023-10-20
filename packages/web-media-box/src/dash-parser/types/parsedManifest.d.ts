export type ManifestType = 'static' | 'dynamic';

export type Segment = {
  duration: number;
  url: string;
}

export type Attributes = Record<string, unknown>;

export type Representation = {
  id?: string,
  codecs?: string,
  bandwidth?: number,
  initialization?: string,
  segments?: Array<Segment>,
  attributes: Attributes,
  [key: string]: unknown;
}

export type EventScheme = {
  id?: string,
  schemeIdUri?: string,
  value: string | number,
  start: number,
  end: number,
  messageData?: string,
  contentEncoding?: string,
  presentationTimeOffest?: string | number
}

export type UTCTimingScheme = {
  schemeIdUri: string,
  method?: string,
  value?: string | number,
  [key: string]: unknown
}

export interface ParsedManifest {
  representations: Array<Representation>,
  id?: number;
  type: ManifestType;
  availabilityStartTime?: number;
  availabilityEndTime?: number;
  utcTimingScheme?: UTCTimingScheme,
  events?: Array<EventScheme>,
  custom: Record<string, unknown>;
}
