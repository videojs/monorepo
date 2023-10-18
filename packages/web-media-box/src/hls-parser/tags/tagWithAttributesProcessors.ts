import type { ParsedPlaylist, PartialSegment, Segment, Rendition } from '../types/parsedPlaylist';
import { TagProcessor } from './base.ts';
import { missingRequiredAttributeWarn } from '../utils/warn.ts';
import { EXT_X_PART_INF, EXT_X_SERVER_CONTROL, EXT_X_START, EXT_X_KEY, EXT_X_MAP, EXT_X_PART, EXT_X_MEDIA } from '../consts/tags.ts';
import { parseBoolean } from '../utils/parse.ts';

export abstract class TagWithAttributesProcessor extends TagProcessor {
  protected abstract readonly requiredAttributes: Set<string>;

  public process(tagAttributes: Record<string, string>, playlist: ParsedPlaylist, currentSegment: Segment): void {
    let isRequiredAttributedMissed = false;

    this.requiredAttributes.forEach((requiredAttribute) => {
      const hasRequiredAttribute = requiredAttribute in tagAttributes;

      if (!hasRequiredAttribute) {
        this.warnCallback(missingRequiredAttributeWarn(this.tag, requiredAttribute));
        isRequiredAttributedMissed = true;
      }
    });

    if (isRequiredAttributedMissed) {
      return;
    }

    return this.safeProcess(tagAttributes, playlist, currentSegment);
  }

  protected abstract safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist, currentSegment: Segment): void;
}

export class ExtXStart extends TagWithAttributesProcessor {
  private static readonly TIME_OFFSET = 'TIME-OFFSET';
  private static readonly PRECISE = 'PRECISE';

  protected readonly requiredAttributes = new Set([ExtXStart.TIME_OFFSET]);
  protected readonly tag = EXT_X_START;

  protected safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    playlist.start = {
      timeOffset: Number(tagAttributes[ExtXStart.TIME_OFFSET]),
      precise: parseBoolean(tagAttributes[ExtXStart.PRECISE], false),
    };
  }
}

export class ExtXPartInf extends TagWithAttributesProcessor {
  private static readonly PART_TARGET = 'PART-TARGET';

  protected readonly requiredAttributes = new Set([ExtXPartInf.PART_TARGET]);
  protected readonly tag = EXT_X_PART_INF;

  protected safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    playlist.partInf = {
      partTarget: Number(tagAttributes[ExtXPartInf.PART_TARGET]),
    };
  }
}

export class ExtXServerControl extends TagWithAttributesProcessor {
  private static readonly HOLD_BACK = 'HOLD-BACK';
  private static readonly CAN_SKIP_UNTIL = 'CAN-SKIP-UNTIL';
  private static readonly PART_HOLD_BACK = 'PART-HOLD-BACK';
  private static readonly CAN_BLOCK_RELOAD = 'CAN-BLOCK-RELOAD';
  private static readonly CAN_SKIP_DATERANGES = 'CAN-SKIP-DATERANGES';

  protected readonly requiredAttributes = new Set<string>();
  protected readonly tag = EXT_X_SERVER_CONTROL;

  protected safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    let holdBack;

    if (tagAttributes[ExtXServerControl.HOLD_BACK]) {
      holdBack = Number(tagAttributes[ExtXServerControl.HOLD_BACK]);
    } else if (playlist.targetDuration) {
      holdBack = playlist.targetDuration * 3;
    }

    playlist.serverControl = {
      canSkipUntil: Number(tagAttributes[ExtXServerControl.CAN_SKIP_UNTIL]),
      partHoldBack: Number(tagAttributes[ExtXServerControl.PART_HOLD_BACK]),
      canBlockReload: parseBoolean(tagAttributes[ExtXServerControl.CAN_BLOCK_RELOAD], false),
      canSkipDateRanges: parseBoolean(tagAttributes[ExtXServerControl.CAN_SKIP_DATERANGES], false),
      holdBack,
    };
  }
}

export class ExtXKey extends TagWithAttributesProcessor {
  private static readonly METHOD = 'METHOD';
  private static readonly URI = 'URI';
  private static readonly IV = 'IV';
  private static readonly KEYFORMAT = 'KEYFORMAT';
  private static readonly KEYFORMATVERSIONS = 'KEYFORMATVERSIONS';

  protected readonly requiredAttributes = new Set([ExtXKey.METHOD]);
  protected readonly tag = EXT_X_KEY;

  protected safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    const method = tagAttributes[ExtXKey.METHOD];
    const uri = tagAttributes[ExtXKey.URI];

    // URI attribute is required unless the METHOD is 'NONE'
    if (method !== 'NONE' && !uri) {
      return this.warnCallback(missingRequiredAttributeWarn(this.tag, ExtXKey.URI));
    }

    playlist.encryption = {
      method: method as 'NONE' | 'AES-128' | 'SAMPLE-AES',
      uri: uri,
      iv: tagAttributes[ExtXKey.IV],
      keyFormat: tagAttributes[ExtXKey.KEYFORMAT] || 'identity',
      keyFormatVersions: tagAttributes[ExtXKey.KEYFORMATVERSIONS]
        ? tagAttributes[ExtXKey.KEYFORMATVERSIONS].split('/').map(Number)
        : [1]
    };
  }
}

