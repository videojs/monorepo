import { TagProcessor } from './base.ts';
import type { ParsedPlaylist } from '../types/parsedPlaylist';
import { EXT_X_ENDLIST, EXT_X_I_FRAMES_ONLY, EXT_X_INDEPENDENT_SEGMENTS } from '../consts/tags.ts';

export abstract class EmptyTagProcessor extends TagProcessor {
  abstract process(playlist: ParsedPlaylist): void;
}

export class ExtXIndependentSegments extends EmptyTagProcessor {
  tag = EXT_X_INDEPENDENT_SEGMENTS;

  process(playlist: ParsedPlaylist): void {
    playlist.independentSegments = true;
  }
}

export class ExtXEndList extends EmptyTagProcessor {
  tag = EXT_X_ENDLIST;

  process(playlist: ParsedPlaylist): void {
    playlist.endList = true;
  }
}

export class ExtXIframesOnly extends EmptyTagProcessor {
  tag = EXT_X_I_FRAMES_ONLY;

  process(playlist: ParsedPlaylist): void {
    playlist.iFramesOnly = true;
  }
}
