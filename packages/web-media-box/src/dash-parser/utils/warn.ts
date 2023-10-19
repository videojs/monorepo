const skipProcessing = (tag: string, reason: string) => `Skip processing ${tag}. Reason: ${reason}.`;

export const ignoreTagWarn = (tag: string) => skipProcessing(tag, 'Tag is included in the ignore list');

export const unsupportedTagWarn = (tag: string) => skipProcessing(tag, 'Unsupported');
