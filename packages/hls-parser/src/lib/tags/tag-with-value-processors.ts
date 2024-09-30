import type { ParsedPlaylist, PlaylistType } from '../types/parsed-playlist';
import type { SharedState } from '../types/shared-state';
import { TagProcessor } from './base';
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
} from '../consts/tags';
import { fallbackUsedWarn, unableToParseValueWarn, unsupportedEnumValue } from '../utils/warn';

export abstract class TagWithValueProcessor extends TagProcessor {
  public abstract process(tagValue: string, playlist: ParsedPlaylist, sharedState: SharedState): void;
}

abstract class TagWithNumberValueProcessor extends TagWithValueProcessor {
  protected readonly fallback_: number | undefined;

  public process(tagValue: string, playlist: ParsedPlaylist, sharedState: SharedState): void {
    let parsed = Number(tagValue);

    if (Number.isNaN(parsed)) {
      if (this.fallback_ !== undefined) {
        this.warnCallback_(fallbackUsedWarn(this.tag_, String(this.fallback_)));
        parsed = this.fallback_;
      } else {
        return this.warnCallback_(unableToParseValueWarn(this.tag_));
      }
    }

    return this.processNumberValue_(parsed, playlist, sharedState);
  }

  protected abstract processNumberValue_(value: number, playlist: ParsedPlaylist, sharedState: SharedState): void;
}

abstract class TagWithEnumValueProcessor<T> extends TagWithValueProcessor {
  protected abstract readonly enum_: Set<string>;

  public process(tagValue: string, playlist: ParsedPlaylist): void {
    if (!this.enum_.has(tagValue)) {
      return this.warnCallback_(unsupportedEnumValue(this.tag_, tagValue, this.enum_));
    }

    return this.processEnumValue_(tagValue as T, playlist);
  }

  protected abstract processEnumValue_(value: T, playlist: ParsedPlaylist): void;
}

export class ExtXVersion extends TagWithNumberValueProcessor {
  protected readonly tag_ = EXT_X_VERSION;

  protected processNumberValue_(value: number, playlist: ParsedPlaylist): void {
    playlist.version = value;
  }
}

export class ExtXTargetDuration extends TagWithNumberValueProcessor {
  protected readonly tag_ = EXT_X_TARGETDURATION;

  protected processNumberValue_(value: number, playlist: ParsedPlaylist): void {
    playlist.targetDuration = value;
  }
}

export class ExtXMediaSequence extends TagWithNumberValueProcessor {
  protected readonly tag_ = EXT_X_MEDIA_SEQUENCE;

  protected processNumberValue_(value: number, playlist: ParsedPlaylist, sharedState: SharedState): void {
    playlist.mediaSequence = value;
    sharedState.currentSegment.mediaSequence = value;
  }
}

export class ExtXDiscontinuitySequence extends TagWithNumberValueProcessor {
  protected readonly tag_ = EXT_X_DISCONTINUITY_SEQUENCE;

  protected processNumberValue_(value: number, playlist: ParsedPlaylist, sharedState: SharedState): void {
    playlist.discontinuitySequence = value;
    sharedState.currentSegment.discontinuitySequence = value;
  }
}

export class ExtXPlaylistType extends TagWithEnumValueProcessor<PlaylistType> {
  protected readonly tag_ = EXT_X_PLAYLIST_TYPE;
  protected readonly enum_ = new Set(['EVENT', 'VOD']);

  protected processEnumValue_(value: PlaylistType, playlist: ParsedPlaylist): void {
    playlist.playlistType = value;
  }
}

export class ExtInf extends TagWithValueProcessor {
  protected readonly tag_ = EXTINF;

  public process(tagValue: string, playlist: ParsedPlaylist, sharedState: SharedState): void {
    const parts = tagValue.split(',');
    const duration = Number(parts[0]);

    if (Number.isNaN(duration)) {
      return this.warnCallback_(unableToParseValueWarn(this.tag_));
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
  protected readonly tag_ = EXT_X_BYTERANGE;

  public process(tagValue: string, playlist: ParsedPlaylist, sharedState: SharedState): void {
    const values = tagValue.split('@');
    const length = Number(values[0]);
    let offset = values[1] ? Number(values[1]) : undefined;

    if (typeof offset === 'undefined') {
      const previousSegment = playlist.segments[playlist.segments.length - 1];

      if (!previousSegment || !previousSegment.byteRange) {
        return this.warnCallback_(
          `Unable to parse ${this.tag_}: EXT-X-BYTERANGE without offset requires a previous segment with a byte range in the playlist`
        );
      }

      offset = previousSegment.byteRange.end + 1;
    }

    sharedState.currentSegment.byteRange = { start: offset, end: offset + length - 1 };
  }
}

export class ExtXBitrate extends TagWithValueProcessor {
  protected readonly tag_ = EXT_X_BITRATE;

  public process(tagValue: string, playlist: ParsedPlaylist, sharedState: SharedState): void {
    const bitrate = Number(tagValue);

    if (Number.isNaN(bitrate) || bitrate < 0) {
      return this.warnCallback_(unableToParseValueWarn(this.tag_));
    }

    // Store the bitrate value so it can be applied to subsequent segments
    sharedState.currentBitrate = bitrate;
  }
}

export class ExtXProgramDateTime extends TagWithValueProcessor {
  protected readonly tag_ = EXT_X_PROGRAM_DATE_TIME;

  public process(tagValue: string, playlist: ParsedPlaylist, sharedState: SharedState): void {
    const timestamp = Date.parse(tagValue);

    if (Number.isNaN(timestamp)) {
      return this.warnCallback_(unableToParseValueWarn(this.tag_));
    }

    sharedState.currentSegment.programDateTimeStart = timestamp;

    // If this is the first segment, abort early
    if (!playlist.segments.length) {
      return;
    }

    const previousSegment = playlist.segments[playlist.segments.length - 1];

    // If there are preceding segments without programDateTime, we need to backfill them
    if (!previousSegment.programDateTimeStart) {
      let currentTimestamp = sharedState.currentSegment.programDateTimeStart;

      for (let i = playlist.segments.length - 1; i >= 0; i--) {
        const segment = playlist.segments[i];

        segment.programDateTimeEnd = currentTimestamp;
        currentTimestamp -= segment.duration * 1000;
        segment.programDateTimeStart = currentTimestamp;
      }
    }
  }
}
