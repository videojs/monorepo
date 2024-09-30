import type { WarnCallback } from '../types/parser-options';
import type { TagInfo } from '../state-machine';
import {
  ADAPTATION_SET,
  BASE_URL,
  MPD,
  PERIOD,
  REPRESENTATION,
  UTC_TIMING,
  EVENT_STREAM,
  EVENT,
  SEGMENT_TEMPLATE,
} from '../consts/tags';
import type {
  // ManifestType,
  EventScheme,
  ParsedManifest,
  UTCTimingScheme,
  Segment,
} from '../types/parsed-manifest';
import type { SharedState } from '../types/shared-state';
import type { PendingProcessors } from '../pending-processors';
import { missingRequiredAttributeWarn } from '../utils/warn';
import { parseAttributes } from '../parse-attributes';
import { parseUtcTimingScheme } from '../utils/parse-utc-timing-scheme';
import { segmentsFromTemplate } from '../segments/segment-parser';
import { resolveUrl } from '../segments/resolve-url';

export abstract class TagProcessor {
  protected readonly warnCallback_: WarnCallback;
  protected abstract readonly tag_: string;
  protected readonly requiredAttributes_ = new Set<string>();

  public process(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState,
    pendingProcessors: PendingProcessors
  ): void {
    let isRequiredAttributedMissed = false;

    this.requiredAttributes_.forEach((requiredAttribute) => {
      const hasRequiredAttribute = requiredAttribute in tagInfo.tagAttributes;

      if (!hasRequiredAttribute) {
        this.warnCallback_(missingRequiredAttributeWarn(this.tag_, requiredAttribute));
        isRequiredAttributedMissed = true;
      }
    });

    if (isRequiredAttributedMissed) {
      return;
    }

    return this.safeProcess_(tagInfo, parentTagInfo, parsedManifest, sharedState, pendingProcessors);
  }

  public processPending() // tagInfo: TagInfo,
  // parentTagInfo: TagInfo | null,
  // requiredChildren: Map<string, TagInfo | null>
  : void {
    // specific processor will override
  }

  protected abstract safeProcess_(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState,
    pendingProcessors: PendingProcessors
  ): void;

  public constructor(warnCallback: WarnCallback) {
    this.warnCallback_ = warnCallback;
  }
}

export class Mpd extends TagProcessor {
  private static readonly ID_ = 'id';
  private static readonly PROFILES_ = 'profiles';
  private static readonly TYPE_ = 'type';
  private static readonly AVAILABILITY_START_TIME_ = 'availabilityStartTime';
  private static readonly PUBLISH_TIME_ = 'publishTime';
  private static readonly MEDIA_PRESENTATION_TIME_ = 'mediaPresentationDuration';
  private static readonly MIN_BUFFER_TIME_ = 'minBufferTime';

  protected readonly requiredAttributes_ = new Set([Mpd.PROFILES_, Mpd.MIN_BUFFER_TIME_]);
  protected readonly tag_ = MPD;

  protected safeProcess_(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState
    // pendingProcessors: PendingProcessors
  ): void {
    const attributes = parseAttributes(tagInfo.tagAttributes);
    sharedState.mpdAttributes = {
      id: attributes[Mpd.ID_],
      profiles: attributes[Mpd.PROFILES_],
      type: attributes[Mpd.TYPE_] || 'static',
      availabilityStartTime: attributes[Mpd.AVAILABILITY_START_TIME_],
      publishTime: attributes[Mpd.PUBLISH_TIME_],
      mediaPresentationDuration: attributes[Mpd.MEDIA_PRESENTATION_TIME_],
    };
  }
}

export class Period extends TagProcessor {
  private static readonly ID_ = 'id';
  private static readonly START_ = 'start';
  private static readonly DURATION_ = 'duration';

  protected readonly tag_ = PERIOD;

  // TODO:
  protected readonly requiredAttributes_ = new Set<string>();

  protected safeProcess_(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState
    // pendingProcessors: PendingProcessors
  ): void {
    const attributes = parseAttributes(tagInfo.tagAttributes);
    sharedState.periodAttributes = {
      id: attributes[Period.ID_],
      start: attributes[Period.START_],
      duration: attributes[Period.DURATION_],
    };
  }
}

export class AdaptationSet extends TagProcessor {
  private static readonly MIME_TYPE_ = 'mimeType';
  private static readonly CONTENT_TYPE_ = 'contentType';
  private static readonly SUBSEGMENT_ALIGNMENT_ = 'subsegmentAlignment';

  protected readonly requiredAttributes_ = new Set([AdaptationSet.MIME_TYPE_, AdaptationSet.CONTENT_TYPE_]);
  protected readonly tag_ = ADAPTATION_SET;

  protected safeProcess_(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState
    // pendingProcessors: PendingProcessors
  ): void {
    const attributes = parseAttributes(tagInfo.tagAttributes);
    sharedState.adaptationSetAttributes = {
      mimeType: attributes[AdaptationSet.MIME_TYPE_],
      contentType: attributes[AdaptationSet.CONTENT_TYPE_],
      subsegmentAlignment: attributes[AdaptationSet.SUBSEGMENT_ALIGNMENT_],
    };
  }
}

