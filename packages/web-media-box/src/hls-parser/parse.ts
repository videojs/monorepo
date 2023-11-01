import createStateMachine from './stateMachine.ts';
import type { StateMachineTransition } from './stateMachine.ts';
import { noop } from '../utils/fn.ts';
import {
  ignoreTagWarn,
  missingTagValueWarn,
  segmentDurationExceededTargetDuration,
  unsupportedTagWarn,
} from './utils/warn.ts';

import {
  // EXT_X_DEFINE,
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
} from './consts/tags.ts';
import type {
  CustomTagMap,
  DebugCallback,
  ParserOptions,
  TransformTagAttributes,
  TransformTagValue,
  WarnCallback,
} from './types/parserOptions';
import type { Segment, ParsedPlaylist, VariantStream } from './types/parsedPlaylist';
import type { SharedState } from './types/sharedState';
import type { EmptyTagProcessor } from './tags/emptyTagProcessors.ts';
import {
  ExtXEndList,
  ExtXIframesOnly,
  ExtXIndependentSegments,
  ExtXDiscontinuity,
  ExtXGap,
  ExtM3u,
} from './tags/emptyTagProcessors.ts';
import type { TagWithValueProcessor } from './tags/tagWithValueProcessors.ts';
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
} from './tags/tagWithValueProcessors.ts';
import type { TagWithAttributesProcessor } from './tags/tagWithAttributesProcessors.ts';
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
} from './tags/tagWithAttributesProcessors.ts';

const defaultSegment: Segment = {
  duration: 0,
  mediaSequence: 0,
  discontinuitySequence: 0,
  isDiscontinuity: false,
  isGap: false,
  uri: '',
  parts: [],
};

const defaultVariantStream: VariantStream = {
  bandwidth: 0,
  uri: '',
};

const defaultParsedPlaylist: ParsedPlaylist = {
  m3u: false,
  independentSegments: false,
  endList: false,
  iFramesOnly: false,
  segments: [],
  custom: {},
  renditionGroups: {
    audio: {},
    video: {},
    subtitles: {},
    closedCaptions: {},
  },
  variantStreams: [],
  iFramePlaylists: [],
  dateRanges: [],
  preloadHints: [],
  renditionReports: [],
  sessionDataTags: [],
};

class Parser {
  private readonly warnCallback: WarnCallback;
  private readonly debugCallback: DebugCallback;
  private readonly customTagMap: CustomTagMap;
  private readonly ignoreTags: Set<string>;
  private readonly transformTagValue: TransformTagValue;
  private readonly transformTagAttributes: TransformTagAttributes;
  private readonly emptyTagMap: Record<string, EmptyTagProcessor>;
  private readonly tagValueMap: Record<string, TagWithValueProcessor>;
  private readonly tagAttributesMap: Record<string, TagWithAttributesProcessor>;

  protected parsedPlaylist: ParsedPlaylist;
  protected sharedState: SharedState;

