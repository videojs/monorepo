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
} from '../types/parsed-playlist';
import type { SharedState } from '../types/shared-state';
import { TagProcessor } from './base';
import {
  failedToResolveUriAttribute,
  missingRequiredAttributeWarn,
  missingRequiredVariableForAttributeValueSubstitutionWarn,
} from '../utils/warn';
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
  EXT_X_DEFINE,
} from '../consts/tags';
import { parseBoolean, parseHex, resolveUri, substituteVariables } from '../utils/parse';

export abstract class TagWithAttributesProcessor extends TagProcessor {
  protected abstract readonly requiredAttributes_: Set<string>;

  private checkRequiredAttributes_(tagAttributes: Record<string, string>): boolean {
    let isRequiredAttributedMissed = false;

    this.requiredAttributes_.forEach((requiredAttribute) => {
      const hasRequiredAttribute = requiredAttribute in tagAttributes;

      if (!hasRequiredAttribute) {
        this.warnCallback_(missingRequiredAttributeWarn(this.tag_, requiredAttribute));
        isRequiredAttributedMissed = true;
      }
    });

    return isRequiredAttributedMissed;
  }

  private runVariableSubstitution_(
    tagAttributes: Record<string, string>,
    playlist: ParsedPlaylist,
    sharedState: SharedState
  ): void {
    if (!sharedState.hasVariablesForSubstitution) {
      return;
    }

    for (const attributeKey in tagAttributes) {
      const attributeValue = tagAttributes[attributeKey];
      tagAttributes[attributeKey] = substituteVariables(attributeValue, playlist.define, (variableName) => {
        this.warnCallback_(
          missingRequiredVariableForAttributeValueSubstitutionWarn(this.tag_, attributeKey, variableName)
        );
      });
    }
  }

  public process(tagAttributes: Record<string, string>, playlist: ParsedPlaylist, sharedState: SharedState): void {
    if (this.checkRequiredAttributes_(tagAttributes)) {
      return;
    }

    this.runVariableSubstitution_(tagAttributes, playlist, sharedState);

    return this.safeProcess_(tagAttributes, playlist, sharedState);
  }

  protected abstract safeProcess_(
    tagAttributes: Record<string, string>,
    playlist: ParsedPlaylist,
    sharedState: SharedState
  ): void;

  protected resolveUriAttribute_(uri: string, baseUrl: string, attributeKey: string): string {
    let resolved = resolveUri(uri, baseUrl);

    if (resolved === null) {
      this.warnCallback_(failedToResolveUriAttribute(this.tag_, attributeKey, uri, baseUrl));
      resolved = uri;
    }

    return resolved;
  }
}

export class ExtXStart extends TagWithAttributesProcessor {
  private static readonly TIME_OFFSET_ = 'TIME-OFFSET';
  private static readonly PRECISE_ = 'PRECISE';

  protected readonly requiredAttributes_ = new Set([ExtXStart.TIME_OFFSET_]);
  protected readonly tag_ = EXT_X_START;

  protected safeProcess_(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    playlist.start = {
      timeOffset: Number(tagAttributes[ExtXStart.TIME_OFFSET_]),
      precise: parseBoolean(tagAttributes[ExtXStart.PRECISE_], false),
    };
  }
}

export class ExtXPartInf extends TagWithAttributesProcessor {
  private static readonly PART_TARGET_ = 'PART-TARGET';

  protected readonly requiredAttributes_ = new Set([ExtXPartInf.PART_TARGET_]);
  protected readonly tag_ = EXT_X_PART_INF;

  protected safeProcess_(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    playlist.partInf = {
      partTarget: Number(tagAttributes[ExtXPartInf.PART_TARGET_]),
    };
  }
}

export class ExtXServerControl extends TagWithAttributesProcessor {
  private static readonly HOLD_BACK_ = 'HOLD-BACK';
  private static readonly CAN_SKIP_UNTIL_ = 'CAN-SKIP-UNTIL';
  private static readonly PART_HOLD_BACK_ = 'PART-HOLD-BACK';
  private static readonly CAN_BLOCK_RELOAD_ = 'CAN-BLOCK-RELOAD';
  private static readonly CAN_SKIP_DATERANGES_ = 'CAN-SKIP-DATERANGES';

