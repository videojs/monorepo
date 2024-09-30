import type { Define } from '../types/parsed-playlist';

export const parseBoolean = (val: string, fallback: boolean): boolean => {
  if (val === 'YES') {
    return true;
  }

  if (val === 'NO') {
    return false;
  }

  return fallback;
};

export const parseHex = (val: string): Uint8Array | undefined => {
  const hexes = val.match(/[\da-f]{2}/gi);

  if (!hexes) {
    return;
  }

  return new Uint8Array(hexes as unknown as ArrayLike<number>);
};

const VARIABLE_REPLACEMENT_REGEX = /\{\$([a-zA-Z0-9-_]+)\}/g;

/**
 * Variable Substitution
 * @param value
 * @param define
 * @param warnCallback
 * @see https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis#section-4.3
 */
export const substituteVariables = (
  value: string,
  define: Define,
  warnCallback: (variableName: string) => void
): string => {
  return value.replace(VARIABLE_REPLACEMENT_REGEX, (match: string): string => {
    // We expect the match to be the following pattern {$variableName}
    const variableName = match.slice(2, -1);

    if (define.name[variableName]) {
      return define.name[variableName];
    }

    if (define.import[variableName]) {
      return define.import[variableName];
    }

    if (define.queryParam[variableName]) {
      return define.queryParam[variableName];
    }

    warnCallback(variableName);

    return match;
  });
};

export const resolveUri = (uri: string, baseUrl: string): string | null => {
  try {
    return new URL(uri, baseUrl).toString();
  } catch (e) {
    return null;
  }
};
