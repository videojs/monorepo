import type { Define } from '../types/parsedPlaylist';

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
 * @see https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis#section-4.3
 */
export const substituteVariable = (
  value: string,
  define: Define,
  warnCallback: (variableName: string) => void
): string => {
  return value.replace(VARIABLE_REPLACEMENT_REGEX, (match: string): string => {
    // we expect match to be the following patter {$variableName}
    const variableName = match.slice(2, -1);

    if (define.name[variableName] !== null) {
      return define.name[variableName] as string;
    }

    if (define.import[variableName] !== null) {
      return define.import[variableName] as string;
    }

    if (define.queryParam[variableName] !== null) {
      return define.queryParam[variableName] as string;
    }

    warnCallback(variableName);

    return match;
  });
};