  protected readonly requiredAttributes_ = new Set<string>();
  protected readonly tag_ = EXT_X_SERVER_CONTROL;

  protected safeProcess_(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    let holdBack;
    let partHoldBack;

    if (tagAttributes[ExtXServerControl.HOLD_BACK_]) {
      holdBack = Number(tagAttributes[ExtXServerControl.HOLD_BACK_]);
    } else if (playlist.targetDuration) {
      holdBack = playlist.targetDuration * 3;
    }

    if (tagAttributes[ExtXServerControl.PART_HOLD_BACK_]) {
      partHoldBack = Number(tagAttributes[ExtXServerControl.PART_HOLD_BACK_]);
    } else if (playlist.partInf?.partTarget) {
      partHoldBack = playlist.partInf.partTarget * 3;
    }

    playlist.serverControl = {
      canSkipUntil: tagAttributes[ExtXServerControl.CAN_SKIP_UNTIL_]
        ? Number(tagAttributes[ExtXServerControl.CAN_SKIP_UNTIL_])
        : undefined,
      canBlockReload: parseBoolean(tagAttributes[ExtXServerControl.CAN_BLOCK_RELOAD_], false),
      canSkipDateRanges: parseBoolean(tagAttributes[ExtXServerControl.CAN_SKIP_DATERANGES_], false),
      holdBack,
      partHoldBack,
    };
  }
}

abstract class EncryptionTagProcessor extends TagWithAttributesProcessor {
  protected static readonly METHOD_ = 'METHOD';
  protected static readonly URI_ = 'URI';
  protected static readonly IV_ = 'IV';
  protected static readonly KEYFORMAT_ = 'KEYFORMAT';
  protected static readonly KEYFORMATVERSIONS_ = 'KEYFORMATVERSIONS';
  protected readonly requiredAttributes_ = new Set([EncryptionTagProcessor.METHOD_]);

  protected parseEncryptionTag_(
    tagAttributes: Record<string, string>,
    sharedState: SharedState
  ): Encryption | SessionKey {
    const uri = tagAttributes[EncryptionTagProcessor.URI_];

    let resolvedUri;
    if (uri) {
      resolvedUri = this.resolveUriAttribute_(uri, sharedState.baseUrl, EncryptionTagProcessor.URI_);
    }

    return {
      method: tagAttributes[EncryptionTagProcessor.METHOD_] as 'NONE' | 'AES-128' | 'SAMPLE-AES',
      uri,
      resolvedUri,
      iv: tagAttributes[EncryptionTagProcessor.IV_],
      keyFormat: tagAttributes[EncryptionTagProcessor.KEYFORMAT_] || 'identity',
      keyFormatVersions: tagAttributes[EncryptionTagProcessor.KEYFORMATVERSIONS_]
        ? tagAttributes[EncryptionTagProcessor.KEYFORMATVERSIONS_].split('/').map(Number)
        : [1],
    };
  }
}

export class ExtXKey extends EncryptionTagProcessor {
  protected readonly tag_ = EXT_X_KEY;

  protected safeProcess_(
    tagAttributes: Record<string, string>,
    playlist: ParsedPlaylist,
    sharedState: SharedState
  ): void {
    const encryption = this.parseEncryptionTag_(tagAttributes, sharedState) as Encryption;

    // URI attribute is required unless the METHOD is 'NONE'
    if (encryption.method !== 'NONE' && !encryption.uri) {
      return this.warnCallback_(missingRequiredAttributeWarn(this.tag_, ExtXKey.URI_));
    }

    sharedState.currentEncryption = encryption;
  }
}

export class ExtXMap extends TagWithAttributesProcessor {
  private static readonly URI_ = 'URI';
  private static readonly BYTERANGE_ = 'BYTERANGE';

