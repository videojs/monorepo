const skipProcessing = (tag: string, reason: string): string => `Skip processing ${tag}. Reason: ${reason}.`;

export const missingTagValueWarn = (tag: string): string => skipProcessing(tag, 'No tag value');

export const missingRequiredAttributeWarn = (tag: string, attribute: string): string =>
  skipProcessing(tag, `No required ${attribute} attribute`);

export const missingRequiredVariableForAttributeValueSubstitutionWarn = (
  tag: string,
  attribute: string,
  variableName: string
): string => skipProcessing(tag, `No required variable for ${variableName} when processing ${attribute}`);

export const unsupportedTagWarn = (tag: string): string => skipProcessing(tag, 'Unsupported');

export const unableToParseValueWarn = (tag: string): string => skipProcessing(tag, 'Unable to parse tag value');

export const fallbackUsedWarn = (tag: string, fallback: string): string => `${tag}: Fallback used ${fallback}`;

export const unsupportedEnumValue = (tag: string, actual: string, required: Set<string>): string =>
  skipProcessing(tag, `received unsupported tag value: ${actual}. Possible values: ${Array.from(required).toString()}`);

export const ignoreTagWarn = (tag: string): string => skipProcessing(tag, 'Tag is included in the ignore list');

export const segmentDurationExceededTargetDuration = (
  segmentUri: string,
  segmentDuration: number,
  targetDuration: number
): string =>
  `Segment duration is more than target duration. Difference is ${
    segmentDuration - targetDuration
  }. Uri is ${segmentUri}`;
