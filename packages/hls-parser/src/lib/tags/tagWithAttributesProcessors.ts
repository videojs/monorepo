import type {
  ParsedPlaylist,
  PartialSegment,
  Rendition,
  RenditionType,
  RenditionGroups,
  GroupId,
  Resolution,
  IFramePlaylist,
  BaseStreamInf,
  DateRange,
  DateRangeCue,
  PreloadHintType,
  SessionKey,
  Encryption,
  CpcRecord,
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
  EXT_X_SESSION_KEY,
  EXT_X_CONTENT_STEERING,
} from '../consts/tags.ts';
import { parseBoolean, parseHex } from '../utils/parse.ts';

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

abstract class EncryptionTagProcessor extends TagWithAttributesProcessor {
  protected static readonly METHOD = 'METHOD';
  protected static readonly URI = 'URI';
  protected static readonly IV = 'IV';
  protected static readonly KEYFORMAT = 'KEYFORMAT';
  protected static readonly KEYFORMATVERSIONS = 'KEYFORMATVERSIONS';
  protected readonly requiredAttributes = new Set([EncryptionTagProcessor.METHOD]);

  protected parseEncryptionTag(tagAttributes: Record<string, string>): Encryption | SessionKey {
    return {
      method: tagAttributes[EncryptionTagProcessor.METHOD] as 'NONE' | 'AES-128' | 'SAMPLE-AES',
      uri: tagAttributes[EncryptionTagProcessor.URI],
      iv: tagAttributes[EncryptionTagProcessor.IV],
      keyFormat: tagAttributes[EncryptionTagProcessor.KEYFORMAT] || 'identity',
      keyFormatVersions: tagAttributes[EncryptionTagProcessor.KEYFORMATVERSIONS]
        ? tagAttributes[EncryptionTagProcessor.KEYFORMATVERSIONS].split('/').map(Number)
        : [1],
    };
  }
}

export class ExtXKey extends EncryptionTagProcessor {
  protected readonly tag = EXT_X_KEY;

  protected safeProcess(
    tagAttributes: Record<string, string>,
    playlist: ParsedPlaylist,
    sharedState: SharedState
  ): void {
    const encryption = this.parseEncryptionTag(tagAttributes) as Encryption;

    // URI attribute is required unless the METHOD is 'NONE'
    if (encryption.method !== 'NONE' && !encryption.uri) {
      return this.warnCallback(missingRequiredAttributeWarn(this.tag, ExtXKey.URI));
    }

    sharedState.currentEncryption = encryption;
  }
}

export class ExtXMap extends TagWithAttributesProcessor {
  private static readonly URI = 'URI';
  private static readonly BYTERANGE = 'BYTERANGE';

  protected readonly requiredAttributes = new Set([ExtXMap.URI]);
  protected readonly tag = EXT_X_MAP;

  protected safeProcess(
    tagAttributes: Record<string, string>,
    playlist: ParsedPlaylist,
    sharedState: SharedState
  ): void {
    let byteRange;

    if (tagAttributes[ExtXMap.BYTERANGE]) {
      const [length, offset] = tagAttributes[ExtXMap.BYTERANGE].split('@').map(Number);

      byteRange = { start: offset, end: offset + length - 1 };
    }

    sharedState.currentMap = {
      uri: tagAttributes[ExtXMap.URI],
      byteRange,
      encryption: sharedState.currentEncryption,
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
      isGap: parseBoolean(tagAttributes[ExtXPart.GAP], false),
      independent: parseBoolean(tagAttributes[ExtXPart.INDEPENDENT], false),
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

    sharedState.currentSegment.parts.push(part);
  }
}

export class ExtXSkip extends TagWithAttributesProcessor {
  private static readonly SKIPPED_SEGMENTS = 'SKIPPED-SEGMENTS';
  private static readonly RECENTLY_REMOVED_DATERANGES = 'RECENTLY-REMOVED-DATERANGES';

  protected readonly requiredAttributes = new Set([ExtXSkip.SKIPPED_SEGMENTS]);
  protected readonly tag = EXT_X_SKIP;

  protected safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    playlist.skip = {
      skippedSegments: Number(tagAttributes[ExtXSkip.SKIPPED_SEGMENTS]),
      recentlyRemovedDateRanges: ExtXSkip.RECENTLY_REMOVED_DATERANGES
        ? tagAttributes[ExtXSkip.RECENTLY_REMOVED_DATERANGES].split('\t')
        : [],
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
  private static readonly STABLE_RENDITION_ID = 'STABLE-RENDITION-ID';
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
      stableRenditionId: tagAttributes[ExtXMedia.STABLE_RENDITION_ID],
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

  protected parseAllowedCpc(value?: string): CpcRecord {
    const parsedAllowedCpc = value ? value.split(',') : [];

    const cpcRecord: CpcRecord = {};

    parsedAllowedCpc.forEach((entry) => {
      const parsedEntry = entry.split(':');
      const keyFormat = parsedEntry[0];

      if (keyFormat) {
        cpcRecord[keyFormat] = parsedEntry[1] ? parsedEntry[1].split('/') : [];
      }
    });

    return cpcRecord;
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
        ? tagAttributes[BaseStreamInfProcessor.CODECS].split(',').map((codec) => codec.trim())
        : [],
      supplementalCodecs: tagAttributes[BaseStreamInfProcessor.SUPPLEMENTAL_CODECS]
        ? tagAttributes[BaseStreamInfProcessor.SUPPLEMENTAL_CODECS].split(',').map((codec) => codec.trim())
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

    playlist.iFramePlaylists.push(iFrameStreamInf);
  }
}

export class ExtXDateRange extends TagWithAttributesProcessor {
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