export class BaseUrl extends TagProcessor {
  private static readonly SERVICE_LOCATION_ = 'serviceLocation';
  private static readonly BYTE_RANGE_ = 'byteRange';
  private static readonly AVAILABILITY_TIME_OFFSET_ = 'availabilityTimeOffset';
  private static readonly AVAILABILITY_TIME_COMPLETE_ = 'availabilityTimeComplete';
  private static readonly TIMESHIFT_BUFFER_DEPTH_ = 'timeShiftBufferDepth';
  private static readonly RANGE_ACCESS_ = 'rangeAccess';

  protected readonly requiredAttributes_ = new Set<string>();
  protected readonly tag_ = BASE_URL;

  protected safeProcess_(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState
    // pendingProcessors: PendingProcessors
  ): void {
    const uri = tagInfo.tagValue as string;
    const attributes = tagInfo.tagAttributes;
    const prevBaseURLs = sharedState.baseUrls || [];
    const newBaseURLs = [];

    // First Base URL
    if (!prevBaseURLs.length) {
      sharedState.baseUrls.push({ uri, attributes, parentKey: parentTagInfo?.tagKey });
    } else {
      for (const base of prevBaseURLs) {
        const resolved = resolveUrl(uri, base.uri);

        // URI is absolute
        if (resolved === uri) {
          // add new absolute baseURL to preexisting list

          sharedState.baseUrls.push({ uri, attributes, parentKey: parentTagInfo?.tagKey });

          break;
        } else {
          // URL is relative
          // concat to all other URLs
          if (parentTagInfo?.tagKey !== base.parentKey) {
            // We only want to concat if they are not children of the same node
            newBaseURLs.push({
              uri: resolved,
              attributes: { ...base.attributes, ...attributes },
              parentKey: parentTagInfo?.tagKey,
            });
          }
        }
      }

      if (newBaseURLs.length) {
        sharedState.baseUrls = newBaseURLs;
      }
    }

    // TODO: Do we need to handle use case where there are multiple
    // relative url segments on the same level?
    // This seems like an extremely uncommon use case, but may be worth thinking about

    // TODO: Handle child BaseURL of Representation
  }
}

export class Representation extends TagProcessor {
  private static readonly ID_ = 'id';
  private static readonly CODECS_ = 'codecs';
  private static readonly BANDWIDTH_ = 'bandwidth';
  private static readonly WIDTH_ = 'width';
  private static readonly HEIGHT_ = 'height';
  private static readonly FRAME_RATE_ = 'frameRate';
  private static readonly SAR_ = 'sar';
  private static readonly SCAN_TYPE_ = 'scanType';
  private static readonly PROFILES_ = 'profiles';
  private static readonly AUDIO_SAMPLING_RATE_ = 'audioSamplingRate';
  private static readonly MIME_TYPE_ = 'mimeType';
  private static readonly SEGMENT_PROFILES_ = 'segmentProfiles';
  private static readonly CONTAINER_PROFILES_ = 'containerProfiles';
  private static readonly MAXIMUM_SAP_PERIOD_ = 'maximumSAPPeriod';
  private static readonly START_WITH_SAP_ = 'startWithSAP';
  private static readonly MAX_PLAYOUT_RATE_ = 'maxPlayoutRate';
  private static readonly CODING_DEPENDENCY_ = 'codingDependency';
  private static readonly SELECTION_PRIORITY_ = 'selectionPriority';
  private static readonly TAG_ = 'tag';
  private static readonly INITIALIZATION_ = 'initialization';

  protected readonly tag_ = REPRESENTATION;
  // TODO
  protected readonly requiredAttributes_ = new Set<string>();

  protected safeProcess_(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState
    // pendingProcessors: PendingProcessors
  ): void {
    // TODO: Once parent info is passed in, we can check this.

    // AdaptationSet must be the parent of a Representation node.
    // if (parentTagInfo.tagKey !== ADAPTATION_SET) {
    //   return;
    // }

    // TODO: Set pending processors
    // pendingProcessors = [];

    const attributes = parseAttributes(tagInfo.tagAttributes);
    const previousAttributes = {
      ...sharedState.mpdAttributes,
      ...sharedState.periodAttributes,
      ...sharedState.adaptationSetAttributes,
    };

    let segments: Array<Segment> = [];
    // TODO: we may want to ensure we are not waiting on any more nodes to process here as well.

    for (const base of sharedState.baseUrls) {
      if (sharedState.segmentTemplateAttributes) {
        segments = segmentsFromTemplate(sharedState.mpdAttributes.type as string, {
          ...previousAttributes,
          ...attributes,
          ...sharedState.segmentTemplateAttributes,
          baseUrl: base.uri,
        });
      }

      const rep = {
        ...previousAttributes,
        // TODO: ID isn't required, so set this in a better way if it doesn't exit
        // Maybe use period id.
        id: attributes[Representation.ID_] || 'default-id',
        codecs: attributes[Representation.CODECS_],
        bandwidth: attributes[Representation.BANDWIDTH_],
        initialization: attributes[Representation.INITIALIZATION_],
        width: attributes[Representation.WIDTH_],
        height: attributes[Representation.HEIGHT_],
        frameRate: attributes[Representation.FRAME_RATE_],
        sar: attributes[Representation.SAR_],
        scanType: attributes[Representation.SCAN_TYPE_],
        profiles: attributes[Representation.PROFILES_],
        audioSamplingRate: attributes[Representation.AUDIO_SAMPLING_RATE_],
        mimeType: attributes[Representation.MIME_TYPE_],
        segmentProfiles: attributes[Representation.SEGMENT_PROFILES_],
        containerProfiles: attributes[Representation.CONTAINER_PROFILES_],
        maximumSAPPeriod: attributes[Representation.MAXIMUM_SAP_PERIOD_],
        startWithSAP: attributes[Representation.START_WITH_SAP_],
        maxPlayoutRate: attributes[Representation.MAX_PLAYOUT_RATE_],
        codingDependency: attributes[Representation.CODING_DEPENDENCY_],
        selectionPriority: attributes[Representation.SELECTION_PRIORITY_],
        tag: attributes[Representation.TAG_],
        segments,
        baseUrl: base.uri,
      };

      parsedManifest.representations.push(rep);
    }
  }
}

