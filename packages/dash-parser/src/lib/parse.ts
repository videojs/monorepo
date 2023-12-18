import type {
  DebugCallback,
  WarnCallback,
  ParserOptions,
  CustomTagMap,
  TransformTagAttributes,
  TransformTagValue,
} from './types/parserOptions';
import type { ParsedManifest } from './types/parsedManifest';
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
import type { TagInfo, StateMachineTransition } from './stateMachine';
import { ignoreTagWarn, unsupportedTagWarn } from './utils/warn';
import createStateMachine from './stateMachine';
import { PendingProcessors } from './pendingProcessors';
import type { SharedState } from './types/sharedState';
import { createDefaultParsedManifest } from './consts/defaults';

class Parser {
  private readonly warnCallback: WarnCallback;
  private readonly debugCallback: DebugCallback;
  private readonly customTagMap: CustomTagMap;
  private readonly ignoreTags: Set<string>;
  private readonly transformTagValue: TransformTagValue;
  private readonly transformTagAttributes: TransformTagAttributes;
  private readonly tagProcessorMap: Record<string, TagProcessor>;

  protected parsedManifest: ParsedManifest;
  protected readonly sharedState: SharedState;
  protected readonly pendingProcessors: PendingProcessors;

  public constructor(options: ParserOptions) {
    this.warnCallback = options.warnCallback || ((): void => {});
    this.debugCallback = options.debugCallback || ((): void => {});
    this.customTagMap = options.customTagMap || {};
    this.ignoreTags = options.ignoreTags || new Set();
    this.transformTagValue = options.transformTagValue || ((tagKey, tagValue): string | null => tagValue);
    this.transformTagAttributes =
      options.transformTagAttributes || ((tagKey, tagAttributes): Record<string, string> => tagAttributes);

    this.parsedManifest = createDefaultParsedManifest();

    this.sharedState = {
      baseUrls: [],
      mpdAttributes: {},
      adaptationSetAttributes: {},
    };

    // If the manifest URI is inteded to be used as the initial baseURL, set it here
    if (options.uri) {
      this.sharedState.baseUrls.push({
        uri: options.uri,
        attributes: {},
      });
    }

    this.pendingProcessors = new PendingProcessors();

    this.tagProcessorMap = {
      [MPD]: new Mpd(this.warnCallback),
      [PERIOD]: new Period(this.warnCallback),
      [ADAPTATION_SET]: new AdaptationSet(this.warnCallback),
      [REPRESENTATION]: new Representation(this.warnCallback),
      [UTC_TIMING]: new UTCTiming(this.warnCallback),
      [SEGMENT_TEMPLATE]: new SegmentTemplate(this.warnCallback),
      [BASE_URL]: new BaseUrl(this.warnCallback),
    };
  }

  protected readonly tagInfoCallback = (tagInfo: TagInfo, parentTagInfo: TagInfo | null): void => {
    this.debugCallback(`Received tag info from scanner: `, tagInfo, parentTagInfo);

    if (this.ignoreTags.has(tagInfo.tagKey)) {
      return this.warnCallback(ignoreTagWarn(tagInfo.tagKey));
    }

    if (tagInfo.tagKey in this.tagProcessorMap) {
      tagInfo.tagValue = this.transformTagValue(tagInfo.tagKey, tagInfo.tagValue);
      tagInfo.tagAttributes = this.transformTagAttributes(tagInfo.tagKey, tagInfo.tagAttributes);

      const tagProcessor = this.tagProcessorMap[tagInfo.tagKey];
      return tagProcessor.process(
        tagInfo,
        parentTagInfo,
        this.parsedManifest,
        this.sharedState,
        this.pendingProcessors
      );
    }

    if (tagInfo.tagKey in this.customTagMap) {
      const customTagProcessor = this.customTagMap[tagInfo.tagKey];

      return customTagProcessor(tagInfo, parentTagInfo, this.parsedManifest.custom);
    }

    this.warnCallback(unsupportedTagWarn(tagInfo.tagKey));
  };

  protected clean(): ParsedManifest {
    const copy = { ...this.parsedManifest };
    this.parsedManifest = createDefaultParsedManifest();

    return copy;
  }
}

export class FullManifestParser extends Parser {
  public static create(options: ParserOptions): FullManifestParser {
    return new FullManifestParser(options);
  }

  public parseFullManifestString(manifest: string): ParsedManifest {
    const stateMachine = createStateMachine(this.tagInfoCallback);
    const length = manifest.length;

    for (let i = 0; i < length; i++) {
      stateMachine(manifest[i]);
    }

    return this.clean();
  }

  public parseFullManifestBuffer(manifest: Uint8Array): ParsedManifest {
    const stateMachine = createStateMachine(this.tagInfoCallback);
    const length = manifest.length;

    for (let i = 0; i < length; i++) {
      stateMachine(String.fromCharCode(manifest[i]));
    }

    return this.clean();
  }
}

export class ProgressiveParser extends Parser {
  public static create(options: ParserOptions): ProgressiveParser {
    return new ProgressiveParser(options);
  }

  private stateMachine: StateMachineTransition | null = null;

  public pushString(chunk: string): void {
    if (this.stateMachine === null) {
      this.stateMachine = createStateMachine(this.tagInfoCallback);
    }

    for (let i = 0; i < chunk.length; i++) {
      this.stateMachine(chunk[i]);
    }
  }

  public pushBuffer(chunk: Uint8Array): void {
    if (this.stateMachine === null) {
      this.stateMachine = createStateMachine(this.tagInfoCallback);
    }

    for (let i = 0; i < chunk.length; i++) {
      this.stateMachine(String.fromCharCode(chunk[i]));
    }
  }

  public done(): ParsedManifest {
    this.stateMachine = null;

    return this.clean();
  }
}
