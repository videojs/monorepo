import type { ParsedPlaylist, PlaylistType, Segment } from '../types/parsedPlaylist';
import { TagProcessor } from './base.ts';
import {
  EXT_X_DISCONTINUITY_SEQUENCE,
  EXT_X_MEDIA_SEQUENCE,
  EXT_X_PLAYLIST_TYPE,
  EXT_X_TARGETDURATION,
  EXT_X_VERSION,
  EXTINF,
} from '../consts/tags.ts';
import { fallbackUsedWarn, unableToParseValueWarn, unsupportedEnumValue } from '../utils/warn.ts';

export abstract class TagWithValueProcessor extends TagProcessor {
  public abstract process(tagValue: string, playlist: ParsedPlaylist, currentSegment: Segment): void;
}

abstract class TagWithNumberValueProcessor extends TagWithValueProcessor {
  protected readonly fallback: number | undefined;

  public process(tagValue: string, playlist: ParsedPlaylist): void {
    let parsed = Number(tagValue);

    if (Number.isNaN(parsed)) {
      if (this.fallback !== undefined) {
        this.warnCallback(fallbackUsedWarn(this.tag, String(this.fallback)));
        parsed = this.fallback;
      } else {
        return this.warnCallback(unableToParseValueWarn(this.tag));
      }
    }

    return this.processNumberValue(parsed, playlist);
  }

  protected abstract processNumberValue(value: number, playlist: ParsedPlaylist): void;
}

abstract class TagWithEnumValueProcessor<T> extends TagWithValueProcessor {
  protected abstract readonly enum: Set<string>;

  public process(tagValue: string, playlist: ParsedPlaylist): void {
    if (!this.enum.has(tagValue)) {
      return this.warnCallback(unsupportedEnumValue(this.tag, tagValue, this.enum));
    }

    return this.processEnumValue(tagValue as T, playlist);
  }

  protected abstract processEnumValue(value: T, playlist: ParsedPlaylist): void;
}

export class ExtXVersion extends TagWithNumberValueProcessor {
  protected readonly tag = EXT_X_VERSION;

  protected processNumberValue(value: number, playlist: ParsedPlaylist): void {
    playlist.version = value;
  }
}

export class ExtXTargetDuration extends TagWithNumberValueProcessor {
  protected readonly tag = EXT_X_TARGETDURATION;

  protected processNumberValue(value: number, playlist: ParsedPlaylist): void {
    playlist.targetDuration = value;
  }
}

export class ExtXMediaSequence extends TagWithNumberValueProcessor {
  protected readonly tag = EXT_X_MEDIA_SEQUENCE;

  protected processNumberValue(value: number, playlist: ParsedPlaylist): void {
    playlist.mediaSequence = value;
  }
}

export class ExtXDiscontinuitySequence extends TagWithNumberValueProcessor {
  protected readonly tag = EXT_X_DISCONTINUITY_SEQUENCE;

  protected processNumberValue(value: number, playlist: ParsedPlaylist): void {
    playlist.discontinuitySequence = value;
  }
}

export class ExtXPlaylistType extends TagWithEnumValueProcessor<PlaylistType> {
  protected readonly tag = EXT_X_PLAYLIST_TYPE;
  protected readonly enum = new Set(['EVENT', 'LIVE']);

  protected processEnumValue(value: PlaylistType, playlist: ParsedPlaylist): void {
    playlist.playlistType = value;
  }
}

export class ExtInf extends TagWithValueProcessor {
  protected readonly tag = EXTINF;

  public process(tagValue: string, playlist: ParsedPlaylist, currentSegment: Segment): void {
    const parts = tagValue.split(',');
    const duration = parseInt(parts[0]);

    if (Number.isNaN(duration)) {
      return this.warnCallback(unableToParseValueWarn(this.tag));
    }

    let title = parts[1];

    if (title) {
      title = title.trim();
    }

    currentSegment.duration = duration;
    currentSegment.title = title;
  }
}
