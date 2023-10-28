import type {
  ParsedPlaylist,
  PartialSegment,
  Rendition,
  RenditionType,
  RenditionGroups,
  GroupId,
  Resolution,
  AllowedCpc,
  IFramePlaylist,
  BaseStreamInf,
  DateRange,
  Cue,
  HintType,
} from '../types/parsedPlaylist';
import type { SharedState } from '../types/sharedState';
import { TagProcessor } from './base.ts';
import { missingRequiredAttributeWarn } from '../utils/warn.ts';
import {
  EXT_X_PART_INF,
  EXT_X_SERVER_CONTROL,
  EXT_X_START,
  EXT_X_KEY,
  EXT_X_MAP,
  EXT_X_PART,
  EXT_X_SKIP,
  EXT_X_MEDIA,
  EXT_X_STREAM_INF,
  EXT_X_I_FRAME_STREAM_INF,
  EXT_X_DATERANGE,
  EXT_X_PRELOAD_HINT,
  EXT_X_RENDITION_REPORT,
  EXT_X_SESSION_DATA,
} from '../consts/tags.ts';
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

  protected abstract safeProcess(
    tagAttributes: Record<string, string>,
    playlist: ParsedPlaylist,
    sharedState: SharedState
  ): void;
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
    let partHoldBack;

    if (tagAttributes[ExtXServerControl.HOLD_BACK]) {
      holdBack = Number(tagAttributes[ExtXServerControl.HOLD_BACK]);
    } else if (playlist.targetDuration) {
      holdBack = playlist.targetDuration * 3;
    }

    if (tagAttributes[ExtXServerControl.PART_HOLD_BACK]) {
      partHoldBack = Number(tagAttributes[ExtXServerControl.PART_HOLD_BACK]);
    } else if (playlist.partInf?.partTarget) {
      partHoldBack = playlist.partInf.partTarget * 3;
    }

    playlist.serverControl = {
      canSkipUntil: tagAttributes[ExtXServerControl.CAN_SKIP_UNTIL]
        ? Number(tagAttributes[ExtXServerControl.CAN_SKIP_UNTIL])
        : undefined,
      canBlockReload: parseBoolean(tagAttributes[ExtXServerControl.CAN_BLOCK_RELOAD], false),
      canSkipDateRanges: parseBoolean(tagAttributes[ExtXServerControl.CAN_SKIP_DATERANGES], false),
      holdBack,
      partHoldBack,
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

  protected safeProcess(
    tagAttributes: Record<string, string>,
    playlist: ParsedPlaylist,
    sharedState: SharedState
  ): void {
    const method = tagAttributes[ExtXKey.METHOD];
    const uri = tagAttributes[ExtXKey.URI];

    // URI attribute is required unless the METHOD is 'NONE'
    if (method !== 'NONE' && !uri) {
      return this.warnCallback(missingRequiredAttributeWarn(this.tag, ExtXKey.URI));
    }

    sharedState.currentEncryption = {
      method: method as 'NONE' | 'AES-128' | 'SAMPLE-AES',
      uri: uri,
      iv: tagAttributes[ExtXKey.IV],
      keyFormat: tagAttributes[ExtXKey.KEYFORMAT] || 'identity',
      keyFormatVersions: tagAttributes[ExtXKey.KEYFORMATVERSIONS]
        ? tagAttributes[ExtXKey.KEYFORMATVERSIONS].split('/').map(Number)
        : [1],
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

      byteRange = { start: offset, end: offset + length - 1 };
    }

    playlist.mediaInitializationSection = {
      uri: tagAttributes[ExtXMap.URI],
      byteRange,
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

  protected safeProcess(
    tagAttributes: Record<string, string>,
    playlist: ParsedPlaylist,
    sharedState: SharedState
  ): void {
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
          return this.warnCallback(
            `Unable to parse ${this.tag}: A BYTERANGE attribute without offset requires a previous partial segment with a byterange`
          );
        }

        offset = previousPartialSegment.byteRange.end + 1;
      }

      part.byteRange = { start: offset, end: offset + length - 1 };
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

export class ExtXSkip extends TagWithAttributesProcessor {
  private static readonly SKIPPED_SEGMENTS = 'SKIPPED-SEGMENTS';
  private static readonly RECENTLY_REMOVED_DATERANGES = 'RECENTLY-REMOVED-DATERANGES';

  protected requiredAttributes = new Set([ExtXSkip.SKIPPED_SEGMENTS]);
  protected readonly tag = EXT_X_SKIP;

  protected safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    playlist.skip = {
      skippedSegments: Number(tagAttributes[ExtXSkip.SKIPPED_SEGMENTS]),
      recentlyRemovedDateranges: tagAttributes[ExtXSkip.RECENTLY_REMOVED_DATERANGES].split('\t'),
    };
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
    AUDIO: 'audio',
    VIDEO: 'video',
    SUBTITLES: 'subtitles',
    'CLOSED-CAPTIONS': 'closedCaptions',
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
      characteristics: tagAttributes[ExtXMedia.CHARACTERISTICS]
        ? tagAttributes[ExtXMedia.CHARACTERISTICS].split(',')
        : [],
      channels: tagAttributes[ExtXMedia.CHANNELS] ? tagAttributes[ExtXMedia.CHANNELS].split('/') : [],
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

abstract class BaseStreamInfProcessor extends TagWithAttributesProcessor {
  protected static readonly BANDWIDTH = 'BANDWIDTH';
  protected static readonly AVERAGE_BANDWIDTH = 'AVERAGE-BANDWIDTH';
  protected static readonly SCORE = 'SCORE';
  protected static readonly CODECS = 'CODECS';
  protected static readonly SUPPLEMENTAL_CODECS = 'SUPPLEMENTAL-CODECS';
  protected static readonly RESOLUTION = 'RESOLUTION';
  protected static readonly HDCP_LEVEL = 'HDCP-LEVEL';
  protected static readonly ALLOWED_CPC = 'ALLOWED-CPC';
  protected static readonly VIDEO_RANGE = 'VIDEO-RANGE';
  protected static readonly STABLE_VARIANT_ID = 'STABLE-VARIANT-ID';
  protected static readonly VIDEO = 'VIDEO';
  protected static readonly PATHWAY_ID = 'PATHWAY-ID';

  protected parseResolution(value?: string): Resolution | undefined {
    const parsedResolution = value ? value.split('x').map(Number) : [];

    if (parsedResolution.length === 2) {
      return {
        width: parsedResolution[0],
        height: parsedResolution[1],
      };
    }
  }

  protected parseAllowedCpc(value?: string): AllowedCpc {
    const parsedAllowedCpc = value ? value.split(',') : [];
    const allowedCpc: AllowedCpc = [];

    parsedAllowedCpc.forEach((entry) => {
      const parsedEntry = entry.split(':');
      const keyFormat = parsedEntry[0];
      const cpcs = parsedEntry[1].split('/');

      allowedCpc.push({ [keyFormat]: cpcs });
    });

    return allowedCpc;
  }

  protected parseCommonAttributes(tagAttributes: Record<string, string>): BaseStreamInf {
    return {
      uri: '',
      bandwidth: Number(tagAttributes[BaseStreamInfProcessor.BANDWIDTH]),
      averageBandwidth: tagAttributes[BaseStreamInfProcessor.AVERAGE_BANDWIDTH]
        ? Number(tagAttributes[BaseStreamInfProcessor.AVERAGE_BANDWIDTH])
        : undefined,
      score: tagAttributes[BaseStreamInfProcessor.SCORE]
        ? Number(tagAttributes[BaseStreamInfProcessor.SCORE])
        : undefined,
      codecs: tagAttributes[BaseStreamInfProcessor.CODECS]
        ? tagAttributes[BaseStreamInfProcessor.CODECS].split(',')
        : [],
      supplementalCodecs: tagAttributes[BaseStreamInfProcessor.SUPPLEMENTAL_CODECS]
        ? tagAttributes[BaseStreamInfProcessor.SUPPLEMENTAL_CODECS].split(',')
        : [],
      resolution: this.parseResolution(tagAttributes[BaseStreamInfProcessor.RESOLUTION]),
      hdcpLevel: tagAttributes[BaseStreamInfProcessor.HDCP_LEVEL] as 'NONE' | 'TYPE-0' | 'TYPE-1' | undefined,
      allowedCpc: this.parseAllowedCpc(tagAttributes[BaseStreamInfProcessor.ALLOWED_CPC]),
      videoRange: tagAttributes[BaseStreamInfProcessor.VIDEO_RANGE] as 'SDR' | 'HLG' | 'PQ' | undefined,
      stableVariantId: tagAttributes[BaseStreamInfProcessor.STABLE_VARIANT_ID],
      video: tagAttributes[BaseStreamInfProcessor.VIDEO],
      pathwayId: tagAttributes[BaseStreamInfProcessor.PATHWAY_ID],
    };
  }
}

export class ExtXStreamInf extends BaseStreamInfProcessor {
  protected static readonly FRAME_RATE = 'FRAME-RATE';
  protected static readonly AUDIO = 'AUDIO';
  protected static readonly SUBTITLES = 'SUBTITLES';
  protected static readonly CLOSED_CAPTIONS = 'CLOSED-CAPTIONS';

  protected readonly requiredAttributes = new Set([BaseStreamInfProcessor.BANDWIDTH]);
  protected readonly tag = EXT_X_STREAM_INF;

  protected safeProcess(
    tagAttributes: Record<string, string>,
    playlist: ParsedPlaylist,
    sharedState: SharedState
  ): void {
    const variantStream = {
      ...this.parseCommonAttributes(tagAttributes),
      frameRate: tagAttributes[ExtXStreamInf.FRAME_RATE] ? Number(tagAttributes[ExtXStreamInf.FRAME_RATE]) : undefined,
      audio: tagAttributes[ExtXStreamInf.AUDIO],
      subtitles: tagAttributes[ExtXStreamInf.SUBTITLES],
      closedCaptions: tagAttributes[ExtXStreamInf.CLOSED_CAPTIONS],
    };

    Object.assign(sharedState.currentVariant, variantStream);
    sharedState.isMultivariantPlaylist = true;
  }
}

export class ExtXIFrameStreamInf extends BaseStreamInfProcessor {
  protected static readonly URI = 'URI';

  protected readonly requiredAttributes = new Set([BaseStreamInfProcessor.BANDWIDTH, ExtXIFrameStreamInf.URI]);
  protected readonly tag = EXT_X_I_FRAME_STREAM_INF;

  protected safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    const iFrameStreamInf: IFramePlaylist = {
      ...this.parseCommonAttributes(tagAttributes),
      uri: tagAttributes[ExtXIFrameStreamInf.URI],
    };

    if (!playlist.iFramePlaylists) {
      playlist.iFramePlaylists = [];
    }

    playlist.iFramePlaylists.push(iFrameStreamInf);
  }
}

export class ExtXDaterange extends TagWithAttributesProcessor {
  private static readonly ID = 'ID';
  private static readonly CLASS = 'CLASS';
  private static readonly START_DATE = 'START-DATE';
  private static readonly CUE = 'CUE';
  private static readonly END_DATE = 'END-DATE';
  private static readonly DURATION = 'DURATION';
  private static readonly PLANNED_DURATION = 'PLANNED-DURATION';
  // Client attributes look like X-<client-attribute>, example: X-COM-EXAMPLE-AD-ID="XYZ123"
  private static readonly CLIENT_ATTRIBUTES = 'X-';
  private static readonly SCTE35_CMD = 'SCTE35-CMD';
  private static readonly SCTE35_OUT = 'SCTE35-OUT';
  private static readonly SCTE35_IN = 'SCTE35-IN';
  private static readonly END_ON_NEXT = 'END-ON-NEXT';

  protected requiredAttributes = new Set([ExtXDaterange.ID, ExtXDaterange.START_DATE]);
  protected tag = EXT_X_DATERANGE;

  protected safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    const dateRange: DateRange = {
      id: tagAttributes[ExtXDaterange.ID],
      class: tagAttributes[ExtXDaterange.CLASS],
      startDate: tagAttributes[ExtXDaterange.START_DATE],
      cue: (tagAttributes[ExtXDaterange.CUE] || '').split(',') as Array<Cue>,
      endDate: tagAttributes[ExtXDaterange.END_DATE],
      duration: Number(tagAttributes[ExtXDaterange.DURATION]),
      plannedDuration: Number(tagAttributes[ExtXDaterange.PLANNED_DURATION]),
      scte35Cmd: Number(tagAttributes[ExtXDaterange.SCTE35_CMD]),
      scte35Out: Number(tagAttributes[ExtXDaterange.SCTE35_OUT]),
      scte35In: Number(tagAttributes[ExtXDaterange.SCTE35_IN]),
      endOnNext: parseBoolean(tagAttributes[ExtXDaterange.END_ON_NEXT], false),
      clientAttributes: {},
    };

    Object.keys(tagAttributes)
      .filter((tagKey) => tagKey.startsWith(ExtXDaterange.CLIENT_ATTRIBUTES))
      .reduce((clientAttributes, tagKey) => {
        clientAttributes[tagKey] = tagAttributes[tagKey];
        return clientAttributes;
      }, dateRange.clientAttributes);

    playlist.dateRanges.push(dateRange);
  }
}

export class ExtXPreloadHint extends TagWithAttributesProcessor {
  private static readonly TYPE = 'TYPE';
  private static readonly URI = 'URI';
  private static readonly BYTERANGE_START = 'BYTERANGE-START';
  private static readonly BYTERANGE_LENGTH = 'BYTERANGE-LENGTH';

  protected requiredAttributes = new Set([ExtXPreloadHint.TYPE, ExtXPreloadHint.URI]);
  protected tag = EXT_X_PRELOAD_HINT;

  protected safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    const preloadHint = {
      type: tagAttributes[ExtXPreloadHint.TYPE] as HintType,
      uri: tagAttributes[ExtXPreloadHint.URI],
      byterangeStart: Number(tagAttributes[ExtXPreloadHint.BYTERANGE_START]),
      byterangeLength: Number(tagAttributes[ExtXPreloadHint.BYTERANGE_LENGTH]),
    };

    playlist.preloadHints.push(preloadHint);
  }
}

