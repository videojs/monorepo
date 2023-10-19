import type { WarnCallback } from '@/dash-parser/types/parserOptions';
import type { TagInfo } from '@/dash-parser/stateMachine.ts';
import { ADAPTATION_SET, BASE_URL, MPD, PERIOD, REPRESENTATION } from '@/dash-parser/consts/tags.ts';
import type { ManifestType, ParsedManifest } from '@/dash-parser/types/parsedManifest';
import type { SharedState } from '@/dash-parser/types/sharedState';
import type { PendingProcessors } from '@/dash-parser/pendingProcessors.ts';

export abstract class TagProcessor {
  protected readonly warnCallback: WarnCallback;
  protected abstract readonly tag: string;

  public constructor(warnCallback: WarnCallback) {
    this.warnCallback = warnCallback;
  }

  public abstract process(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState,
    pendingProcessors: PendingProcessors
  ): void;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public processPending(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    requiredChildren: Map<string, TagInfo | null>
  ): void {
    // specific processor will override
  }
}

export class Mpd extends TagProcessor {
  private static readonly ID = 'id';
  private static readonly TYPE = 'type';
  private static readonly AVAILABILITY_START_TIME = 'availabilityStartTime';
  private static readonly AVAILABILITY_END_TIME = 'availabilityEndTime';

  protected readonly tag = MPD;

  process(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState,
    pendingProcessors: PendingProcessors
  ): void {
    const id = tagInfo.tagAttributes[Mpd.ID];
    const type = (tagInfo.tagAttributes[Mpd.TYPE] || 'static') as ManifestType;
    const availabilityStartTime = tagInfo.tagAttributes[Mpd.AVAILABILITY_START_TIME];
    const availabilityEndTime = tagInfo.tagAttributes[Mpd.AVAILABILITY_END_TIME];

    parsedManifest.type = type as ManifestType;

    if (id) {
      parsedManifest.id = Number(id);
    }

    if (availabilityStartTime) {
      parsedManifest.availabilityStartTime = Date.parse(availabilityStartTime);
    }

    if (availabilityEndTime) {
      parsedManifest.availabilityEndTime = Date.parse(availabilityEndTime);
    }

    //TODO: continue
  }
}

export class Period extends TagProcessor {
  protected readonly tag = PERIOD;

  process(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState,
    pendingProcessors: PendingProcessors
  ): void {}
}

export class AdaptationSet extends TagProcessor {
  protected readonly tag = ADAPTATION_SET;

  process(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState,
    pendingProcessors: PendingProcessors
  ): void {}
}

export class BaseUrl extends TagProcessor {
  protected readonly tag = BASE_URL;

  process(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState,
    pendingProcessors: PendingProcessors
  ): void {}
}

export class Representation extends TagProcessor {
  protected readonly tag = REPRESENTATION;

  process(
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    parsedManifest: ParsedManifest,
    sharedState: SharedState,
    pendingProcessors: PendingProcessors
  ): void {}
}
