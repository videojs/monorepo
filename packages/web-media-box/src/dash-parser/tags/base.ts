import type { WarnCallback } from '@/dash-parser/types/parserOptions';
import type { TagInfo } from '@/dash-parser/stateMachine.ts';
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
} from '@/dash-parser/consts/tags.ts';
import type {
  // ManifestType,
  EventScheme,
  ParsedManifest,
  UTCTimingScheme,
  Segment,
} from '@/dash-parser/types/parsedManifest';
import type { SharedState } from '@/dash-parser/types/sharedState';
import type { PendingProcessors } from '@/dash-parser/pendingProcessors.ts';
import { missingRequiredAttributeWarn } from '@/dash-parser/utils/warn.ts';
import { parseAttributes } from '@/dash-parser/parseAttributes';
import { parseUTCTimingScheme } from '@/dash-parser/utils/parseUTCTimingScheme';
import { segmentsFromTemplate } from '../segments/segmentParser';
import { resolveURL } from '../segments/resolveUrl';

export abstract class TagProcessor {
  protected readonly warnCallback: WarnCallback;
  protected abstract readonly tag: string;
  protected abstract readonly requiredAttributes: Set<string>;

  public process(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState,
    pendingProcessors: PendingProcessors
  ): void {
    let isRequiredAttributedMissed = false;

    this.requiredAttributes &&
      this.requiredAttributes.forEach((requiredAttribute) => {
        const hasRequiredAttribute = requiredAttribute in tagInfo.tagAttributes;

        if (!hasRequiredAttribute) {
          this.warnCallback(missingRequiredAttributeWarn(this.tag, requiredAttribute));
          isRequiredAttributedMissed = true;
        }
      });

    if (isRequiredAttributedMissed) {
      return;
    }

    return this.safeProcess(tagInfo, parentTagInfo, parsedManifest, sharedState, pendingProcessors);
  }

  public processPending() // tagInfo: TagInfo,
  // parentTagInfo: TagInfo | null,
  // requiredChildren: Map<string, TagInfo | null>
  : void {
    // specific processor will override
  }

  protected abstract safeProcess(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState,
    pendingProcessors: PendingProcessors
  ): void;

  public constructor(warnCallback: WarnCallback) {
    this.warnCallback = warnCallback;
  }
}

export class Mpd extends TagProcessor {
  private static readonly ID = 'id';
  private static readonly PROFILES = 'profiles';
  private static readonly TYPE = 'type';
  private static readonly AVAILABILITY_START_TIME = 'availabilityStartTime';
  private static readonly PUBLISH_TIME = 'publishTime';
  private static readonly MEDIA_PRESENTATION_TIME = 'mediaPresentationDuration';
  private static readonly MIN_BUFFER_TIME = 'minBufferTime';

  protected readonly requiredAttributes = new Set([Mpd.PROFILES, Mpd.MIN_BUFFER_TIME]);
  protected readonly tag = MPD;

  protected safeProcess(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState
    // pendingProcessors: PendingProcessors
  ): void {
    const attributes = parseAttributes(tagInfo.tagAttributes);
    sharedState.mpdAttributes = {
      id: attributes[Mpd.ID],
      profiles: attributes[Mpd.PROFILES],
      type: attributes[Mpd.TYPE] || 'static',
      availabilityStartTime: attributes[Mpd.AVAILABILITY_START_TIME],
      publishTime: attributes[Mpd.PUBLISH_TIME],
      mediaPresentationDuration: attributes[Mpd.MEDIA_PRESENTATION_TIME],
    };
  }
}

export class Period extends TagProcessor {
  private static readonly ID = 'id';
  private static readonly START = 'start';
  private static readonly DURATION = 'duration';

  protected readonly tag = PERIOD;

  // TODO:
  protected readonly requiredAttributes = new Set<string>();

  protected safeProcess(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState
    // pendingProcessors: PendingProcessors
  ): void {
    const attributes = parseAttributes(tagInfo.tagAttributes);
    sharedState.periodAttributes = {
      id: attributes[Period.ID],
      start: attributes[Period.START],
      duration: attributes[Period.DURATION],
    };
  }
}