export class ExtXRenditionReport extends TagWithAttributesProcessor {
  private static readonly URI = 'URI';
  private static readonly LAST_MSN = 'LAST-MSN';
  private static readonly LAST_PART = 'LAST-PART';

  protected requiredAttributes = new Set([]);
  protected tag = EXT_X_RENDITION_REPORT;

  protected safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    const renditionReport = {
      uri: tagAttributes[ExtXRenditionReport.URI],
      lastMsn: Number(tagAttributes[ExtXRenditionReport.LAST_MSN]),
      lastPart: Number(tagAttributes[ExtXRenditionReport.LAST_PART]),
    };

    playlist.renditionReports.push(renditionReport);
  }
}

export class ExtXSessionData extends TagWithAttributesProcessor {
  private static readonly DATA_ID = 'DATA-ID';
  private static readonly VALUE = 'VALUE';
  private static readonly URI = 'URI';
  private static readonly FORMAT = 'FORMAT';
  private static readonly LANGUAGE = 'LANGUAGE';

  protected requiredAttributes = new Set([ExtXSessionData.DATA_ID]);
  protected tag = EXT_X_SESSION_DATA;

  protected safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    const sessionData = {
      dataId: tagAttributes[ExtXSessionData.DATA_ID],
      value: tagAttributes[ExtXSessionData.VALUE],
      uri: tagAttributes[ExtXSessionData.URI],
      format: tagAttributes[ExtXSessionData.FORMAT] as 'JSON' | 'RAW' | undefined,
      language: tagAttributes[ExtXSessionData.LANGUAGE],
    };

    playlist.sessionDataTags.push(sessionData);
  }
}
