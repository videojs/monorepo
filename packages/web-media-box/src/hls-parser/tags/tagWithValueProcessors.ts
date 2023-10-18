import type { ParsedPlaylist, PlaylistType, Segment } from '../types/parsedPlaylist';
import { TagProcessor } from './base.ts';
import {
  EXT_X_DISCONTINUITY_SEQUENCE,
  EXT_X_MEDIA_SEQUENCE,
  EXT_X_PLAYLIST_TYPE,
  EXT_X_TARGETDURATION,
  EXT_X_VERSION,
  EXTINF,
  EXT_X_BYTERANGE,
  EXT_X_BITRATE
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

export class ExtXByteRange extends TagWithValueProcessor {
  protected readonly tag = EXT_X_BYTERANGE;

  public process(tagValue: string, playlist: ParsedPlaylist, currentSegment: Segment): void {
    const values = tagValue.split('@');
    const length = Number(values[0]);
    const start = values[1] ? Number(values[1]) : undefined;

    if (typeof start === 'undefined') {
      const previousSegment = playlist.segments[playlist.segments.length - 1];

      if (!previousSegment || !previousSegment.byteRange) {
        return this.warnCallback(`Unable to parse ${this.tag}: EXT-X-BYTERANGE without offset requires a previous segment with a byte range in the playlist`);
      }

      currentSegment.byteRange = {
        from: previousSegment.byteRange.to + 1,
        to: previousSegment.byteRange.to + length
      };
    } else {
      currentSegment.byteRange = {
        from: start,
        to: start + length - 1
      };
    }
  }
}

export class ExtXBitrate extends TagWithValueProcessor {
  protected readonly tag = EXT_X_BITRATE;

  public process(tagValue: string, playlist: ParsedPlaylist, currentSegment: Segment): void {
    const bitrate = Number(tagValue);

    if (Number.isNaN(bitrate) || bitrate < 0) {
      return this.warnCallback(unableToParseValueWarn(this.tag));
    }

    currentSegment.bitrate = bitrate;

    // Store on the playlist so the bitrate value can be applied to subsequent segments
    playlist.currentBitrate = bitrate;
  }
}
