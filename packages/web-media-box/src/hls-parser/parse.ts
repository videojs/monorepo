import scanner from './scanner.ts';
import { noop } from './utils/fn.ts';
import { ignoreTagWarn, missingTagValueWarn, unsupportedTagWarn } from './utils/warn.ts';

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
  EXT_X_KEY
} from './consts/tags.ts';
import type { ParserOptions } from './types/parserOptions';
import type { Segment, ParsedPlaylist } from './types/parsedPlaylist';
import { EmptyTagProcessor, ExtXEndList, ExtXIframesOnly, ExtXIndependentSegments, ExtXDiscontinuity } from './tags/emptyTagProcessors.ts';
import {
  ExtXByteRange,
  ExtInf,
  ExtXDiscontinuitySequence,
  ExtXMediaSequence,
  ExtXPlaylistType,
  ExtXTargetDuration,
  ExtXVersion,
  TagWithValueProcessor,
} from './tags/tagWithValueProcessors.ts';
import {
  ExtXPartInf,
  ExtXServerControl,
  ExtXStart,
  TagWithAttributesProcessor,
  ExtXKey
} from './tags/tagWithAttributesProcessors.ts';

const defaultSegment: Segment = {
  duration: 0,
  isDiscontinuity: false,
  uri: '',
};

export default function parse(playlist: string, options: ParserOptions = {}): ParsedPlaylist {
  const warnCallback = options.warnCallback || noop;
  const debugCallback = options.debugCallback || noop;
  const customTagMap = options.customTagMap || {};
  const ignoreTags = options.ignoreTags || new Set();
  const transformTagValue = options.transformTagValue || ((tagKey, tagValue) => tagValue);
  const transformTagAttributes = options.transformTagAttributes || ((tagKey, tagAttributes) => tagAttributes);

  const parsedPlaylist: ParsedPlaylist = {
    m3u: false,
    independentSegments: false,
    endList: false,
    iFramesOnly: false,
    segments: [],
    custom: {},
  };

  let currentSegment: Segment = { ...defaultSegment };

  const emptyTagMap: Record<string, EmptyTagProcessor> = {
    [EXT_X_INDEPENDENT_SEGMENTS]: new ExtXIndependentSegments(warnCallback),
    [EXT_X_ENDLIST]: new ExtXEndList(warnCallback),
    [EXT_X_I_FRAMES_ONLY]: new ExtXIframesOnly(warnCallback),
    [EXT_X_DISCONTINUITY]: new ExtXDiscontinuity(warnCallback)
  };

  const tagValueMap: Record<string, TagWithValueProcessor> = {
    [EXT_X_VERSION]: new ExtXVersion(warnCallback),
    [EXT_X_TARGETDURATION]: new ExtXTargetDuration(warnCallback),
    [EXT_X_MEDIA_SEQUENCE]: new ExtXMediaSequence(warnCallback),
    [EXT_X_DISCONTINUITY_SEQUENCE]: new ExtXDiscontinuitySequence(warnCallback),
    [EXT_X_PLAYLIST_TYPE]: new ExtXPlaylistType(warnCallback),
    [EXTINF]: new ExtInf(warnCallback),
    [EXT_X_BYTERANGE]: new ExtXByteRange(warnCallback),
  };

  const tagAttributesMap: Record<string, TagWithAttributesProcessor> = {
    [EXT_X_START]: new ExtXStart(warnCallback),
    [EXT_X_PART_INF]: new ExtXPartInf(warnCallback),
    [EXT_X_SERVER_CONTROL]: new ExtXServerControl(warnCallback),
    [EXT_X_KEY]: new ExtXKey(warnCallback)
  };

  function tagInfoCallback(tagKey: string, tagValue: string | null, tagAttributes: Record<string, string>): void {
    debugCallback(`Received tag info from scanner: `, { tagKey, tagValue, tagAttributes });

    if (ignoreTags.has(tagKey)) {
      return warnCallback(ignoreTagWarn(tagKey));
    }

    //1. Process simple tags without values or attributes:
    if (tagKey in emptyTagMap) {
      const emptyTagProcessor = emptyTagMap[tagKey];
      return emptyTagProcessor.process(parsedPlaylist, currentSegment);
    }

    //2. Process tags with values:
    if (tagKey in tagValueMap) {
      tagValue = transformTagValue(tagKey, tagValue);

      if (tagValue === null) {
        return warnCallback(missingTagValueWarn(tagKey));
      }

      const tagWithValueProcessor = tagValueMap[tagKey];
      return tagWithValueProcessor.process(tagValue, parsedPlaylist, currentSegment);
    }

    //3. Process tags with attributes:
    if (tagKey in tagAttributesMap) {
      tagAttributes = transformTagAttributes(tagKey, tagAttributes);
      const tagWithAttributesProcessor = tagAttributesMap[tagKey];

      return tagWithAttributesProcessor.process(tagAttributes, parsedPlaylist);
    }

    //4. Process custom tags:
    if (tagKey in customTagMap) {
      const customTagProcessor = customTagMap[tagKey];

      return customTagProcessor(tagKey, tagValue, tagAttributes, parsedPlaylist.custom);
    }

    // 5. Unable to process received tag:
    warnCallback(unsupportedTagWarn(tagKey));
  }

  function uriInfoCallback(uri: string): void {
    currentSegment.uri = uri;
    parsedPlaylist.segments.push(currentSegment);
    currentSegment = { ...defaultSegment };
  }

  scanner(playlist, tagInfoCallback, uriInfoCallback);

  return parsedPlaylist;
}
