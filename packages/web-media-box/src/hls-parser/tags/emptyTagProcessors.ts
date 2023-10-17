import { TagProcessor } from './base.ts';
import type { ParsedPlaylist, Segment } from '../types/parsedPlaylist';
import { EXT_X_ENDLIST, EXT_X_I_FRAMES_ONLY, EXT_X_INDEPENDENT_SEGMENTS, EXT_X_DISCONTINUITY } from '../consts/tags.ts';

export abstract class EmptyTagProcessor extends TagProcessor {
  public abstract process(playlist: ParsedPlaylist, currentSegment: Segment): void;
}

export class ExtXIndependentSegments extends EmptyTagProcessor {
  protected readonly tag = EXT_X_INDEPENDENT_SEGMENTS;

  public process(playlist: ParsedPlaylist): void {
    playlist.independentSegments = true;
  }
}

export class ExtXEndList extends EmptyTagProcessor {
  protected readonly tag = EXT_X_ENDLIST;

  public process(playlist: ParsedPlaylist): void {
    playlist.endList = true;
  }
}

export class ExtXIframesOnly extends EmptyTagProcessor {
  protected readonly tag = EXT_X_I_FRAMES_ONLY;

  public process(playlist: ParsedPlaylist): void {
    playlist.iFramesOnly = true;
  }
}

export class ExtXDiscontinuity extends EmptyTagProcessor {
  protected readonly tag = EXT_X_DISCONTINUITY;

  public process(playlist: ParsedPlaylist, currentSegment: Segment): void {
    currentSegment.isDiscontinuity = true;
  }
}