export class AdaptationSet extends TagProcessor {
  private static readonly MIME_TYPE = 'mimeType';
  private static readonly CONTENT_TYPE = 'contentType';
  private static readonly SUBSEGMENT_ALIGNMENT = 'subsegmentAlignment';

  protected readonly requiredAttributes = new Set([AdaptationSet.MIME_TYPE, AdaptationSet.CONTENT_TYPE]);
  protected readonly tag = ADAPTATION_SET;

  protected safeProcess(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState
    // pendingProcessors: PendingProcessors
  ): void {
    const attributes = parseAttributes(tagInfo.tagAttributes);
    sharedState.adaptationSetAttributes = {
      mimeType: attributes[AdaptationSet.MIME_TYPE],
      contentType: attributes[AdaptationSet.CONTENT_TYPE],
      subsegmentAlignment: attributes[AdaptationSet.SUBSEGMENT_ALIGNMENT],
    };
  }
}

export class BaseUrl extends TagProcessor {
  private static readonly SERVICE_LOCATION = 'serviceLocation';
  private static readonly BYTE_RANGE = 'byteRange';
  private static readonly AVAILABILITY_TIME_OFFSET = 'availabilityTimeOffset';
  private static readonly AVAILABILITY_TIME_COMPLETE = 'availabilityTimeComplete';
  private static readonly TIMESHIFT_BUFFER_DEPTH = 'timeShiftBufferDepth';
  private static readonly RANGE_ACCESS = 'rangeAccess';

  protected readonly requiredAttributes = new Set<string>();
  protected readonly tag = BASE_URL;

