import { parseDivisionValue } from './utils/string';
import { parseDuration, parseDate } from './utils/time';

type Parsers = Record<string, (value: string) => string | number>;

// TODO: break out any parsers that are only used on a single tag, and move that to that
// specific processor in tags/base.js

const parsers: Parsers = {
  /**
   * Specifies the duration of the entire Media Presentation. Format is a duration string
   * as specified in ISO 8601
   * @param value value of attribute as a string
   * @returns The duration in seconds
   */
  mediaPresentationDuration(value: string): number {
    return parseDuration(value);
  },

  /**
   * Specifies the Segment availability start time for all Segments referred to in this
   * MPD. For a dynamic manifest, it specifies the anchor for the earliest availability
   * time. Format is a date string as specified in ISO 8601
   * @param value value of attribute as a string
   * @returns The date as seconds from unix epoch
   */
  availabilityStartTime(value: string): number {
    return parseDate(value) / 1000;
  },

  /**
   * Specifies the smallest period between potential changes to the MPD. Format is a
   * duration string as specified in ISO 8601
   * @param value value of attribute as a string
   * @returns The duration in seconds
   */
  minimumUpdatePeriod(value: string): number {
    return parseDuration(value);
  },

  /**
   * Specifies the suggested presentation delay. Format is a
   * duration string as specified in ISO 8601
   * @param value value of attribute as a string
   * @returns The duration in seconds
   */
  suggestedPresentationDelay(value: string): number {
    return parseDuration(value);
  },

  /**
   * specifies the type of mpd. Can be either "static" or "dynamic"
   * @param value value of attribute as a string
   * @returns The type as a string
   */
  type(value: string): string {
    return value;
  },

  /**
   * Specifies the duration of the smallest time shifting buffer for any Representation
   * in the MPD. Format is a duration string as specified in ISO 8601
   * @param value value of attribute as a string
   * @returns The duration in seconds
   */
  timeShiftBufferDepth(value: string): number {
    return parseDuration(value);
  },

  /**
   * Specifies the PeriodStart time of the Period relative to the availabilityStarttime.
   * Format is a duration string as specified in ISO 8601
   * @param value value of attribute as a string
   * @returns The duration in seconds
   */
  start(value: string): number {
    return parseDuration(value);
  },

  /**
   * Specifies the width of the visual presentation
   * @param value value of attribute as a string
   * @returns The parsed width
   */
  width(value: string): number {
    return parseInt(value, 10);
  },

  /**
   * Specifies the height of the visual presentation
   * @param value value of attribute as a string
   * @returns The parsed height
   */
  height(value: string): number {
    return parseInt(value, 10);
  },

  /**
   * Specifies the bitrate of the representation
   * @param value value of attribute as a string
   * @returns The parsed bandwidth
   */
  bandwidth(value: string): number {
    return parseInt(value, 10);
  },

  /**
   * Specifies the frame rate of the representation
   * @param value value of attribute as a string
   * @returns The parsed frame rate
   */
  frameRate(value: string): number {
    return parseDivisionValue(value);
  },

  /**
   * Specifies the number of the first Media Segment in this Representation in the Period
   * @param value value of attribute as a string
   * @returns The parsed number
   */
  startNumber(value: string): number {
    return parseInt(value, 10);
  },

  /**
   * Specifies the timescale in units per seconds
   * @param value of attribute as a string
   * @returns The parsed timescale
   */
  timescale(value: string): number {
    return parseInt(value, 10);
  },

  /**
   * Specifies the presentationTimeOffset.
   * @param value value of the attribute as a string
   * @returns The parsed presentationTimeOffset
   */
  presentationTimeOffset(value: string): number {
    return parseInt(value, 10);
  },

  /**
   * Specifies the constant approximate Segment duration
   * NOTE: The <Period> element also contains an @duration attribute. This duration
   * specifies the duration of the Period. This attribute is currently not
   * supported by the rest of the parser, however we still check for it to prevent
   * errors.
   * @param value value of attribute as a string
   * @returns The parsed duration
   */
  duration(value: string): number {
    const parsedValue = parseInt(value, 10);

    if (isNaN(parsedValue)) {
      return parseDuration(value);
    }

    return parsedValue;
  },

  /**
   * Specifies the Segment duration, in units of the value of the @timescale.
   * @param value value of attribute as a string
   * @returns The parsed duration
   */
  d(value: string): number {
    return parseInt(value, 10);
  },

  /**
   * Specifies the MPD start time, in @timescale units, the first Segment in the series
   * starts relative to the beginning of the Period
   * @param value value of attribute as a string
   * @returns The parsed time
   */
  t(value: string): number {
    return parseInt(value, 10);
  },

  /**
   * Specifies the repeat count of the number of following contiguous Segments with the
   * same duration expressed by the value of @d
   * @param value value of attribute as a string
   * @returns The parsed number
   */
  r(value: string): number {
    return parseInt(value, 10);
  },

  /**
   * Specifies the presentationTime.
   * @param value value of the attribute as a string
   * @returns The parsed presentationTime
   */
  presentationTime(value: string): number {
    return parseInt(value, 10);
  },

  /**
   * Default parser for all other attributes. Acts as a no-op and just returns the value
   * as a string
   * @param value value of attribute as a string
   * @returns Unparsed value
   */
  DEFAULT(value: string): string {
    return value;
  },
};

/**
 * Gets all the attributes and values of the provided node, parses attributes with known
 * types, and returns an object with attribute names mapped to values.
 * @param attributes The key/value pairs of attributes to parse
 * @returns Object with all attributes parsed
 */
export const parseAttributes = (attributes: Record<string, unknown>): Record<string, unknown> => {
  type Attrs = Record<string, unknown>;

  const newAttributes: Attrs = {};

  for (const att in attributes) {
    const parseFn: (value: string) => string | number = parsers[att] || parsers.DEFAULT;
    newAttributes[att] = parseFn(attributes[att] as string);
  }

  return newAttributes;
};
