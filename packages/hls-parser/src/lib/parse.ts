import createStateMachine from './state-machine';
import type { StateMachineTransition } from './state-machine';
import {
  failedToResolveUri,
  ignoreTagWarn,
  missingRequiredVariableForUriSubstitutionWarn,
  missingTagValueWarn,
  segmentDurationExceededTargetDuration,
  unsupportedTagWarn,
} from './utils/warn';

import {
  EXT_X_DEFINE,
  EXT_X_DISCONTINUITY_SEQUENCE,
  EXT_X_ENDLIST,
  EXT_X_I_FRAMES_ONLY,
  EXT_X_INDEPENDENT_SEGMENTS,
  EXT_X_MEDIA_SEQUENCE,
  EXT_X_PART_INF,
  EXT_X_PLAYLIST_TYPE,
  EXT_X_SERVER_CONTROL,
  EXT_X_START,
  EXT_X_TARGETDURATION,
  EXT_X_VERSION,
  EXTINF,
  EXT_X_BYTERANGE,
  EXT_X_DISCONTINUITY,
  EXT_X_KEY,
  EXT_X_MAP,
  EXT_X_GAP,
  EXT_X_BITRATE,
  EXT_X_PART,
  EXT_X_PROGRAM_DATE_TIME,
  EXT_X_MEDIA,
  EXT_X_STREAM_INF,
  EXT_X_SKIP,
  EXT_X_I_FRAME_STREAM_INF,
  EXT_X_DATERANGE,
  EXT_X_PRELOAD_HINT,
  EXT_X_RENDITION_REPORT,
  EXT_X_SESSION_DATA,
  EXTM3U,
  EXT_X_SESSION_KEY,
  EXT_X_CONTENT_STEERING,
} from './consts/tags';
import type {
  CustomTagMap,
  DebugCallback,
  ParseOptions,
  ParserOptions,
  TransformTagAttributes,
  TransformTagValue,
  WarnCallback,
} from './types/parser-options';
import type { ParsedPlaylist } from './types/parsed-playlist';
import type { SharedState } from './types/shared-state';
import type { EmptyTagProcessor } from './tags/empty-tag-processors';
import {
  ExtXEndList,
  ExtXIframesOnly,
  ExtXIndependentSegments,
  ExtXDiscontinuity,
  ExtXGap,
  ExtM3u,
} from './tags/empty-tag-processors';
import type { TagWithValueProcessor } from './tags/tag-with-value-processors';
import {
  ExtXBitrate,
  ExtXByteRange,
  ExtInf,
  ExtXDiscontinuitySequence,
  ExtXMediaSequence,
  ExtXPlaylistType,
  ExtXTargetDuration,
  ExtXVersion,
  ExtXProgramDateTime,
} from './tags/tag-with-value-processors';
import type { TagWithAttributesProcessor } from './tags/tag-with-attributes-processors';
import {
  ExtXPartInf,
  ExtXServerControl,
  ExtXStart,
  ExtXKey,
  ExtXMap,
  ExtXPart,
  ExtXMedia,
  ExtXStreamInf,
  ExtXSkip,
  ExtXIFrameStreamInf,
  ExtXDateRange,
  ExtXPreloadHint,
  ExtXRenditionReport,
  ExtXSessionData,
  ExtXSessionKey,
  ExtXContentSteering,
  ExtXDefine,
} from './tags/tag-with-attributes-processors';
import {
  createDefaultParsedPlaylist,
  createDefaultSegment,
  createDefaultSharedState,
  createDefaultVariantStream,
} from './consts/defaults';
import { resolveUri, substituteVariables } from './utils/parse';

class Parser {
  private readonly warnCallback_: WarnCallback;
  private readonly debugCallback_: DebugCallback;
  private readonly customTagMap_: CustomTagMap;
  private readonly ignoreTags_: Set<string>;
  private readonly transformTagValue_: TransformTagValue;
  private readonly transformTagAttributes_: TransformTagAttributes;
  private readonly emptyTagMap_: Record<string, EmptyTagProcessor>;
  private readonly tagValueMap_: Record<string, TagWithValueProcessor>;
  private readonly tagAttributesMap_: Record<string, TagWithAttributesProcessor>;

