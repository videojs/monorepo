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
  EVENT }
from '@/dash-parser/consts/tags.ts';
import type { ManifestType, ParsedManifest } from '@/dash-parser/types/parsedManifest';
import type { SharedState } from '@/dash-parser/types/sharedState';
import type { PendingProcessors } from '@/dash-parser/pendingProcessors.ts';
import type { EventScheme, ParsedManifest, UTCTimingScheme } from '../types/parsedManifest';
import { missingRequiredAttributeWarn } from '@/dash-parser/utils/warn.ts';
import { parseAttributes } from '@/dash-parser/parseAttributes';
import { parseUTCTimingScheme } from '@/dash-parser/utils/parseUTCTimingScheme';

export abstract class TagProcessor {
  protected readonly warnCallback: WarnCallback;
  protected abstract readonly tag: string;
  protected abstract readonly requiredAttributes: Set<string>;

  public process(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState,
    pendingProcessors: PendingProcessors): void {
    let isRequiredAttributedMissed = false;

    this.requiredAttributes && this.requiredAttributes.forEach((requiredAttribute) => {
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

  public processPending(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    requiredChildren: Map<string, TagInfo | null>
  ): void {
    // specific processor will override
  }

  protected abstract safeProcess(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState,
    pendingProcessors: PendingProcessors): void;

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
    sharedState: SharedState,
    pendingProcessors: PendingProcessors
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

  safeProcess(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState,
    pendingProcessors: PendingProcessors
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

  safeProcess(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState,
    pendingProcessors: PendingProcessors
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
  // TODO
  protected readonly tag = BASE_URL;

  safeProcess(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState,
    pendingProcessors: PendingProcessors
  ): void {}
}

export class Representation extends TagProcessor {
  // TODO
  protected readonly tag = REPRESENTATION;

  safeProcess(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState,
    pendingProcessors: PendingProcessors
  ): void {}
}

export class UTCTiming extends TagProcessor {
  private static readonly SCHEME_ID_URI = 'schemeIdUri';

  protected readonly requiredAttributes = new Set([UTCTiming.SCHEME_ID_URI]);
  protected readonly tag = UTC_TIMING;

  safeProcess(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState,
    pendingProcessors: PendingProcessors
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

  safeProcess(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState,
    pendingProcessors: PendingProcessors
  ): void {
    
  }
}

export class Event extends TagProcessor {
  protected readonly tag = EVENT;

  safeProcess(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState,
    pendingProcessors: PendingProcessors
  ): void {
    const attributes = parseAttributes(tagInfo.tagAttributes);

    if (!parsedManifest.events) {
      parsedManifest.events = [];
    }

    // TODO: use data from state to finish this.

    // const presentationTime = attributes.presentationTime || 0;
    const presentationTime = 0;
    // const timescale = eventStreamAttributes.timescale || 1;
    const timescale = 1;
    const duration = attributes.duration as number || 0;
    // const start = (presentationTime / timescale) + period.attributes.start;
    const start = 0;

    const event = {
      schemeIdUri: attributes.schemeIdUri,
      // value: eventStreamAttributes.value,
      id: attributes.id,
      start,
      end: start + (duration / timescale),
      // messageData: getContent(event) || eventAttributes.messageData,
      messageData: attributes.messageData
      // contentEncoding: eventStreamAttributes.contentEncoding,
      // presentationTimeOffset: eventStreamAttributes.presentationTimeOffset || 0
    };

    parsedManifest.events.push(event as EventScheme);
  }
}


