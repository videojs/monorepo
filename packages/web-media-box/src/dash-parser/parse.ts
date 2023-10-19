import type {
  DebugCallback,
  WarnCallback,
  ParserOptions,
  CustomTagMap,
  TransformTagAttributes,
  TransformTagValue,
} from '@/dash-parser/types/parserOptions';
import { noop } from '../utils/fn.ts';
import { ParsedManifest } from '@/dash-parser/types/parsedManifest';
import type { TagProcessor } from '@/dash-parser/tags/base.ts';
import { ADAPTATION_SET, MPD, PERIOD, REPRESENTATION } from '@/dash-parser/consts/tags.ts';
import { AdaptationSet, Mpd, Period, Representation } from '@/dash-parser/tags/base.ts';
import { TagInfo } from '@/dash-parser/stateMachine.ts';
import { ignoreTagWarn, unsupportedTagWarn } from '@/dash-parser/utils/warn.ts';
import createStateMachine from '@/dash-parser/stateMachine.ts';
import { StateMachineTransition } from '@/dash-parser/stateMachine.ts';
import { PendingProcessors } from '@/dash-parser/pendingProcessors.ts';
import type { SharedState } from '@/dash-parser/types/sharedState';

class Parser {
  private readonly warnCallback: WarnCallback;
  private readonly debugCallback: DebugCallback;
  private readonly customTagMap: CustomTagMap;
  private readonly ignoreTags: Set<string>;
  private readonly transformTagValue: TransformTagValue;
  private readonly transformTagAttributes: TransformTagAttributes;
  private readonly tagProcessorMap: Record<string, TagProcessor>;

  protected readonly parsedManifest: ParsedManifest;
  protected readonly sharedState: SharedState;
  protected readonly pendingProcessors: PendingProcessors;

  public constructor(options: ParserOptions) {
    this.warnCallback = options.warnCallback || noop;
    this.debugCallback = options.debugCallback || noop;
    this.customTagMap = options.customTagMap || {};
    this.ignoreTags = options.ignoreTags || new Set();
    this.transformTagValue = options.transformTagValue || ((tagKey, tagValue): string | null => tagValue);
    this.transformTagAttributes =
      options.transformTagAttributes || ((tagKey, tagAttributes): Record<string, string> => tagAttributes);

    this.parsedManifest = {
      segments: [],
      custom: {},
    };

    this.sharedState = {};

    this.pendingProcessors = new PendingProcessors();

    this.tagProcessorMap = {
      [MPD]: new Mpd(this.warnCallback),
      [PERIOD]: new Period(this.warnCallback),
      [ADAPTATION_SET]: new AdaptationSet(this.warnCallback),
      [REPRESENTATION]: new Representation(this.warnCallback),
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
}

export class FullManifestParser extends Parser {
  public parseFullPlaylist(playlist: string): ParsedManifest {
    const stateMachine = createStateMachine(this.tagInfoCallback);
    const length = playlist.length;

    for (let i = 0; i < length; i++) {
      stateMachine(playlist[i]);
    }

    return this.parsedManifest;
  }
}

export class ProgressiveParser extends Parser {
  private stateMachine: StateMachineTransition | null = null;

  public push(chunk: Uint8Array): void {
    if (this.stateMachine === null) {
      this.stateMachine = createStateMachine(this.tagInfoCallback);
    }

    for (let i = 0; i < chunk.length; i++) {
      this.stateMachine(String.fromCharCode(chunk[i]));
    }
  }

  public done(): ParsedManifest {
    this.stateMachine = null;

    return this.parsedManifest;
  }
}
