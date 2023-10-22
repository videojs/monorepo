import type { Segment } from '../types/parsedManifest';

const identifierPattern = /\$([A-z]*)(?:(%0)([0-9]+)d)?\$/g;

/**
 * TODO: Implement correctly for BaseURL
 */
export const resolveURL = (relativeUrl: string, baseUrl: string): string => {
  try {
    return new URL(relativeUrl, baseUrl).href;
  } catch {
    return relativeUrl || '';
  }
};

/**
 * Returns a function to be used as a callback for String.prototype.replace to replace
 * template identifiers
 */
export const identifierReplacement =
  (values: Record<string, unknown>) =>
  (match: string, id: string, format: string, width: string | number): string => {
    if (match === '$$') {
      // escape sequence
      return '$';
    }

    if (typeof values[id] === 'undefined') {
      return match;
    }

    const value = '' + values[id];

    if (id === 'RepresentationID') {
      // Format tag shall not be present with RepresentationID
      return value;
    }

    if (!format) {
      width = 1;
    } else {
      width = parseInt(width as string, 10);
    }

    if (value.length >= width) {
      return value;
    }

    return `${new Array(width - value.length + 1).join('0')}${value}`;
  };

/**
 * Constructs a segment url from a template string
 */
export const constructTemplateUrl = (url: string, values: Record<string, unknown>): string => {
  return url.replace(identifierPattern, identifierReplacement(values));
};

/**
 * @returns A number for every segment.
 */
export const range = (start: number, end: number): Array<number> => {
  const result = [];

  for (let i = start; i < end; i++) {
    result.push(i);
  }

  return result;
};

// TODO: This should work, but worth testing in the future.
/**
 * parse the end number attribue that can be a string
 * number, or undefined.
 *
 * @param endNumber The end number attribute.
 * @return The result of parsing the end number.
 */
const parseEndNumber = (endNumber: number | string | null): number | null => {
  if (typeof endNumber === 'string') {
    endNumber = parseInt(endNumber, 10);
  }

  if (endNumber == null || isNaN(endNumber)) {
    return null;
  }

  return endNumber;
};

type SegmentRanges = Record<string, (attributes: Record<string, unknown>) => { start: number; end: number }>;

/**
 * Functions for calculating the range of available segments in static and dynamic
 * manifests.
 */
export const segmentRanges: SegmentRanges = {
  /**
   * Returns the entire range of available segments for a static MPD
   *
   * @param attributes Inheritied MPD attributes
   * @return The start and end numbers for available segments
   */
  static(attributes: Record<string, unknown>): { start: number; end: number } {
    const {
      duration,
      timescale,
      // TODO: Handle other attributes.
      // sourceDuration,
      // periodDuration
    } = attributes;
    const endNumber = parseEndNumber(attributes.endNumber as string | number | null);
    const segmentDuration: number = (duration as number) / (timescale as number);

    if (typeof endNumber === 'number') {
      return { start: 0, end: endNumber };
    }

    // if (typeof periodDuration === 'number') {
    //   return { start: 0, end: periodDuration / segmentDuration };
    // }

    return { start: 0, end: (duration as number) / segmentDuration };
  },

  // TODO: Ensure dynamic works
  /**
   * Returns the current live window range of available segments for a dynamic MPD
   *
   * @param attributes Inheritied MPD attributes
   * @return The start and end numbers for available segments
   */
  dynamic(): { start: number; end: number } {
    // const {
    //   NOW,
    //   clientOffset,
    //   availabilityStartTime,
    //   timescale = 1,
    //   duration,
    //   periodStart = 0,
    //   minimumUpdatePeriod = 0,
    //   timeShiftBufferDepth = Infinity
    // } = attributes;
    // const endNumber = parseEndNumber(attributes.endNumber as string | number | null);
    // // clientOffset is passed in at the top level of mpd-parser and is an offset calculated
    // // after retrieving UTC server time.
    // const now = (NOW + clientOffset) / 1000;
    // // WC stands for Wall Clock.
    // // Convert the period start time to EPOCH.
    // const periodStartWC = availabilityStartTime + periodStart;
    // // Period end in EPOCH is manifest's retrieval time + time until next update.
    // const periodEndWC = now + minimumUpdatePeriod;
    // const periodDuration = periodEndWC - periodStartWC;
    // const segmentCount = Math.ceil(periodDuration * timescale / duration);
    // const availableStart =
    //   Math.floor((now - periodStartWC - timeShiftBufferDepth) * timescale / duration);
    // const availableEnd = Math.floor((now - periodStartWC) * timescale / duration);

    // return {
    //   start: Math.max(0, availableStart),
    //   end: typeof endNumber === 'number' ? endNumber : Math.min(segmentCount, availableEnd)
    // };

    return { start: 0, end: 0 };
  },
};

