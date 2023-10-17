const skipProcessing = (tag: string, reason: string) => `Skip processing ${tag}. Reason: ${reason}.`;

export const missingTagValueWarn = (tag: string): string => skipProcessing(tag, 'No tag value');

export const missingRequiredAttributeWarn = (tag: string, attribute: string) =>
  skipProcessing(tag, `No required ${attribute} attribute`);

export const unsupportedTagWarn = (tag: string) => skipProcessing(tag, 'Unsupported');

export const unableToParseValueWarn = (tag: string) => skipProcessing(tag, 'Unable to parse tag value');

export const fallbackUsedWarn = (tag: string, fallback: string) => `${tag}: Fallback used ${fallback}`;

export const unsupportedEnumValue = (tag: string, actual: string, required: Set<string>) =>
  skipProcessing(tag, `received unsupported tag value: ${actual}. Possible values: ${Array.from(required).toString()}`);

export const ignoreTagWarn = (tag: string) => skipProcessing(tag, 'Tag is included in the ignore list');

export const tagVersionCompatibilityWarn = (tag: string, requiredVersion: number) =>
  skipProcessing(tag, `Requires compatibility version ${requiredVersion} or greater`);