  protected parsedPlaylist_: ParsedPlaylist;
  protected sharedState_: SharedState;

  public constructor(options: ParserOptions) {
    this.warnCallback_ = options.warnCallback || ((): void => {});
    this.debugCallback_ = options.debugCallback || ((): void => {});
    this.customTagMap_ = options.customTagMap || {};
    this.ignoreTags_ = options.ignoreTags || new Set();
    this.transformTagValue_ = options.transformTagValue || ((tagKey, tagValue): string | null => tagValue);
    this.transformTagAttributes_ =
      options.transformTagAttributes || ((tagKey, tagAttributes): Record<string, string> => tagAttributes);

    this.parsedPlaylist_ = createDefaultParsedPlaylist();
    this.sharedState_ = createDefaultSharedState();

    this.emptyTagMap_ = {
      [EXTM3U]: new ExtM3u(this.warnCallback_),
      [EXT_X_INDEPENDENT_SEGMENTS]: new ExtXIndependentSegments(this.warnCallback_),
      [EXT_X_ENDLIST]: new ExtXEndList(this.warnCallback_),
      [EXT_X_I_FRAMES_ONLY]: new ExtXIframesOnly(this.warnCallback_),
      [EXT_X_DISCONTINUITY]: new ExtXDiscontinuity(this.warnCallback_),
      [EXT_X_GAP]: new ExtXGap(this.warnCallback_),
    };

    this.tagValueMap_ = {
      [EXT_X_VERSION]: new ExtXVersion(this.warnCallback_),
      [EXT_X_TARGETDURATION]: new ExtXTargetDuration(this.warnCallback_),
      [EXT_X_MEDIA_SEQUENCE]: new ExtXMediaSequence(this.warnCallback_),
      [EXT_X_DISCONTINUITY_SEQUENCE]: new ExtXDiscontinuitySequence(this.warnCallback_),
      [EXT_X_PLAYLIST_TYPE]: new ExtXPlaylistType(this.warnCallback_),
      [EXTINF]: new ExtInf(this.warnCallback_),
      [EXT_X_BYTERANGE]: new ExtXByteRange(this.warnCallback_),
      [EXT_X_BITRATE]: new ExtXBitrate(this.warnCallback_),
      [EXT_X_PROGRAM_DATE_TIME]: new ExtXProgramDateTime(this.warnCallback_),
    };

    this.tagAttributesMap_ = {
      [EXT_X_START]: new ExtXStart(this.warnCallback_),
      [EXT_X_PART_INF]: new ExtXPartInf(this.warnCallback_),
      [EXT_X_SERVER_CONTROL]: new ExtXServerControl(this.warnCallback_),
      [EXT_X_KEY]: new ExtXKey(this.warnCallback_),
      [EXT_X_MAP]: new ExtXMap(this.warnCallback_),
      [EXT_X_PART]: new ExtXPart(this.warnCallback_),
      [EXT_X_MEDIA]: new ExtXMedia(this.warnCallback_),
      [EXT_X_STREAM_INF]: new ExtXStreamInf(this.warnCallback_),
      [EXT_X_SKIP]: new ExtXSkip(this.warnCallback_),
      [EXT_X_I_FRAME_STREAM_INF]: new ExtXIFrameStreamInf(this.warnCallback_),
      [EXT_X_DATERANGE]: new ExtXDateRange(this.warnCallback_),
      [EXT_X_PRELOAD_HINT]: new ExtXPreloadHint(this.warnCallback_),
      [EXT_X_RENDITION_REPORT]: new ExtXRenditionReport(this.warnCallback_),
      [EXT_X_SESSION_DATA]: new ExtXSessionData(this.warnCallback_),
      [EXT_X_SESSION_KEY]: new ExtXSessionKey(this.warnCallback_),
      [EXT_X_CONTENT_STEERING]: new ExtXContentSteering(this.warnCallback_),
      [EXT_X_DEFINE]: new ExtXDefine(this.warnCallback_),
    };
  }