/**
 * For mapping, pulls necessary data and formats for segments.
 */
export const toSegments =
  (attributes: Record<string, unknown>) =>
  (segmentNumber: number): Record<string, unknown> => {
    const { duration, timescale = 1, start = 0, startNumber = 1 } = attributes;

    const segment = {
      segmentNumber: (startNumber as number) + segmentNumber,
      duration: ((duration as number) / (timescale as number)) as number,
      timeline: start as number,
      time: segmentNumber * (duration as number),
    };

    return segment;
  };

/**
 * Returns a list of objects containing segment timing and duration info used for
 * building the list of segments. This uses the @duration attribute specified
 * in the MPD manifest to derive the range of segments.
 *
 * @param attributes Inherited MPD attributes
 * @return List of Objects with segment timing and duration info
 */
export const parseByDuration = (
  mpdType: string,
  attributes: Record<string, unknown>
): Array<Record<string, unknown>> => {
  const {
    duration,
    timescale = 1,
    // TODO: handle other attributes
    // periodDuration,
    // sourceDuration
  } = attributes;

  const { start, end } = segmentRanges[mpdType](attributes);

  const segments = range(start, end).map(toSegments(attributes));

  if (mpdType === 'static') {
    const index = segments.length - 1;
    // section is either a period or the full source
    // const sectionDuration =
    //   typeof periodDuration === 'number' ? periodDuration : sourceDuration;

    // // final segment may be less than full segment duration
    segments[index].duration =
      (duration as number) - (((duration as number) / (timescale as number)) as number) * index;
  }

  return segments;
};

/**
 * Generates a list of objects containing timing and duration information about each
 * segment needed to generate segment uris and the complete segment object
 *
 * @param attributes
 * @returns segments
 */
export const parseTemplateInfo = (
  mpdType: string,
  attributes: Record<string, unknown>
): Array<Record<string, unknown>> => {
  // TODO: Handle SegmentTimeline and other Segment nodes
  // if (!attributes.duration && !segmentTimeline)
  if (!attributes.duration) {
    // if neither @duration or SegmentTimeline are present, then there shall be exactly
    // one media segment
    const segments = [
      {
        segmentNumber: attributes.startNumber || 1,
        duration: attributes.duration,
        time: 0,
        timeline: attributes.start,
      },
    ];
    return segments;
  }

  if (attributes.duration) {
    return parseByDuration(mpdType, attributes);
  }

  // return parseByTimeline(attributes, segmentTimeline);
  return [];
};

/**
 * Generates a list of segments using information provided by the SegmentTemplate element
 *
 * @param mpdType 'static' or 'dynamic'
 * @param attributes Object containing all inherited attributes
 *        from parent elements with attribute names as keys
 * @return List of segment objects
 */
export const segmentsFromTemplate = (mpdType: string, attributes: Record<string, unknown>): Array<Segment> => {
  const templateValues: Record<string, unknown> = {
    RepresentationID: attributes.id,
    Bandwidth: attributes.bandwidth || 0,
  };

  const segments = parseTemplateInfo(mpdType, attributes);

  const finalSegments = segments.map((segment) => {
    templateValues.Number = segment.segmentNumber;
    templateValues.Time = segment.time;

    const uri = constructTemplateUrl((attributes.media as string) || '', templateValues);
    // See DASH spec section 5.3.9.2.2
    // - if timescale isn't present on any level, default to 1.
    const timescale = (attributes.timescale as number) || 1;

    // - if presentationTimeOffset isn't present on any level, default to 0
    const presentationTimeOffset: number = (attributes.presentationTimeOffset as number) || 0;
    const periodStart = (attributes.start as number) || 0;
    const presentationTime =
      //   // Even if the @t attribute is not specified for the segment, segment.time is
      //   // calculated in mpd-parser prior to this, so it's assumed to be available.
      periodStart + ((segment.time as number) - presentationTimeOffset) / timescale;

    const seg: Segment = {
      duration: segment.duration as number,
      segmentNumber: segment.segmentNumber as number,
      uri,
      resolvedUri: uri,
      presentationTime,
      timeline: segment.timeline as number,
    };

    return seg;
  });

  return finalSegments;
};