  protected readonly requiredAttributes_ = new Set([ExtXMap.URI_]);
  protected readonly tag_ = EXT_X_MAP;

  protected safeProcess_(
    tagAttributes: Record<string, string>,
    playlist: ParsedPlaylist,
    sharedState: SharedState
  ): void {
    let byteRange;

    if (tagAttributes[ExtXMap.BYTERANGE_]) {
      const [length, offset] = tagAttributes[ExtXMap.BYTERANGE_].split('@').map(Number);

      byteRange = { start: offset, end: offset + length - 1 };
    }

    const uri = tagAttributes[ExtXMap.URI_];
    const resolvedUri = this.resolveUriAttribute_(uri, sharedState.baseUrl, ExtXMap.URI_);

    sharedState.currentMap = {
      uri,
      resolvedUri,
      byteRange,
      encryption: sharedState.currentEncryption,
    };
  }
}

export class ExtXPart extends TagWithAttributesProcessor {
  private static readonly URI_ = 'URI';
  private static readonly DURATION_ = 'DURATION';
  private static readonly INDEPENDENT_ = 'INDEPENDENT';
  private static readonly BYTERANGE_ = 'BYTERANGE';
  private static readonly GAP_ = 'GAP';

  protected readonly requiredAttributes_ = new Set([ExtXPart.URI_, ExtXPart.DURATION_]);
  protected readonly tag_ = EXT_X_PART;