  protected safeProcess(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState
    // pendingProcessors: PendingProcessors
  ): void {
    const uri = tagInfo.tagValue;
    const attributes = tagInfo.tagAttributes;
    const prevBaseURLs = sharedState.baseUrls || [];
    const newBaseURLs = [];

    // First Base URL
    if (!prevBaseURLs.length) {
      sharedState.baseUrls.push({ uri, attributes, parentKey: parentTagInfo.tagKey });
    } else {
      for (const base of prevBaseURLs) {
        const resolved = resolveURL(uri, base.uri);

        // URI is absolute
        if (resolved === uri) {
          // add new absolute baseURL to preexisting list

          sharedState.baseUrls.push({ uri, attributes, parentKey: parentTagInfo.tagKey });

          break;
        } else {
          // URL is relative
          // concat to all other URLs
          if (parentTagInfo.tagKey !== base.parentKey) {
            // We only want to concat if they are not children of the same node
            newBaseURLs.push({
              uri: resolved,
              attributes: { ...base.attributes, ...attributes },
              parentKey: parentTagInfo.tagKey,
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
  private static readonly ID = 'id';
  private static readonly CODECS = 'codecs';
  private static readonly BANDWIDTH = 'bandwidth';
  private static readonly WIDTH = 'width';
  private static readonly HEIGHT = 'height';
  private static readonly FRAME_RATE = 'frameRate';
  private static readonly SAR = 'sar';
  private static readonly SCAN_TYPE = 'scanType';
  private static readonly PROFILES = 'profiles';
  private static readonly AUDIO_SAMPLING_RATE = 'audioSamplingRate';
  private static readonly MIME_TYPE = 'mimeType';
  private static readonly SEGMENT_PROFILES = 'segmentProfiles';
  private static readonly CONTAINER_PROFILES = 'containerProfiles';
  private static readonly MAXIMUM_SAP_PERIOD = 'maximumSAPPeriod';
  private static readonly START_WITH_SAP = 'startWithSAP';
  private static readonly MAX_PLAYOUT_RATE = 'maxPlayoutRate';
  private static readonly CODING_DEPENDENCY = 'codingDependency';
  private static readonly SELECTION_PRIORITY = 'selectionPriority';
  private static readonly TAG = 'tag';
  private static readonly INITIALIZATION = 'initialization';

  protected readonly tag = REPRESENTATION;
  // TODO
  protected readonly requiredAttributes = new Set<string>();

  protected safeProcess(
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
        id: attributes[Representation.ID] || 'default-id',
        codecs: attributes[Representation.CODECS],
        bandwidth: attributes[Representation.BANDWIDTH],
        initialization: attributes[Representation.INITIALIZATION],
        width: attributes[Representation.WIDTH],
        height: attributes[Representation.HEIGHT],
        frameRate: attributes[Representation.FRAME_RATE],
        sar: attributes[Representation.SAR],
        scanType: attributes[Representation.SCAN_TYPE],
        profiles: attributes[Representation.PROFILES],
        audioSamplingRate: attributes[Representation.AUDIO_SAMPLING_RATE],
        mimeType: attributes[Representation.MIME_TYPE],
        segmentProfiles: attributes[Representation.SEGMENT_PROFILES],
        containerProfiles: attributes[Representation.CONTAINER_PROFILES],
        maximumSAPPeriod: attributes[Representation.MAXIMUM_SAP_PERIOD],
        startWithSAP: attributes[Representation.START_WITH_SAP],
        maxPlayoutRate: attributes[Representation.MAX_PLAYOUT_RATE],
        codingDependency: attributes[Representation.CODING_DEPENDENCY],
        selectionPriority: attributes[Representation.SELECTION_PRIORITY],
        tag: attributes[Representation.TAG],
        segments,
        baseUrl: base.uri,
      };

      parsedManifest.representations.push(rep);
    }
  }
}

export class SegmentTemplate extends TagProcessor {
  private static readonly MEDIA = 'media';
  private static readonly INDEX = 'index';
  private static readonly INITIALIZATION = 'initialization';
  private static readonly BIT_STREAM_SWITCHING = 'bitstreamSwitching';
  private static readonly DURATION = 'duration';
  private static readonly TIME_SCALE = 'timescale';
  private static readonly START_NUMBER = 'startNumber';

  protected readonly tag = SEGMENT_TEMPLATE;
  // TODO
  protected readonly requiredAttributes = new Set<string>();

  protected safeProcess(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState
    // pendingProcessors: PendingProcessors
  ): void {
    const attributes = parseAttributes(tagInfo.tagAttributes);
    sharedState.segmentTemplateAttributes = {
      media: attributes[SegmentTemplate.MEDIA],
      index: attributes[SegmentTemplate.INDEX],
      initialization: attributes[SegmentTemplate.INITIALIZATION],
      bitstreamSwitching: attributes[SegmentTemplate.BIT_STREAM_SWITCHING],
      duration: attributes[SegmentTemplate.DURATION],
      timescale: attributes[SegmentTemplate.TIME_SCALE],
      startNumber: attributes[SegmentTemplate.START_NUMBER],
    };
  }
}

export class UTCTiming extends TagProcessor {
  private static readonly SCHEME_ID_URI = 'schemeIdUri';

  protected readonly requiredAttributes = new Set([UTCTiming.SCHEME_ID_URI]);
  protected readonly tag = UTC_TIMING;

  protected safeProcess(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest
    // sharedState: SharedState,
    // pendingProcessors: PendingProcessors
  ): void {
    const attributes = parseAttributes(tagInfo.tagAttributes);

    // Attributes other than SCHEME_ID_URI are added in the below function.
    const utcAttributes = parseUTCTimingScheme(attributes);
    parsedManifest.utcTimingScheme = utcAttributes as UTCTimingScheme;
  }
}

export class EventStream extends TagProcessor {
  // TODO
  protected readonly tag = EVENT_STREAM;
  // TODO
  protected readonly requiredAttributes = new Set<string>();

  protected safeProcess() // tagInfo: TagInfo,
  // parentTagInfo: TagInfo | null,
  // parsedManifest: ParsedManifest,
  // sharedState: SharedState,
  // pendingProcessors: PendingProcessors
  : void {}
}

export class Event extends TagProcessor {
  protected readonly tag = EVENT;
  // TODO
  protected readonly requiredAttributes = new Set<string>();

  protected safeProcess(
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
