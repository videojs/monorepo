import type { ParsedPlaylist, PlaylistType } from '../types/parsedPlaylist';
import type { SharedState } from '../types/sharedState';
import { TagProcessor } from './base.ts';
import {
  EXT_X_DISCONTINUITY_SEQUENCE,
  EXT_X_MEDIA_SEQUENCE,
  EXT_X_PLAYLIST_TYPE,
  EXT_X_TARGETDURATION,
  EXT_X_VERSION,
  EXTINF,
  EXT_X_BYTERANGE,
  EXT_X_BITRATE,
  EXT_X_PROGRAM_DATE_TIME,
} from '../consts/tags.ts';
import { fallbackUsedWarn, unableToParseValueWarn, unsupportedEnumValue } from '../utils/warn.ts';

export abstract class TagWithValueProcessor extends TagProcessor {
  public abstract process(tagValue: string, playlist: ParsedPlaylist, sharedState: SharedState): void;
}

abstract class TagWithNumberValueProcessor extends TagWithValueProcessor {
  protected readonly fallback: number | undefined;

  public process(tagValue: string, playlist: ParsedPlaylist, sharedState: SharedState): void {
    let parsed = Number(tagValue);

    if (Number.isNaN(parsed)) {
      if (this.fallback !== undefined) {
        this.warnCallback(fallbackUsedWarn(this.tag, String(this.fallback)));
        parsed = this.fallback;
      } else {
        return this.warnCallback(unableToParseValueWarn(this.tag));
      }
    }

    return this.processNumberValue(parsed, playlist, sharedState);
  }

  protected abstract processNumberValue(value: number, playlist: ParsedPlaylist, sharedState: SharedState): void;
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

  protected processNumberValue(value: number, playlist: ParsedPlaylist, sharedState: SharedState): void {
    playlist.mediaSequence = value;
    sharedState.currentSegment.mediaSequence = value;
  }
}

export class ExtXDiscontinuitySequence extends TagWithNumberValueProcessor {
  protected readonly tag = EXT_X_DISCONTINUITY_SEQUENCE;

  protected processNumberValue(value: number, playlist: ParsedPlaylist, sharedState: SharedState): void {
    playlist.discontinuitySequence = value;
    sharedState.currentSegment.discontinuitySequence = value;
  }
}

export class ExtXPlaylistType extends TagWithEnumValueProcessor<PlaylistType> {
  protected readonly tag = EXT_X_PLAYLIST_TYPE;
  protected readonly enum = new Set(['EVENT', 'VOD']);

  protected processEnumValue(value: PlaylistType, playlist: ParsedPlaylist): void {
    playlist.playlistType = value;
  }
}

export class ExtInf extends TagWithValueProcessor {
  protected readonly tag = EXTINF;

  public process(tagValue: string, playlist: ParsedPlaylist, sharedState: SharedState): void {
    const parts = tagValue.split(',');
    const duration = Number(parts[0]);

    if (Number.isNaN(duration)) {
      return this.warnCallback(unableToParseValueWarn(this.tag));
    }

    let title = parts[1];

    if (title) {
      title = title.trim();
    }

    sharedState.currentSegment.duration = duration;
    sharedState.currentSegment.title = title;
  }
}

export class ExtXByteRange extends TagWithValueProcessor {
  protected readonly tag = EXT_X_BYTERANGE;

  public process(tagValue: string, playlist: ParsedPlaylist, sharedState: SharedState): void {
    const values = tagValue.split('@');
    const length = Number(values[0]);
    let offset = values[1] ? Number(values[1]) : undefined;

    if (typeof offset === 'undefined') {
      const previousSegment = playlist.segments[playlist.segments.length - 1];

      if (!previousSegment || !previousSegment.byteRange) {
        return this.warnCallback(
          `Unable to parse ${this.tag}: EXT-X-BYTERANGE without offset requires a previous segment with a byte range in the playlist`
        );
      }

      offset = previousSegment.byteRange.end + 1;
    }

    sharedState.currentSegment.byteRange = { start: offset, end: offset + length - 1 };
  }
}

export class ExtXBitrate extends TagWithValueProcessor {
  protected readonly tag = EXT_X_BITRATE;

  public process(tagValue: string, playlist: ParsedPlaylist, sharedState: SharedState): void {
    const bitrate = Number(tagValue);

    if (Number.isNaN(bitrate) || bitrate < 0) {
      return this.warnCallback(unableToParseValueWarn(this.tag));
    }

    sharedState.currentSegment.bitrate = bitrate;

    // Store the bitrate value so it can be applied to subsequent segments
    sharedState.currentBitrate = bitrate;
  }
}

export class ExtXProgramDateTime extends TagWithValueProcessor {
  protected readonly tag = EXT_X_PROGRAM_DATE_TIME;

  public process(tagValue: string, playlist: ParsedPlaylist, sharedState: SharedState): void {
    const timestamp = Date.parse(tagValue);

    if (Number.isNaN(timestamp)) {
      return this.warnCallback(unableToParseValueWarn(this.tag));
    }

    sharedState.currentSegment.programDateTime = timestamp;

    // If this is the first segment, abort early
    if (!playlist.segments.length) {
      return;
    }

    const previousSegment = playlist.segments[playlist.segments.length - 1];

    // If there are preceding segments without programDateTime, we need to backfill them
    if (!previousSegment.programDateTime) {
      let currentTimestamp = sharedState.currentSegment.programDateTime;

      for (let i = playlist.segments.length - 1; i >= 0; i--) {
        const segment = playlist.segments[i];

        currentTimestamp -= segment.duration * 1000;
        segment.programDateTime = currentTimestamp;
      }
    }
  }
}