  protected safeProcess_(
    tagAttributes: Record<string, string>,
    playlist: ParsedPlaylist,
    sharedState: SharedState
  ): void {
    const uri = tagAttributes[ExtXPart.URI_];
    const resolvedUri = this.resolveUriAttribute_(uri, sharedState.baseUrl, ExtXPart.URI_);

    const part: PartialSegment = {
      uri,
      resolvedUri,
      duration: Number(tagAttributes[ExtXPart.DURATION_]),
      isGap: parseBoolean(tagAttributes[ExtXPart.GAP_], false),
      independent: parseBoolean(tagAttributes[ExtXPart.INDEPENDENT_], false),
    };

    if (tagAttributes[ExtXPart.BYTERANGE_]) {
      const values = tagAttributes[ExtXPart.BYTERANGE_].split('@');
      const length = Number(values[0]);
      let offset = Number(values[1]);

      if (Number.isNaN(offset)) {
        const previousPartialSegment = sharedState.currentSegment.parts?.[sharedState.currentSegment.parts.length - 1];

        if (!previousPartialSegment || !previousPartialSegment.byteRange) {
          return this.warnCallback_(
            `Unable to parse ${this.tag_}: A BYTERANGE attribute without offset requires a previous partial segment with a byterange`
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
  private static readonly SKIPPED_SEGMENTS_ = 'SKIPPED-SEGMENTS';
  private static readonly RECENTLY_REMOVED_DATERANGES_ = 'RECENTLY-REMOVED-DATERANGES';

  protected readonly requiredAttributes_ = new Set([ExtXSkip.SKIPPED_SEGMENTS_]);
  protected readonly tag_ = EXT_X_SKIP;

  protected safeProcess_(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    playlist.skip = {
      skippedSegments: Number(tagAttributes[ExtXSkip.SKIPPED_SEGMENTS_]),
      recentlyRemovedDateRanges: ExtXSkip.RECENTLY_REMOVED_DATERANGES_
        ? tagAttributes[ExtXSkip.RECENTLY_REMOVED_DATERANGES_].split('\t')
        : [],
    };
  }
}

export class ExtXMedia extends TagWithAttributesProcessor {
  private static readonly TYPE_ = 'TYPE';
  private static readonly URI_ = 'URI';
  private static readonly GROUP_ID_ = 'GROUP-ID';
  private static readonly LANGUAGE_ = 'LANGUAGE';
  private static readonly ASSOC_LANGUAGE_ = 'ASSOC-LANGUAGE';
  private static readonly NAME_ = 'NAME';
  private static readonly DEFAULT_ = 'DEFAULT';
  private static readonly AUTOSELECT_ = 'AUTOSELECT';
  private static readonly FORCED_ = 'FORCED';
  private static readonly INSTREAM_ID_ = 'INSTREAM-ID';
  private static readonly CHARACTERISTICS_ = 'CHARACTERISTICS';
  private static readonly CHANNELS_ = 'CHANNELS';
  private static readonly STABLE_RENDITION_ID_ = 'STABLE-RENDITION-ID';
  private static readonly typeToKeyMap_: Record<string, keyof RenditionGroups> = {
    AUDIO: 'audio',
    VIDEO: 'video',
    SUBTITLES: 'subtitles',
    'CLOSED-CAPTIONS': 'closedCaptions',
  };

  protected readonly requiredAttributes_ = new Set([ExtXMedia.TYPE_, ExtXMedia.GROUP_ID_, ExtXMedia.NAME_]);
  protected readonly tag_ = EXT_X_MEDIA;

  protected safeProcess_(
    tagAttributes: Record<string, string>,
    playlist: ParsedPlaylist,
    sharedState: SharedState
  ): void {
    const uri = tagAttributes[ExtXMedia.URI_];
    let resolvedUri;

    if (uri) {
      resolvedUri = this.resolveUriAttribute_(uri, sharedState.baseUrl, ExtXMedia.URI_);
    }

    const rendition: Rendition = {
      uri,
      resolvedUri,
      type: tagAttributes[ExtXMedia.TYPE_] as RenditionType,
      groupId: tagAttributes[ExtXMedia.GROUP_ID_] as GroupId,
      name: tagAttributes[ExtXMedia.NAME_],
      language: tagAttributes[ExtXMedia.LANGUAGE_],
      assocLanguage: tagAttributes[ExtXMedia.ASSOC_LANGUAGE_],
      default: parseBoolean(tagAttributes[ExtXMedia.DEFAULT_], false),
      autoSelect: parseBoolean(tagAttributes[ExtXMedia.AUTOSELECT_], false),
      forced: parseBoolean(tagAttributes[ExtXMedia.FORCED_], false),
      inStreamId: tagAttributes[ExtXMedia.INSTREAM_ID_],
      characteristics: tagAttributes[ExtXMedia.CHARACTERISTICS_]
        ? tagAttributes[ExtXMedia.CHARACTERISTICS_].split(',')
        : [],
      channels: tagAttributes[ExtXMedia.CHANNELS_] ? tagAttributes[ExtXMedia.CHANNELS_].split('/') : [],
      stableRenditionId: tagAttributes[ExtXMedia.STABLE_RENDITION_ID_],
    };

    const renditionTypeKey = ExtXMedia.typeToKeyMap_[rendition.type];
    const matchingGroup = playlist.renditionGroups[renditionTypeKey][rendition.groupId];

    if (matchingGroup) {
      matchingGroup.push(rendition);
      return;
    }

    playlist.renditionGroups[renditionTypeKey][rendition.groupId] = [rendition];
  }
}

abstract class BaseStreamInfProcessor extends TagWithAttributesProcessor {
  protected static readonly BANDWIDTH_ = 'BANDWIDTH';
  protected static readonly AVERAGE_BANDWIDTH_ = 'AVERAGE-BANDWIDTH';
  protected static readonly SCORE_ = 'SCORE';
  protected static readonly CODECS_ = 'CODECS';
  protected static readonly SUPPLEMENTAL_CODECS_ = 'SUPPLEMENTAL-CODECS';
  protected static readonly RESOLUTION_ = 'RESOLUTION';
  protected static readonly HDCP_LEVEL_ = 'HDCP-LEVEL';
  protected static readonly ALLOWED_CPC_ = 'ALLOWED-CPC';
  protected static readonly VIDEO_RANGE_ = 'VIDEO-RANGE';
  protected static readonly STABLE_VARIANT_ID_ = 'STABLE-VARIANT-ID';
  protected static readonly VIDEO_ = 'VIDEO';
  protected static readonly PATHWAY_ID_ = 'PATHWAY-ID';

  protected parseResolution_(value?: string): Resolution | undefined {
    const parsedResolution = value ? value.split('x').map(Number) : [];

    if (parsedResolution.length === 2) {
      return {
        width: parsedResolution[0],
        height: parsedResolution[1],
      };
    }
  }

  protected parseAllowedCpc_(value?: string): CpcRecord {
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

  protected parseCommonAttributes_(tagAttributes: Record<string, string>): BaseStreamInf {
    return {
      uri: '',
      resolvedUri: '',
      bandwidth: Number(tagAttributes[BaseStreamInfProcessor.BANDWIDTH_]),
      averageBandwidth: tagAttributes[BaseStreamInfProcessor.AVERAGE_BANDWIDTH_]
        ? Number(tagAttributes[BaseStreamInfProcessor.AVERAGE_BANDWIDTH_])
        : undefined,
      score: tagAttributes[BaseStreamInfProcessor.SCORE_]
        ? Number(tagAttributes[BaseStreamInfProcessor.SCORE_])
        : undefined,
      codecs: tagAttributes[BaseStreamInfProcessor.CODECS_]
        ? tagAttributes[BaseStreamInfProcessor.CODECS_].split(',').map((codec) => codec.trim())
        : [],
      supplementalCodecs: tagAttributes[BaseStreamInfProcessor.SUPPLEMENTAL_CODECS_]
        ? tagAttributes[BaseStreamInfProcessor.SUPPLEMENTAL_CODECS_].split(',').map((codec) => codec.trim())
        : [],
      resolution: this.parseResolution_(tagAttributes[BaseStreamInfProcessor.RESOLUTION_]),
      hdcpLevel: tagAttributes[BaseStreamInfProcessor.HDCP_LEVEL_] as 'NONE' | 'TYPE-0' | 'TYPE-1' | undefined,
      allowedCpc: this.parseAllowedCpc_(tagAttributes[BaseStreamInfProcessor.ALLOWED_CPC_]),
      videoRange: tagAttributes[BaseStreamInfProcessor.VIDEO_RANGE_] as 'SDR' | 'HLG' | 'PQ' | undefined,
      stableVariantId: tagAttributes[BaseStreamInfProcessor.STABLE_VARIANT_ID_],
      video: tagAttributes[BaseStreamInfProcessor.VIDEO_],
      pathwayId: tagAttributes[BaseStreamInfProcessor.PATHWAY_ID_],
    };
  }
}

export class ExtXStreamInf extends BaseStreamInfProcessor {
  protected static readonly FRAME_RATE_ = 'FRAME-RATE';
  protected static readonly AUDIO_ = 'AUDIO';
  protected static readonly SUBTITLES_ = 'SUBTITLES';
  protected static readonly CLOSED_CAPTIONS_ = 'CLOSED-CAPTIONS';

  protected readonly requiredAttributes_ = new Set([BaseStreamInfProcessor.BANDWIDTH_]);
  protected readonly tag_ = EXT_X_STREAM_INF;

  protected safeProcess_(
    tagAttributes: Record<string, string>,
    playlist: ParsedPlaylist,
    sharedState: SharedState
  ): void {
    const variantStream = {
      ...this.parseCommonAttributes_(tagAttributes),
      frameRate: tagAttributes[ExtXStreamInf.FRAME_RATE_]
        ? Number(tagAttributes[ExtXStreamInf.FRAME_RATE_])
        : undefined,
      audio: tagAttributes[ExtXStreamInf.AUDIO_],
      subtitles: tagAttributes[ExtXStreamInf.SUBTITLES_],
      closedCaptions: tagAttributes[ExtXStreamInf.CLOSED_CAPTIONS_],
    };

    Object.assign(sharedState.currentVariant, variantStream);
    sharedState.isMultivariantPlaylist = true;
  }
}

export class ExtXIFrameStreamInf extends BaseStreamInfProcessor {
  protected static readonly URI_ = 'URI';

  protected readonly requiredAttributes_ = new Set([BaseStreamInfProcessor.BANDWIDTH_, ExtXIFrameStreamInf.URI_]);
  protected readonly tag_ = EXT_X_I_FRAME_STREAM_INF;

  protected safeProcess_(
    tagAttributes: Record<string, string>,
    playlist: ParsedPlaylist,
    sharedState: SharedState
  ): void {
    const uri = tagAttributes[ExtXIFrameStreamInf.URI_];
    const resolvedUri = this.resolveUriAttribute_(uri, sharedState.baseUrl, ExtXIFrameStreamInf.URI_);

    const iFrameStreamInf: IFramePlaylist = {
      ...this.parseCommonAttributes_(tagAttributes),
      uri,
      resolvedUri,
    };

    playlist.iFramePlaylists.push(iFrameStreamInf);
  }
}

export class ExtXDateRange extends TagWithAttributesProcessor {
  private static readonly ID_ = 'ID';
  private static readonly CLASS_ = 'CLASS';
  private static readonly START_DATE_ = 'START-DATE';
  private static readonly CUE_ = 'CUE';
  private static readonly END_DATE_ = 'END-DATE';
  private static readonly DURATION_ = 'DURATION';
  private static readonly PLANNED_DURATION_ = 'PLANNED-DURATION';
  // Client attributes look like X-<client-attribute>, example: X-COM-EXAMPLE-AD-ID="XYZ123"
  private static readonly CLIENT_ATTRIBUTES_ = 'X-';
  private static readonly SCTE35_CMD_ = 'SCTE35-CMD';
  private static readonly SCTE35_OUT_ = 'SCTE35-OUT';
  private static readonly SCTE35_IN_ = 'SCTE35-IN';
  private static readonly END_ON_NEXT_ = 'END-ON-NEXT';

  protected readonly requiredAttributes_ = new Set([ExtXDateRange.ID_, ExtXDateRange.START_DATE_]);
  protected readonly tag_ = EXT_X_DATERANGE;

  protected safeProcess_(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    const dateRange: DateRange = {
      id: tagAttributes[ExtXDateRange.ID_],
      class: tagAttributes[ExtXDateRange.CLASS_],
      startDate: Date.parse(tagAttributes[ExtXDateRange.START_DATE_]),
      cues: tagAttributes[ExtXDateRange.CUE_]
        ? (tagAttributes[ExtXDateRange.CUE_].split(',') as Array<DateRangeCue>)
        : [],
      endDate: tagAttributes[ExtXDateRange.END_DATE_],
      duration: tagAttributes[ExtXDateRange.DURATION_] ? Number(tagAttributes[ExtXDateRange.DURATION_]) : undefined,
      plannedDuration: tagAttributes[ExtXDateRange.PLANNED_DURATION_]
        ? Number(tagAttributes[ExtXDateRange.PLANNED_DURATION_])
        : undefined,
      scte35Cmd: tagAttributes[ExtXDateRange.SCTE35_CMD_]
        ? parseHex(tagAttributes[ExtXDateRange.SCTE35_CMD_])
        : undefined,
      scte35Out: tagAttributes[ExtXDateRange.SCTE35_OUT_]
        ? parseHex(tagAttributes[ExtXDateRange.SCTE35_OUT_])
        : undefined,
      scte35In: tagAttributes[ExtXDateRange.SCTE35_IN_] ? parseHex(tagAttributes[ExtXDateRange.SCTE35_IN_]) : undefined,
      endOnNext: parseBoolean(tagAttributes[ExtXDateRange.END_ON_NEXT_], false),
      clientAttributes: {},
    };

    Object.keys(tagAttributes)
      .filter((tagKey) => tagKey.startsWith(ExtXDateRange.CLIENT_ATTRIBUTES_))
      .reduce((clientAttributes, tagKey) => {
        clientAttributes[tagKey] = tagAttributes[tagKey];
        return clientAttributes;
      }, dateRange.clientAttributes);

    playlist.dateRanges.push(dateRange);
  }
}

export class ExtXPreloadHint extends TagWithAttributesProcessor {
  private static readonly TYPE_ = 'TYPE';
  private static readonly URI_ = 'URI';
  private static readonly BYTERANGE_START_ = 'BYTERANGE-START';
  private static readonly BYTERANGE_LENGTH_ = 'BYTERANGE-LENGTH';

  protected readonly requiredAttributes_ = new Set([ExtXPreloadHint.TYPE_, ExtXPreloadHint.URI_]);
  protected readonly tag_ = EXT_X_PRELOAD_HINT;

  protected safeProcess_(
    tagAttributes: Record<string, string>,
    playlist: ParsedPlaylist,
    sharedState: SharedState
  ): void {
    const type = tagAttributes[ExtXPreloadHint.TYPE_] as PreloadHintType;
    const uri = tagAttributes[ExtXPreloadHint.URI_];
    const resolvedUri = this.resolveUriAttribute_(uri, sharedState.baseUrl, ExtXPreloadHint.URI_);
    const pStart = tagAttributes[ExtXPreloadHint.BYTERANGE_START_];
    const pLength = tagAttributes[ExtXPreloadHint.BYTERANGE_LENGTH_];

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

    const preloadHint = { uri, resolvedUri, byteRange };

    if (type === 'PART') {
      playlist.preloadHints.part = preloadHint;
    }

    if (type === 'MAP') {
      playlist.preloadHints.map = preloadHint;
    }
  }
}

export class ExtXRenditionReport extends TagWithAttributesProcessor {
  private static readonly URI_ = 'URI';
  private static readonly LAST_MSN_ = 'LAST-MSN';
  private static readonly LAST_PART_ = 'LAST-PART';

  protected readonly requiredAttributes_ = new Set([ExtXRenditionReport.URI_]);
  protected readonly tag_ = EXT_X_RENDITION_REPORT;

  protected safeProcess_(
    tagAttributes: Record<string, string>,
    playlist: ParsedPlaylist,
    sharedState: SharedState
  ): void {
    const uri = tagAttributes[ExtXRenditionReport.URI_];
    const resolvedUri = this.resolveUriAttribute_(uri, sharedState.baseUrl, ExtXRenditionReport.URI_);

    const renditionReport = {
      uri,
      resolvedUri,
      lastMsn: tagAttributes[ExtXRenditionReport.LAST_MSN_]
        ? Number(tagAttributes[ExtXRenditionReport.LAST_MSN_])
        : undefined,
      lastPart: tagAttributes[ExtXRenditionReport.LAST_PART_]
        ? Number(tagAttributes[ExtXRenditionReport.LAST_PART_])
        : undefined,
    };

    playlist.renditionReports.push(renditionReport);
  }
}

export class ExtXSessionData extends TagWithAttributesProcessor {
  private static readonly DATA_ID_ = 'DATA-ID';
  private static readonly VALUE_ = 'VALUE';
  private static readonly URI_ = 'URI';
  private static readonly FORMAT_ = 'FORMAT';
  private static readonly LANGUAGE_ = 'LANGUAGE';

  protected readonly requiredAttributes_ = new Set([ExtXSessionData.DATA_ID_]);
  protected readonly tag_ = EXT_X_SESSION_DATA;

  protected safeProcess_(
    tagAttributes: Record<string, string>,
    playlist: ParsedPlaylist,
    sharedState: SharedState
  ): void {
    const uri = tagAttributes[ExtXSessionData.URI_];
    let resolvedUri;

    if (uri) {
      resolvedUri = this.resolveUriAttribute_(uri, sharedState.baseUrl, ExtXSessionData.URI_);
    }

    const sessionData = {
      uri,
      resolvedUri,
      dataId: tagAttributes[ExtXSessionData.DATA_ID_],
      value: tagAttributes[ExtXSessionData.VALUE_],
      format: tagAttributes[ExtXSessionData.FORMAT_] as 'JSON' | 'RAW' | undefined,
      language: tagAttributes[ExtXSessionData.LANGUAGE_],
    };

    playlist.sessionData[sessionData.dataId] = sessionData;
  }
}

export class ExtXSessionKey extends EncryptionTagProcessor {
  protected readonly tag_ = EXT_X_SESSION_KEY;

  protected safeProcess_(
    tagAttributes: Record<string, string>,
    playlist: ParsedPlaylist,
    sharedState: SharedState
  ): void {
    playlist.sessionKey = this.parseEncryptionTag_(tagAttributes, sharedState) as SessionKey;
  }
}

export class ExtXContentSteering extends TagWithAttributesProcessor {
  private static readonly SERVER_URI_ = 'SERVER-URI';
  private static readonly PATHWAY_ID_ = 'PATHWAY-ID';

  protected readonly requiredAttributes_ = new Set([ExtXContentSteering.SERVER_URI_]);
  protected readonly tag_ = EXT_X_CONTENT_STEERING;

  protected safeProcess_(
    tagAttributes: Record<string, string>,
    playlist: ParsedPlaylist,
    sharedState: SharedState
  ): void {
    const serverUri = tagAttributes[ExtXContentSteering.SERVER_URI_];
    const resolvedServerUri = this.resolveUriAttribute_(
      serverUri,
      sharedState.baseUrl,
      ExtXContentSteering.SERVER_URI_
    );

    playlist.contentSteering = {
      serverUri,
      resolvedServerUri,
      pathwayId: tagAttributes[ExtXContentSteering.PATHWAY_ID_],
    };
  }
}

export class ExtXDefine extends TagWithAttributesProcessor {
  private static readonly NAME_ = 'NAME';
  private static readonly VALUE_ = 'VALUE';
  private static readonly IMPORT_ = 'IMPORT';
  private static readonly QUERYPARAM_ = 'QUERYPARAM';

  protected readonly requiredAttributes_ = new Set([]);
  protected readonly tag_ = EXT_X_DEFINE;

  protected getValueForImportDefine_(importName: string, sharedState: SharedState): string | null {
    if (!sharedState.baseDefine) {
      return null;
    }

    if (sharedState.baseDefine.name[importName]) {
      return sharedState.baseDefine.name[importName];
    }

    if (sharedState.baseDefine.import[importName]) {
      return sharedState.baseDefine.import[importName];
    }

    if (sharedState.baseDefine.queryParam[importName]) {
      return sharedState.baseDefine.queryParam[importName];
    }

    return null;
  }

  protected getValueForQueryParamDefine_(queryParam: string, sharedState: SharedState): string | null {
    if (!sharedState.baseUrl) {
      return null;
    }
    try {
      return new URL(sharedState.baseUrl).searchParams.get(queryParam);
    } catch (e) {
      return null;
    }
  }

  protected safeProcess_(
    tagAttributes: Record<string, string>,
    playlist: ParsedPlaylist,
    sharedState: SharedState
  ): void {
    if (tagAttributes[ExtXDefine.NAME_]) {
      playlist.define.name[tagAttributes[ExtXDefine.NAME_]] = tagAttributes[ExtXDefine.VALUE_];
      sharedState.hasVariablesForSubstitution = true;
    }

    if (tagAttributes[ExtXDefine.IMPORT_]) {
      playlist.define.import[tagAttributes[ExtXDefine.IMPORT_]] = this.getValueForImportDefine_(
        tagAttributes[ExtXDefine.IMPORT_],
        sharedState
      );

      if (playlist.define.import[tagAttributes[ExtXDefine.IMPORT_]] !== null) {
        sharedState.hasVariablesForSubstitution = true;
      }
    }

    if (tagAttributes[ExtXDefine.QUERYPARAM_]) {
      playlist.define.queryParam[tagAttributes[ExtXDefine.QUERYPARAM_]] = this.getValueForQueryParamDefine_(
        tagAttributes[ExtXDefine.QUERYPARAM_],
        sharedState
      );

      if (playlist.define.queryParam[tagAttributes[ExtXDefine.QUERYPARAM_]] !== null) {
        sharedState.hasVariablesForSubstitution = true;
      }
    }
  }
}