  public constructor(options: ParserOptions) {
    this.warnCallback = options.warnCallback || noop;
    this.debugCallback = options.debugCallback || noop;
    this.customTagMap = options.customTagMap || {};
    this.ignoreTags = options.ignoreTags || new Set();
    this.transformTagValue = options.transformTagValue || ((tagKey, tagValue): string | null => tagValue);
    this.transformTagAttributes =
      options.transformTagAttributes || ((tagKey, tagAttributes): Record<string, string> => tagAttributes);

    this.parsedPlaylist = structuredClone(defaultParsedPlaylist);

    this.sharedState = {
      isMultivariantPlaylist: false,
      currentSegment: structuredClone(defaultSegment),
      currentVariant: structuredClone(defaultVariantStream),
    };

    this.emptyTagMap = {
      [EXTM3U]: new ExtM3u(this.warnCallback),
      [EXT_X_INDEPENDENT_SEGMENTS]: new ExtXIndependentSegments(this.warnCallback),
      [EXT_X_ENDLIST]: new ExtXEndList(this.warnCallback),
      [EXT_X_I_FRAMES_ONLY]: new ExtXIframesOnly(this.warnCallback),
      [EXT_X_DISCONTINUITY]: new ExtXDiscontinuity(this.warnCallback),
      [EXT_X_GAP]: new ExtXGap(this.warnCallback),
    };

    this.tagValueMap = {
      [EXT_X_VERSION]: new ExtXVersion(this.warnCallback),
      [EXT_X_TARGETDURATION]: new ExtXTargetDuration(this.warnCallback),
      [EXT_X_MEDIA_SEQUENCE]: new ExtXMediaSequence(this.warnCallback),
      [EXT_X_DISCONTINUITY_SEQUENCE]: new ExtXDiscontinuitySequence(this.warnCallback),
      [EXT_X_PLAYLIST_TYPE]: new ExtXPlaylistType(this.warnCallback),
      [EXTINF]: new ExtInf(this.warnCallback),
      [EXT_X_BYTERANGE]: new ExtXByteRange(this.warnCallback),
      [EXT_X_BITRATE]: new ExtXBitrate(this.warnCallback),
      [EXT_X_PROGRAM_DATE_TIME]: new ExtXProgramDateTime(this.warnCallback),
    };

    this.tagAttributesMap = {
      [EXT_X_START]: new ExtXStart(this.warnCallback),
      [EXT_X_PART_INF]: new ExtXPartInf(this.warnCallback),
      [EXT_X_SERVER_CONTROL]: new ExtXServerControl(this.warnCallback),
      [EXT_X_KEY]: new ExtXKey(this.warnCallback),
      [EXT_X_MAP]: new ExtXMap(this.warnCallback),
      [EXT_X_PART]: new ExtXPart(this.warnCallback),
      [EXT_X_MEDIA]: new ExtXMedia(this.warnCallback),
      [EXT_X_STREAM_INF]: new ExtXStreamInf(this.warnCallback),
      [EXT_X_SKIP]: new ExtXSkip(this.warnCallback),
      [EXT_X_I_FRAME_STREAM_INF]: new ExtXIFrameStreamInf(this.warnCallback),
      [EXT_X_DATERANGE]: new ExtXDateRange(this.warnCallback),
      [EXT_X_PRELOAD_HINT]: new ExtXPreloadHint(this.warnCallback),
      [EXT_X_RENDITION_REPORT]: new ExtXRenditionReport(this.warnCallback),
      [EXT_X_SESSION_DATA]: new ExtXSessionData(this.warnCallback),
      [EXT_X_SESSION_KEY]: new ExtXSessionKey(this.warnCallback),
    };
  }

  protected readonly tagInfoCallback = (
    tagKey: string,
    tagValue: string | null,
    tagAttributes: Record<string, string>
  ): void => {
    this.debugCallback(`Received tag info from scanner: `, { tagKey, tagValue, tagAttributes });

    if (this.ignoreTags.has(tagKey)) {
      return this.warnCallback(ignoreTagWarn(tagKey));
    }

    //1. Process simple tags without values or attributes:
    if (tagKey in this.emptyTagMap) {
      const emptyTagProcessor = this.emptyTagMap[tagKey];
      return emptyTagProcessor.process(this.parsedPlaylist, this.sharedState);
    }

    //2. Process tags with values:
    if (tagKey in this.tagValueMap) {
      tagValue = this.transformTagValue(tagKey, tagValue);

      if (tagValue === null) {
        return this.warnCallback(missingTagValueWarn(tagKey));
      }

      const tagWithValueProcessor = this.tagValueMap[tagKey];
      return tagWithValueProcessor.process(tagValue, this.parsedPlaylist, this.sharedState);
    }

    //3. Process tags with attributes:
    if (tagKey in this.tagAttributesMap) {
      tagAttributes = this.transformTagAttributes(tagKey, tagAttributes);
      const tagWithAttributesProcessor = this.tagAttributesMap[tagKey];

      return tagWithAttributesProcessor.process(tagAttributes, this.parsedPlaylist, this.sharedState);
    }

    //4. Process custom tags:
    if (tagKey in this.customTagMap) {
      const customTagProcessor = this.customTagMap[tagKey];

      return customTagProcessor(tagKey, tagValue, tagAttributes, this.parsedPlaylist.custom, this.sharedState);
    }

    // 5. Unable to process received tag:
    this.warnCallback(unsupportedTagWarn(tagKey));
  };

  protected readonly uriInfoCallback = (uri: string): void => {
    if (this.sharedState.isMultivariantPlaylist) {
      this.handleCurrentVariant(uri);
    } else {
      this.handleCurrentSegment(uri);
    }
  };