export class SegmentTemplate extends TagProcessor {
  private static readonly MEDIA_ = 'media';
  private static readonly INDEX_ = 'index';
  private static readonly INITIALIZATION_ = 'initialization';
  private static readonly BIT_STREAM_SWITCHING_ = 'bitstreamSwitching';
  private static readonly DURATION_ = 'duration';
  private static readonly TIME_SCALE_ = 'timescale';
  private static readonly START_NUMBER_ = 'startNumber';

  protected readonly tag_ = SEGMENT_TEMPLATE;
  // TODO
  protected readonly requiredAttributes_ = new Set<string>();

  protected safeProcess_(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState
    // pendingProcessors: PendingProcessors
  ): void {
    const attributes = parseAttributes(tagInfo.tagAttributes);
    sharedState.segmentTemplateAttributes = {
      media: attributes[SegmentTemplate.MEDIA_],
      index: attributes[SegmentTemplate.INDEX_],
      initialization: attributes[SegmentTemplate.INITIALIZATION_],
      bitstreamSwitching: attributes[SegmentTemplate.BIT_STREAM_SWITCHING_],
      duration: attributes[SegmentTemplate.DURATION_],
      timescale: attributes[SegmentTemplate.TIME_SCALE_],
      startNumber: attributes[SegmentTemplate.START_NUMBER_],
    };
  }
}

export class UTCTiming extends TagProcessor {
  private static readonly SCHEME_ID_URI_ = 'schemeIdUri';

  protected readonly requiredAttributes_ = new Set([UTCTiming.SCHEME_ID_URI_]);
  protected readonly tag_ = UTC_TIMING;

  protected safeProcess_(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest
    // sharedState: SharedState,
    // pendingProcessors: PendingProcessors
  ): void {
    const attributes = parseAttributes(tagInfo.tagAttributes);

    // Attributes other than SCHEME_ID_URI are added in the below function.
    const utcAttributes = parseUtcTimingScheme(attributes);
    parsedManifest.utcTimingScheme = utcAttributes as UTCTimingScheme;
  }
}

export class EventStream extends TagProcessor {
  // TODO
  protected readonly tag_ = EVENT_STREAM;
  // TODO
  protected readonly requiredAttributes_ = new Set<string>();

  protected safeProcess_() // tagInfo: TagInfo,
  // parentTagInfo: TagInfo | null,
  // parsedManifest: ParsedManifest,
  // sharedState: SharedState,
  // pendingProcessors: PendingProcessors
  : void {}
}

export class Event extends TagProcessor {
  protected readonly tag_ = EVENT;
  // TODO
  protected readonly requiredAttributes_ = new Set<string>();

  protected safeProcess_(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest
    // sharedState: SharedState
    // pendingProcessors: PendingProcessors
  ): void {
    const attributes = parseAttributes(tagInfo.tagAttributes);

    if (!parsedManifest.events) {
      parsedManifest.events = [];
    }

    // TODO: use data from state to finish this.

    // const presentationTime = attributes.presentationTime || 0;
    // const presentationTime = 0;
    // const timescale = eventStreamAttributes.timescale || 1;
    const timescale = 1;
    const duration = (attributes.duration as number) || 0;
    // const start = (presentationTime / timescale) + period.attributes.start;
    const start = 0;

    const event = {
      schemeIdUri: attributes.schemeIdUri,
      // value: eventStreamAttributes.value,
      id: attributes.id,
      start,
      end: start + duration / timescale,
      // messageData: getContent(event) || eventAttributes.messageData,
      messageData: attributes.messageData,
      // contentEncoding: eventStreamAttributes.contentEncoding,
      // presentationTimeOffset: eventStreamAttributes.presentationTimeOffset || 0
    };

    parsedManifest.events.push(event as EventScheme);
  }
}
