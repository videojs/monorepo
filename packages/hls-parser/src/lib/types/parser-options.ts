import type { SharedState } from './shared-state';
import type { Define } from './parsed-playlist';

export type WarnCallback = (warn: string) => void;
export type DebugCallback = (...debug: Array<unknown>) => void;

export type CustomTagMap = Map<
  string,
  (
    tagKey: string,
    tagValue: string | null,
    tagAttributes: Record<string, string>,
    custom: Record<string, unknown>,
    sharedState: SharedState
  ) => void
>;

// used in the parser's constructor
export interface ParserOptions {
  warnCallback?: WarnCallback;
  debugCallback?: DebugCallback;
  customTagMap?: CustomTagMap;
  ignoreTags?: Set<string>;
}

// used in the parse methods (eg parseFullPlaylistString, parseFullPlaylistBuffer, pushBuffer, pushString)
export interface ParseOptions {
  baseUrl: string;
  baseDefine?: Define;
  baseTime?: number;
}