  private handleCurrentVariant(uri: string): void {
    this.sharedState.currentVariant.uri = uri;
    this.parsedPlaylist.variantStreams.push(this.sharedState.currentVariant);
    this.sharedState.currentVariant = structuredClone(defaultVariantStream);
  }

  private handleCurrentSegment(uri: string): void {
    if (
      this.parsedPlaylist.targetDuration !== undefined &&
      this.sharedState.currentSegment.duration > this.parsedPlaylist.targetDuration
    ) {
      this.warnCallback(
        segmentDurationExceededTargetDuration(
          uri,
          this.sharedState.currentSegment.duration,
          this.parsedPlaylist.targetDuration
        )
      );
    }

    const previousSegment = this.parsedPlaylist.segments[this.parsedPlaylist.segments.length - 1];

    this.sharedState.currentSegment.encryption = this.sharedState.currentEncryption;
    this.sharedState.currentSegment.map = this.sharedState.currentMap;
    this.sharedState.currentSegment.uri = uri;

    if (previousSegment) {
      this.sharedState.currentSegment.mediaSequence = previousSegment.mediaSequence + 1;

      if (this.sharedState.currentSegment.isDiscontinuity) {
        this.sharedState.currentSegment.discontinuitySequence = previousSegment.discontinuitySequence + 1;
      } else {
        this.sharedState.currentSegment.discontinuitySequence = previousSegment.discontinuitySequence;
      }
    }

    // Apply the EXT-X-BITRATE value from previous segments to this segment as well,
    // as long as it doesn't have an EXT-X-BYTERANGE tag applied to it.
    // https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis#section-4.4.4.8
    if (this.sharedState.currentBitrate && !this.sharedState.currentSegment.byteRange) {
      this.sharedState.currentSegment.bitrate = this.sharedState.currentBitrate;
    }

    // Extrapolate a program date time value from the previous segment's program date time
    if (!this.sharedState.currentSegment.programDateTime && previousSegment?.programDateTime) {
      this.sharedState.currentSegment.programDateTime =
        previousSegment.programDateTime + previousSegment.duration * 1000;
    }

    this.parsedPlaylist.segments.push(this.sharedState.currentSegment);
    this.sharedState.currentSegment = structuredClone(defaultSegment);
  }

  protected clean(): ParsedPlaylist {
    const copy = { ...this.parsedPlaylist };
    this.parsedPlaylist = structuredClone(defaultParsedPlaylist);

    return copy;
  }

  protected transitionToNewLine(stateMachine: StateMachineTransition): void {
    stateMachine('\n');
  }
}

export class FullPlaylistParser extends Parser {
  public parseFullPlaylistString(playlist: string): ParsedPlaylist {
    const stateMachine = createStateMachine(this.tagInfoCallback, this.uriInfoCallback);
    const length = playlist.length;

    for (let i = 0; i < length; i++) {
      stateMachine(playlist[i]);
    }

    this.transitionToNewLine(stateMachine);

    return this.clean();
  }

  public parseFullPlaylistBuffer(playlist: Uint8Array): ParsedPlaylist {
    const stateMachine = createStateMachine(this.tagInfoCallback, this.uriInfoCallback);
    const length = playlist.length;

    for (let i = 0; i < length; i++) {
      stateMachine(String.fromCharCode(playlist[i]));
    }

    this.transitionToNewLine(stateMachine);

    return this.clean();
  }
}

export class ProgressiveParser extends Parser {
  private stateMachine: StateMachineTransition | null = null;

  public pushString(chunk: string): void {
    if (this.stateMachine === null) {
      this.stateMachine = createStateMachine(this.tagInfoCallback, this.uriInfoCallback);
    }

    for (let i = 0; i < chunk.length; i++) {
      this.stateMachine(chunk[i]);
    }
  }

  public pushBuffer(chunk: Uint8Array): void {
    if (this.stateMachine === null) {
      this.stateMachine = createStateMachine(this.tagInfoCallback, this.uriInfoCallback);
    }

    for (let i = 0; i < chunk.length; i++) {
      this.stateMachine(String.fromCharCode(chunk[i]));
    }
  }

  public done(): ParsedPlaylist {
    if (this.stateMachine) {
      this.transitionToNewLine(this.stateMachine);
    }

    this.stateMachine = null;

    return this.clean();
  }
}