  protected readonly tagInfoCallback_ = (
    tagKey: string,
    tagValue: string | null,
    tagAttributes: Record<string, string>
  ): void => {
    this.debugCallback_(`Received tag info from scanner: `, { tagKey, tagValue, tagAttributes });

    if (this.ignoreTags_.has(tagKey)) {
      return this.warnCallback_(ignoreTagWarn(tagKey));
    }

    //1. Process simple tags without values or attributes:
    if (tagKey in this.emptyTagMap_) {
      const emptyTagProcessor = this.emptyTagMap_[tagKey];
      return emptyTagProcessor.process(this.parsedPlaylist_, this.sharedState_);
    }

    //2. Process tags with values:
    if (tagKey in this.tagValueMap_) {
      tagValue = this.transformTagValue_(tagKey, tagValue);

      if (tagValue === null) {
        return this.warnCallback_(missingTagValueWarn(tagKey));
      }

      const tagWithValueProcessor = this.tagValueMap_[tagKey];
      return tagWithValueProcessor.process(tagValue, this.parsedPlaylist_, this.sharedState_);
    }

    //3. Process tags with attributes:
    if (tagKey in this.tagAttributesMap_) {
      tagAttributes = this.transformTagAttributes_(tagKey, tagAttributes);
      const tagWithAttributesProcessor = this.tagAttributesMap_[tagKey];

      return tagWithAttributesProcessor.process(tagAttributes, this.parsedPlaylist_, this.sharedState_);
    }

    //4. Process custom tags:
    if (tagKey in this.customTagMap_) {
      const customTagProcessor = this.customTagMap_[tagKey];

      return customTagProcessor(tagKey, tagValue, tagAttributes, this.parsedPlaylist_.custom, this.sharedState_);
    }

    // 5. Unable to process received tag:
    this.warnCallback_(unsupportedTagWarn(tagKey));
  };

  protected readonly uriInfoCallback_ = (uri: string): void => {
    if (this.sharedState_.hasVariablesForSubstitution) {
      uri = substituteVariables(uri, this.parsedPlaylist_.define, (variableName) => {
        this.warnCallback_(missingRequiredVariableForUriSubstitutionWarn(uri, variableName));
      });
    }

    let resolvedUri = resolveUri(uri, this.sharedState_.baseUrl);

    if (resolvedUri === null) {
      this.warnCallback_(failedToResolveUri(uri, this.sharedState_.baseUrl));
      resolvedUri = uri;
    }

    if (this.sharedState_.isMultivariantPlaylist) {
      this.handleCurrentVariant_(uri, resolvedUri);
    } else {
      this.handleCurrentSegment_(uri, resolvedUri);
    }
  };

  private handleCurrentVariant_(uri: string, resolvedUri: string): void {
    this.sharedState_.currentVariant.uri = uri;
    this.sharedState_.currentVariant.resolvedUri = resolvedUri;
    this.parsedPlaylist_.variantStreams.push(this.sharedState_.currentVariant);
    this.sharedState_.currentVariant = createDefaultVariantStream();
  }

  private handleCurrentSegment_(uri: string, resolvedUri: string): void {
    if (
      this.parsedPlaylist_.targetDuration !== undefined &&
      this.sharedState_.currentSegment.duration > this.parsedPlaylist_.targetDuration
    ) {
      this.warnCallback_(
        segmentDurationExceededTargetDuration(
          uri,
          this.sharedState_.currentSegment.duration,
          this.parsedPlaylist_.targetDuration
        )
      );
    }

    const previousSegment = this.parsedPlaylist_.segments[this.parsedPlaylist_.segments.length - 1];

    this.sharedState_.currentSegment.encryption = this.sharedState_.currentEncryption;
    this.sharedState_.currentSegment.map = this.sharedState_.currentMap;
    this.sharedState_.currentSegment.uri = uri;
    this.sharedState_.currentSegment.resolvedUri = resolvedUri;
    this.sharedState_.currentSegment.startTime = this.sharedState_.baseTime;

    if (previousSegment) {
      this.sharedState_.currentSegment.mediaSequence = previousSegment.mediaSequence + 1;
      this.sharedState_.currentSegment.startTime = previousSegment.endTime;

      if (this.sharedState_.currentSegment.isDiscontinuity) {
        this.sharedState_.currentSegment.discontinuitySequence = previousSegment.discontinuitySequence + 1;
      } else {
        this.sharedState_.currentSegment.discontinuitySequence = previousSegment.discontinuitySequence;
      }
    }

    this.sharedState_.currentSegment.endTime =
      this.sharedState_.currentSegment.startTime + this.sharedState_.currentSegment.duration;

    // Apply the EXT-X-BITRATE value from previous segments to this segment as well,
    // as long as it doesn't have an EXT-X-BYTERANGE tag applied to it.
    // https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis#section-4.4.4.8
    if (this.sharedState_.currentBitrate && !this.sharedState_.currentSegment.byteRange) {
      this.sharedState_.currentSegment.bitrate = this.sharedState_.currentBitrate;
    }

    // Extrapolate a program date time value from the previous segment's program date time
    if (!this.sharedState_.currentSegment.programDateTimeStart && previousSegment?.programDateTimeStart) {
      this.sharedState_.currentSegment.programDateTimeStart =
        previousSegment.programDateTimeStart + previousSegment.duration * 1000;
    }

    if (this.sharedState_.currentSegment.programDateTimeStart) {
      this.sharedState_.currentSegment.programDateTimeEnd =
        this.sharedState_.currentSegment.programDateTimeStart + this.sharedState_.currentSegment.duration * 1000;
    }

    this.parsedPlaylist_.segments.push(this.sharedState_.currentSegment);
    this.sharedState_.currentSegment = createDefaultSegment();
  }

