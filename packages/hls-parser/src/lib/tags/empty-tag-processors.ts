import { TagProcessor } from './base';
import type { ParsedPlaylist } from '../types/parsed-playlist';
import type { SharedState } from '../types/shared-state';
import {
  EXT_X_ENDLIST,
  EXT_X_I_FRAMES_ONLY,
  EXT_X_INDEPENDENT_SEGMENTS,
  EXT_X_DISCONTINUITY,
  EXT_X_GAP,
  EXTM3U,
} from '../consts/tags';

export abstract class EmptyTagProcessor extends TagProcessor {
  public abstract process(playlist: ParsedPlaylist, sharedState: SharedState): void;
}

export class ExtM3u extends EmptyTagProcessor {
  protected readonly tag_ = EXTM3U;

  public process(playlist: ParsedPlaylist): void {
    playlist.m3u = true;
  }
}

export class ExtXIndependentSegments extends EmptyTagProcessor {
  protected readonly tag_ = EXT_X_INDEPENDENT_SEGMENTS;

  public process(playlist: ParsedPlaylist): void {
    playlist.independentSegments = true;
  }
}

export class ExtXEndList extends EmptyTagProcessor {
  protected readonly tag_ = EXT_X_ENDLIST;

  public process(playlist: ParsedPlaylist): void {
    playlist.endList = true;
  }
}

export class ExtXIframesOnly extends EmptyTagProcessor {
  protected readonly tag_ = EXT_X_I_FRAMES_ONLY;

  public process(playlist: ParsedPlaylist): void {
    playlist.iFramesOnly = true;
  }
}

export class ExtXDiscontinuity extends EmptyTagProcessor {
  protected readonly tag_ = EXT_X_DISCONTINUITY;

  public process(playlist: ParsedPlaylist, sharedState: SharedState): void {
    sharedState.currentSegment.isDiscontinuity = true;
  }
}

export class ExtXGap extends EmptyTagProcessor {
  protected readonly tag_ = EXT_X_GAP;

  public process(playlist: ParsedPlaylist, sharedState: SharedState): void {
    sharedState.currentSegment.isGap = true;
  }
}
