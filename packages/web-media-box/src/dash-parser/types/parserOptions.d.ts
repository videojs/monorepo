import type { TagInfo } from '@/dash-parser/stateMachine.ts';

export type WarnCallback = (warn: string) => void;
export type DebugCallback = (...debug: Array<unknown>) => void;

export type TransformTagValue = (tagKey: string, tagValue: string | null) => string | null;
export type TransformTagAttributes = (tagKey: string, tagAttributes: Record<string, string>) => Record<string, string>;

export type CustomTagMap = Record<
  string,
  (tagInfo: TagInfo, parentTagInfo: TagInfo | null, custom: Record<string, unknown>) => void
>;

export interface ParserOptions {
  uri?: string;
  warnCallback?: WarnCallback;
  debugCallback?: DebugCallback;
  customTagMap?: CustomTagMap;
  ignoreTags?: Set<string>;
  transformTagValue?: TransformTagValue;
  transformTagAttributes?: TransformTagAttributes;
}