  protected clean_(): ParsedPlaylist {
    const parsedPlaylist = this.parsedPlaylist_;

    this.parsedPlaylist_ = createDefaultParsedPlaylist();
    this.sharedState_ = createDefaultSharedState();

    return parsedPlaylist;
  }

  protected transitionToNewLine_(stateMachine: StateMachineTransition): void {
    stateMachine('\n');
  }

  protected gatherParseOptions_(options: ParseOptions): void {
    this.sharedState_.baseDefine = options.baseDefine;
    this.sharedState_.baseUrl = options.baseUrl;
    this.sharedState_.baseTime = options.baseTime || 0;
  }
}

export class FullPlaylistParser extends Parser {
  public static create(options: ParserOptions): FullPlaylistParser {
    return new FullPlaylistParser(options);
  }

  public parseFullPlaylistString(playlist: string, options: ParseOptions): ParsedPlaylist {
    this.gatherParseOptions_(options);

    const stateMachine = createStateMachine(this.tagInfoCallback_, this.uriInfoCallback_);
    const length = playlist.length;

    for (let i = 0; i < length; i++) {
      stateMachine(playlist[i]);
    }

    this.transitionToNewLine_(stateMachine);

    return this.clean_();
  }

  public parseFullPlaylistBuffer(playlist: Uint8Array, options: ParseOptions): ParsedPlaylist {
    this.gatherParseOptions_(options);

    const stateMachine = createStateMachine(this.tagInfoCallback_, this.uriInfoCallback_);
    const length = playlist.length;

    for (let i = 0; i < length; i++) {
      stateMachine(String.fromCharCode(playlist[i]));
    }

    this.transitionToNewLine_(stateMachine);

    return this.clean_();
  }
}

export class ProgressiveParser extends Parser {
  public static create(options: ParserOptions): ProgressiveParser {
    return new ProgressiveParser(options);
  }

  private stateMachine_: StateMachineTransition | null = null;

  public pushString(chunk: string, options: ParseOptions): void {
    this.gatherParseOptions_(options);

    if (this.stateMachine_ === null) {
      this.stateMachine_ = createStateMachine(this.tagInfoCallback_, this.uriInfoCallback_);
    }

    for (let i = 0; i < chunk.length; i++) {
      this.stateMachine_(chunk[i]);
    }
  }

  public pushBuffer(chunk: Uint8Array, options: ParseOptions): void {
    this.gatherParseOptions_(options);

    if (this.stateMachine_ === null) {
      this.stateMachine_ = createStateMachine(this.tagInfoCallback_, this.uriInfoCallback_);
    }

    for (let i = 0; i < chunk.length; i++) {
      this.stateMachine_(String.fromCharCode(chunk[i]));
    }
  }

  public done(): ParsedPlaylist {
    if (this.stateMachine_) {
      this.transitionToNewLine_(this.stateMachine_);
    }

    this.stateMachine_ = null;

    return this.clean_();
  }
}
