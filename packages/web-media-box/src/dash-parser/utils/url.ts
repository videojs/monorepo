const identifierPattern = /\$([A-z]*)(?:(%0)([0-9]+)d)?\$/g;

export const resolveURL = (relativeUrl: string, baseUrl: string): string => {
  try {
    return new URL(relativeUrl, baseUrl).href
  } catch {
    return relativeUrl || baseUrl;
  }
}

/**
 * Returns a function to be used as a callback for String.prototype.replace to replace
 * template identifiers
 */
export const identifierReplacement = (values: Record<string, unknown>) => (match: string, id: string, format: string, width: string | number): string => {
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

  return `${(new Array(width - value.length + 1)).join('0')}${value}`;
};

/**
 * Constructs a segment url from a template string
 */
export const constructTemplateUrl = (url: string, values: Record<string, unknown>): string => {
  return url.replace(identifierPattern, identifierReplacement(values));
}
