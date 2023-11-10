export interface SharedState {
  baseUrls: Array<BaseURLState>;
  mpdAttributes: Record<string, unknown>;
  periodAttributes?: Record<string, unknown>;
  adaptationSetAttributes?: Record<string, unknown>;
  segmentTemplateAttributes?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
}

interface BaseURLState {
  uri: string;
  attributes: Record<string, unknown>;
  parentKey?: string | null;
}
