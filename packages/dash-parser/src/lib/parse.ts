import type {
  DebugCallback,
  WarnCallback,
  ParserOptions,
  CustomTagMap,
  TransformTagAttributes,
  TransformTagValue,
} from './types/parser-options';
import type { ParsedManifest } from './types/parsed-manifest';
import type { TagProcessor } from './tags/base';
import {
  ADAPTATION_SET,
  MPD,
  PERIOD,
  REPRESENTATION,
  UTC_TIMING,
  SEGMENT_TEMPLATE,
  // EVENT_STREAM,
  // EVENT,
  BASE_URL,
} from './consts/tags';
import { AdaptationSet, Mpd, Period, Representation, UTCTiming, SegmentTemplate, BaseUrl } from './tags/base';
import type { TagInfo, StateMachineTransition } from './state-machine';
import { ignoreTagWarn, unsupportedTagWarn } from './utils/warn';
import createStateMachine from './state-machine';
import { PendingProcessors } from './pending-processors';
import type { SharedState } from './types/shared-state';
import { createDefaultParsedManifest } from './consts/defaults';

class Parser {
  private readonly warnCallback_: WarnCallback;
  private readonly debugCallback_: DebugCallback;
  private readonly customTagMap_: CustomTagMap;
  private readonly ignoreTags_: Set<string>;
  private readonly transformTagValue_: TransformTagValue;
  private readonly transformTagAttributes_: TransformTagAttributes;
  private readonly tagProcessorMap_: Record<string, TagProcessor>;

  protected parsedManifest_: ParsedManifest;
  protected readonly sharedState_: SharedState;
  protected readonly pendingProcessors_: PendingProcessors;

  public constructor(options: ParserOptions) {
    this.warnCallback_ = options.warnCallback || ((): void => {});
    this.debugCallback_ = options.debugCallback || ((): void => {});
    this.customTagMap_ = options.customTagMap || {};
    this.ignoreTags_ = options.ignoreTags || new Set();
    this.transformTagValue_ = options.transformTagValue || ((tagKey, tagValue): string | null => tagValue);
    this.transformTagAttributes_ =
      options.transformTagAttributes || ((tagKey, tagAttributes): Record<string, string> => tagAttributes);

    this.parsedManifest_ = createDefaultParsedManifest();

    this.sharedState_ = {
      baseUrls: [],
      mpdAttributes: {},
      adaptationSetAttributes: {},
    };

    // If the manifest URI is inteded to be used as the initial baseURL, set it here
    if (options.uri) {
      this.sharedState_.baseUrls.push({
        uri: options.uri,
        attributes: {},
      });
    }

    this.pendingProcessors_ = new PendingProcessors();

    this.tagProcessorMap_ = {
      [MPD]: new Mpd(this.warnCallback_),
      [PERIOD]: new Period(this.warnCallback_),
      [ADAPTATION_SET]: new AdaptationSet(this.warnCallback_),
      [REPRESENTATION]: new Representation(this.warnCallback_),
      [UTC_TIMING]: new UTCTiming(this.warnCallback_),
      [SEGMENT_TEMPLATE]: new SegmentTemplate(this.warnCallback_),
      [BASE_URL]: new BaseUrl(this.warnCallback_),
    };
  }

  protected readonly tagInfoCallback_ = (tagInfo: TagInfo, parentTagInfo: TagInfo | null): void => {
    this.debugCallback_(`Received tag info from scanner: `, tagInfo, parentTagInfo);

    if (this.ignoreTags_.has(tagInfo.tagKey)) {
      return this.warnCallback_(ignoreTagWarn(tagInfo.tagKey));
    }

    if (tagInfo.tagKey in this.tagProcessorMap_) {
      tagInfo.tagValue = this.transformTagValue_(tagInfo.tagKey, tagInfo.tagValue);
      tagInfo.tagAttributes = this.transformTagAttributes_(tagInfo.tagKey, tagInfo.tagAttributes);

      const tagProcessor = this.tagProcessorMap_[tagInfo.tagKey];
      return tagProcessor.process(
        tagInfo,
        parentTagInfo,
        this.parsedManifest_,
        this.sharedState_,
        this.pendingProcessors_
      );
    }

    if (tagInfo.tagKey in this.customTagMap_) {
      const customTagProcessor = this.customTagMap_[tagInfo.tagKey];

      return customTagProcessor(tagInfo, parentTagInfo, this.parsedManifest_.custom);
    }

    this.warnCallback_(unsupportedTagWarn(tagInfo.tagKey));
  };

  protected clean_(): ParsedManifest {
    const copy = { ...this.parsedManifest_ };
    this.parsedManifest_ = createDefaultParsedManifest();

    return copy;
  }
}

export class FullManifestParser extends Parser {
  public static create(options: ParserOptions): FullManifestParser {
    return new FullManifestParser(options);
  }

  public parseFullManifestString(manifest: string): ParsedManifest {
    const stateMachine = createStateMachine(this.tagInfoCallback_);
    const length = manifest.length;

    for (let i = 0; i < length; i++) {
      stateMachine(manifest[i]);
    }

    return this.clean_();
  }

  public parseFullManifestBuffer(manifest: Uint8Array): ParsedManifest {
    const stateMachine = createStateMachine(this.tagInfoCallback_);
    const length = manifest.length;

    for (let i = 0; i < length; i++) {
      stateMachine(String.fromCharCode(manifest[i]));
    }

    return this.clean_();
  }
}

export class ProgressiveParser extends Parser {
  public static create(options: ParserOptions): ProgressiveParser {
    return new ProgressiveParser(options);
  }

  private stateMachine_: StateMachineTransition | null = null;

  public pushString(chunk: string): void {
    if (this.stateMachine_ === null) {
      this.stateMachine_ = createStateMachine(this.tagInfoCallback_);
    }

    for (let i = 0; i < chunk.length; i++) {
      this.stateMachine_(chunk[i]);
    }
  }

  public pushBuffer(chunk: Uint8Array): void {
    if (this.stateMachine_ === null) {
      this.stateMachine_ = createStateMachine(this.tagInfoCallback_);
    }

    for (let i = 0; i < chunk.length; i++) {
      this.stateMachine_(String.fromCharCode(chunk[i]));
    }
  }

  public done(): ParsedManifest {
    this.stateMachine_ = null;

    return this.clean_();
  }
}