export class ExtXMap extends TagWithAttributesProcessor {
  private static readonly URI = 'URI';
  private static readonly BYTERANGE = 'BYTERANGE';

  protected readonly requiredAttributes = new Set([ExtXMap.URI]);
  protected readonly tag = EXT_X_MAP;

  protected safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    let byteRange;

    if (tagAttributes[ExtXMap.BYTERANGE]) {
      const [length, offset] = tagAttributes[ExtXMap.BYTERANGE].split('@').map(Number);

      byteRange = {length, offset};
    }

    playlist.mediaInitializationSection = {
      uri: tagAttributes[ExtXMap.URI],
      byteRange
    };
  }
}

export class ExtXPart extends TagWithAttributesProcessor {
  private static readonly URI = 'URI';
  private static readonly DURATION = 'DURATION';
  private static readonly INDEPENDENT = 'INDEPENDENT';
  private static readonly BYTERANGE = 'BYTERANGE';
  private static readonly GAP = 'GAP';

  protected readonly requiredAttributes = new Set([ExtXPart.URI, ExtXPart.DURATION]);
  protected readonly tag = EXT_X_PART;

  protected safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist, currentSegment: Segment): void {
    const part: PartialSegment = {
      uri: tagAttributes[ExtXPart.URI],
      duration: Number(tagAttributes[ExtXPart.DURATION]),
    };

    if (tagAttributes[ExtXPart.BYTERANGE]) {
      const values = tagAttributes[ExtXPart.BYTERANGE].split('@');
      const length = Number(values[0]);
      let offset = values[1] ? Number(values[1]) : undefined;

      if (typeof offset === 'undefined') {
        const previousPartialSegment = currentSegment.parts?.[currentSegment.parts.length - 1];

        if (!previousPartialSegment || !previousPartialSegment.byteRange) {
          return this.warnCallback(`Unable to parse ${this.tag}: A BYTERANGE attribute without offset requires a previous partial segment with a byterange`);
        }

        offset = previousPartialSegment.byteRange.offset + previousPartialSegment.byteRange.length + 1;
      }

      part.byteRange = {length, offset};
    }

    if (tagAttributes[ExtXPart.INDEPENDENT]) {
      part.independent = parseBoolean(tagAttributes[ExtXPart.INDEPENDENT], false);
    }

    if (tagAttributes[ExtXPart.GAP]) {
      part.isGap = parseBoolean(tagAttributes[ExtXPart.GAP], false);
    }

    if (!currentSegment.parts) {
      currentSegment.parts = [];
    }

    currentSegment.parts.push(part);
  }
}

export class ExtXMedia extends TagWithAttributesProcessor {
  private static readonly TYPE = 'TYPE';
  private static readonly URI = 'URI';
  private static readonly GROUP_ID = 'GROUP-ID';
  private static readonly LANGUAGE = 'LANGUAGE';
  private static readonly ASSOC_LANGUAGE = 'ASSOC-LANGUAGE';
  private static readonly NAME = 'NAME';
  private static readonly DEFAULT = 'DEFAULT';
  private static readonly AUTOSELECT = 'AUTOSELECT';
  private static readonly FORCED = 'FORCED';
  private static readonly INSTREAM_ID = 'INSTREAM-ID';
  private static readonly CHARACTERISTICS = 'CHARACTERISTICS';
  private static readonly CHANNELS = 'CHANNELS';

  protected readonly requiredAttributes = new Set([ExtXMedia.TYPE, ExtXMedia.GROUP_ID, ExtXMedia.NAME]);
  protected readonly tag = EXT_X_MEDIA;

  protected safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    const rendition: Rendition = {
      type: tagAttributes[ExtXMedia.TYPE] as 'AUDIO' | 'VIDEO' | 'SUBTITLES' | 'CLOSED-CAPTIONS',
      groupId: tagAttributes[ExtXMedia.GROUP_ID],
      name: tagAttributes[ExtXMedia.NAME],
      uri: tagAttributes[ExtXMedia.URI],
      language: tagAttributes[ExtXMedia.LANGUAGE],
      assocLanguage: tagAttributes[ExtXMedia.ASSOC_LANGUAGE],
      default: parseBoolean(tagAttributes[ExtXMedia.DEFAULT], false),
      autoSelect: parseBoolean(tagAttributes[ExtXMedia.AUTOSELECT], false),
      forced: parseBoolean(tagAttributes[ExtXMedia.FORCED], false),
      inStreamId: tagAttributes[ExtXMedia.INSTREAM_ID],
      characteristics: tagAttributes[ExtXMedia.CHARACTERISTICS] ? tagAttributes[ExtXMedia.CHARACTERISTICS].split(',') : [],
      channels: tagAttributes[ExtXMedia.CHANNELS] ? tagAttributes[ExtXMedia.CHANNELS].split('/') : []
    };

    if (!playlist.alternativeRenditions) {
      playlist.alternativeRenditions = [];
    }

    playlist.alternativeRenditions.push(rendition);
  }
}
