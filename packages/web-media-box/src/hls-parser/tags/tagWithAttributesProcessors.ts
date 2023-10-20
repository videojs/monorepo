import type { ParsedPlaylist, PartialSegment, Rendition, RenditionType, RenditionGroups, GroupId, Resolution, AllowedCpc } from '../types/parsedPlaylist';
import type { SharedState } from '../types/sharedState';
import { TagProcessor } from './base.ts';
import { missingRequiredAttributeWarn } from '../utils/warn.ts';
import { EXT_X_PART_INF, EXT_X_SERVER_CONTROL, EXT_X_START, EXT_X_KEY, EXT_X_MAP, EXT_X_PART, EXT_X_MEDIA, EXT_X_STREAM_INF, EXT_X_SKIP } from '../consts/tags.ts';
import { parseBoolean } from '../utils/parse.ts';

export abstract class TagWithAttributesProcessor extends TagProcessor {
  protected abstract readonly requiredAttributes: Set<string>;

  public process(tagAttributes: Record<string, string>, playlist: ParsedPlaylist, sharedState: SharedState): void {
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

    return this.safeProcess(tagAttributes, playlist, sharedState);
  }

  protected abstract safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist, sharedState: SharedState): void;
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

  protected safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist, sharedState: SharedState): void {
    const part: PartialSegment = {
      uri: tagAttributes[ExtXPart.URI],
      duration: Number(tagAttributes[ExtXPart.DURATION]),
    };

    if (tagAttributes[ExtXPart.BYTERANGE]) {
      const values = tagAttributes[ExtXPart.BYTERANGE].split('@');
      const length = Number(values[0]);
      let offset = Number(values[1]);

      if (Number.isNaN(offset)) {
        const previousPartialSegment = sharedState.currentSegment.parts?.[sharedState.currentSegment.parts.length - 1];

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

    if (!sharedState.currentSegment.parts) {
      sharedState.currentSegment.parts = [];
    }

    sharedState.currentSegment.parts.push(part);
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
  private static readonly typeToKeyMap: Record<string, keyof RenditionGroups> = {
    'AUDIO': 'audio',
    'VIDEO': 'video',
    'SUBTITLES': 'subtitles',
    'CLOSED-CAPTIONS': 'closedCaptions'
  };

  protected readonly requiredAttributes = new Set([ExtXMedia.TYPE, ExtXMedia.GROUP_ID, ExtXMedia.NAME]);
  protected readonly tag = EXT_X_MEDIA;

  protected safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    const rendition: Rendition = {
      type: tagAttributes[ExtXMedia.TYPE] as RenditionType,
      groupId: tagAttributes[ExtXMedia.GROUP_ID] as GroupId,
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

    const renditionTypeKey = ExtXMedia.typeToKeyMap[rendition.type];
    const matchingGroup = playlist.renditionGroups[renditionTypeKey][rendition.groupId];

    if (matchingGroup) {
      matchingGroup.push(rendition);
      return;
    }

    playlist.renditionGroups[renditionTypeKey][rendition.groupId] = [rendition];
  }
}

export class ExtXStreamInf extends TagWithAttributesProcessor {
  private static readonly BANDWIDTH = 'BANDWIDTH';
  private static readonly AVERAGE_BANDWIDTH = 'AVERAGE-BANDWIDTH';
  private static readonly SCORE = 'SCORE';
  private static readonly CODECS = 'CODECS';
  private static readonly SUPPLEMENTAL_CODECS = 'SUPPLEMENTAL-CODECS';
  private static readonly RESOLUTION = 'RESOLUTION';
  private static readonly FRAME_RATE = 'FRAME-RATE';
  private static readonly HDCP_LEVEL = 'HDCP-LEVEL';
  private static readonly ALLOWED_CPC = 'ALLOWED-CPC';
  private static readonly VIDEO_RANGE = 'VIDEO-RANGE';
  private static readonly STABLE_VARIANT_ID = 'STABLE-VARIANT-ID';
  private static readonly AUDIO = 'AUDIO';
  private static readonly VIDEO = 'VIDEO';
  private static readonly SUBTITLES = 'SUBTITLES';
  private static readonly CLOSED_CAPTIONS = 'CLOSED-CAPTIONS';
  private static readonly PATHWAY_ID = 'PATHWAY-ID';

  protected readonly requiredAttributes = new Set([ExtXStreamInf.BANDWIDTH]);
  protected readonly tag = EXT_X_STREAM_INF;

  protected safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist, sharedState: SharedState): void {
    // RESOLUTION attribute
    let parsedResolution = tagAttributes[ExtXStreamInf.RESOLUTION] ? tagAttributes[ExtXStreamInf.RESOLUTION].split('x').map(Number) : [];
    let resolution: Resolution | undefined;

    if (parsedResolution.length === 2) {
      resolution = {
        width: parsedResolution[0],
        height: parsedResolution[1]
      };
    }

    // ALLOWED_CPC attribute
    const parsedAllowedCpc = tagAttributes[ExtXStreamInf.ALLOWED_CPC] ? tagAttributes[ExtXStreamInf.ALLOWED_CPC].split(',') : [];
    let allowedCpc: AllowedCpc = [];

    if (parsedAllowedCpc) {
      parsedAllowedCpc.forEach((entry) => {
        const parsedEntry = entry.split(':');
        const keyFormat = parsedEntry[0];
        const cpcs = parsedEntry[1].split('/');

        allowedCpc.push({ [keyFormat]: cpcs });
      })
    }

    const variantStream = {
      bandwidth: Number(tagAttributes[ExtXStreamInf.BANDWIDTH]),
      averageBandwidth: tagAttributes[ExtXStreamInf.AVERAGE_BANDWIDTH] ? Number(tagAttributes[ExtXStreamInf.AVERAGE_BANDWIDTH]) : undefined,
      score: tagAttributes[ExtXStreamInf.SCORE] ? Number(tagAttributes[ExtXStreamInf.SCORE]) : undefined,
      codecs: tagAttributes[ExtXStreamInf.CODECS] ? tagAttributes[ExtXStreamInf.CODECS].split(',') : [],
      supplementalCodecs: tagAttributes[ExtXStreamInf.SUPPLEMENTAL_CODECS] ? tagAttributes[ExtXStreamInf.SUPPLEMENTAL_CODECS].split(',') : [],
      resolution,
      frameRate: tagAttributes[ExtXStreamInf.FRAME_RATE] ? Number(tagAttributes[ExtXStreamInf.FRAME_RATE]) : undefined,
      hdcpLevel: tagAttributes[ExtXStreamInf.HDCP_LEVEL] as 'NONE' | 'TYPE-0' | 'TYPE-1' | undefined,
      allowedCpc: allowedCpc,
      videoRange: tagAttributes[ExtXStreamInf.VIDEO_RANGE] as 'SDR' | 'HLG' | 'PQ' | undefined,
      stableVariantId: tagAttributes[ExtXStreamInf.STABLE_VARIANT_ID],
      audio: tagAttributes[ExtXStreamInf.AUDIO],
      video: tagAttributes[ExtXStreamInf.VIDEO],
      subtitles: tagAttributes[ExtXStreamInf.SUBTITLES],
      closedCaptions: tagAttributes[ExtXStreamInf.CLOSED_CAPTIONS],
      pathwayId: tagAttributes[ExtXStreamInf.PATHWAY_ID]
    };

    Object.assign(sharedState.currentVariant, variantStream);
    sharedState.isMultivariantPlaylist = true;
  }
}

export class ExtXSkip extends TagWithAttributesProcessor {
  private static readonly SKIPPED_SEGMENTS = 'SKIPPED-SEGMENTS';
  private static readonly RECENTLY_REMOVED_DATERANGES = 'RECENTLY-REMOVED-DATERANGES';

  protected requiredAttributes = new Set([ExtXSkip.SKIPPED_SEGMENTS]);
  protected readonly tag = EXT_X_SKIP;

  protected safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    playlist.skip = {
      skippedSegments: Number(tagAttributes[ExtXSkip.SKIPPED_SEGMENTS]),
      recentlyRemovedDateranges: tagAttributes[ExtXSkip.RECENTLY_REMOVED_DATERANGES].split('\t')
    };
  } 
}