  protected readonly requiredAttributes = new Set([ExtXDateRange.ID, ExtXDateRange.START_DATE]);
  protected readonly tag = EXT_X_DATERANGE;

  protected safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    const dateRange: DateRange = {
      id: tagAttributes[ExtXDateRange.ID],
      class: tagAttributes[ExtXDateRange.CLASS],
      startDate: Date.parse(tagAttributes[ExtXDateRange.START_DATE]),
      cues: tagAttributes[ExtXDateRange.CUE]
        ? (tagAttributes[ExtXDateRange.CUE].split(',') as Array<DateRangeCue>)
        : [],
      endDate: tagAttributes[ExtXDateRange.END_DATE],
      duration: tagAttributes[ExtXDateRange.DURATION] ? Number(tagAttributes[ExtXDateRange.DURATION]) : undefined,
      plannedDuration: tagAttributes[ExtXDateRange.PLANNED_DURATION]
        ? Number(tagAttributes[ExtXDateRange.PLANNED_DURATION])
        : undefined,
      scte35Cmd: tagAttributes[ExtXDateRange.SCTE35_CMD]
        ? parseHex(tagAttributes[ExtXDateRange.SCTE35_CMD])
        : undefined,
      scte35Out: tagAttributes[ExtXDateRange.SCTE35_OUT]
        ? parseHex(tagAttributes[ExtXDateRange.SCTE35_OUT])
        : undefined,
      scte35In: tagAttributes[ExtXDateRange.SCTE35_IN] ? parseHex(tagAttributes[ExtXDateRange.SCTE35_IN]) : undefined,
      endOnNext: parseBoolean(tagAttributes[ExtXDateRange.END_ON_NEXT], false),
      clientAttributes: {},
    };

    Object.keys(tagAttributes)
      .filter((tagKey) => tagKey.startsWith(ExtXDateRange.CLIENT_ATTRIBUTES))
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

  protected readonly requiredAttributes = new Set([ExtXPreloadHint.TYPE, ExtXPreloadHint.URI]);
  protected readonly tag = EXT_X_PRELOAD_HINT;

  protected safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    const type = tagAttributes[ExtXPreloadHint.TYPE] as PreloadHintType;
    const uri = tagAttributes[ExtXPreloadHint.URI];
    const pStart = tagAttributes[ExtXPreloadHint.BYTERANGE_START];
    const pLength = tagAttributes[ExtXPreloadHint.BYTERANGE_LENGTH];

    /**
     * There are 4 scenarios with Byte Range for preload-hint
     * 1. Start is available, Length is available:
     * Request resource from start till (start + length - 1)
     * 2. Start is available, Length is not available:
     * Request resource from start till the end of the resource
     * 3. Start is not available, Length is available:
     * Request from 0 till (length - 1)
     * 4. Start is not available, Length is not available:
     * Request entire resource (default scenario)
     */

    let byteRange;

    if (pStart && pLength) {
      const start = Number(pStart);
      const end = start + Number(pLength) - 1;
      byteRange = { start, end };
    } else if (pStart && !pLength) {
      byteRange = { start: Number(pStart), end: Number.MAX_SAFE_INTEGER };
    } else if (!pStart && pLength) {
      byteRange = { start: 0, end: Number(pLength) - 1 };
    }

    const preloadHint = { uri, byteRange };

    if (type === 'PART') {
      playlist.preloadHints.part = preloadHint;
    }

    if (type === 'MAP') {
      playlist.preloadHints.map = preloadHint;
    }
  }
}

export class ExtXRenditionReport extends TagWithAttributesProcessor {
  private static readonly URI = 'URI';
  private static readonly LAST_MSN = 'LAST-MSN';
  private static readonly LAST_PART = 'LAST-PART';

  protected readonly requiredAttributes = new Set([ExtXRenditionReport.URI]);
  protected readonly tag = EXT_X_RENDITION_REPORT;

  protected safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    const renditionReport = {
      uri: tagAttributes[ExtXRenditionReport.URI],
      lastMsn: tagAttributes[ExtXRenditionReport.LAST_MSN]
        ? Number(tagAttributes[ExtXRenditionReport.LAST_MSN])
        : undefined,
      lastPart: tagAttributes[ExtXRenditionReport.LAST_PART]
        ? Number(tagAttributes[ExtXRenditionReport.LAST_PART])
        : undefined,
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

  protected readonly requiredAttributes = new Set([ExtXSessionData.DATA_ID]);
  protected readonly tag = EXT_X_SESSION_DATA;

  protected safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    const sessionData = {
      dataId: tagAttributes[ExtXSessionData.DATA_ID],
      value: tagAttributes[ExtXSessionData.VALUE],
      uri: tagAttributes[ExtXSessionData.URI],
      format: tagAttributes[ExtXSessionData.FORMAT] as 'JSON' | 'RAW' | undefined,
      language: tagAttributes[ExtXSessionData.LANGUAGE],
    };

    playlist.sessionData[sessionData.dataId] = sessionData;
  }
}

export class ExtXSessionKey extends EncryptionTagProcessor {
  protected readonly tag = EXT_X_SESSION_KEY;

  protected safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    playlist.sessionKey = this.parseEncryptionTag(tagAttributes) as SessionKey;
  }
}

export class ExtXContentSteering extends TagWithAttributesProcessor {
  private static readonly SERVER_URI = 'SERVER-URI';
  private static readonly PATHWAY_ID = 'PATHWAY-ID';

  protected readonly requiredAttributes = new Set([ExtXContentSteering.SERVER_URI]);
  protected readonly tag = EXT_X_CONTENT_STEERING;

  protected safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    playlist.contentSteering = {
      serverUri: tagAttributes[ExtXContentSteering.SERVER_URI],
      pathwayId: tagAttributes[ExtXContentSteering.PATHWAY_ID],
    };
  }
}
