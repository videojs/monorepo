const skipProcessing = (tag: string, reason: string): string => `Skip processing ${tag}. Reason: ${reason}.`;

export const ignoreTagWarn = (tag: string): string => skipProcessing(tag, 'Tag is included in the ignore list');

export const unsupportedTagWarn = (tag: string): string => skipProcessing(tag, 'Unsupported');

export const missingRequiredAttributeWarn = (tag: string, attribute: string): string =>
  skipProcessing(tag, `No required ${attribute} attribute`);
