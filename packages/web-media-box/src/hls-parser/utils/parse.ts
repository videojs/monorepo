import type { Encryption, SessionKey } from '../types/parsedPlaylist';

export const parseBoolean = (val: string, fallback: boolean): boolean => {
  if (val === 'YES') {
    return true;
  }

  if (val === 'NO') {
    return false;
  }

  return fallback;
};

export const parseHex = (val: string): ArrayBuffer | undefined => {
  const hexes = val.match(/[\da-f]{2}/gi);

  if (!hexes) {
    return;
  }

  return new Uint8Array(hexes as unknown as ArrayLike<number>).buffer as ArrayBuffer;
};

export const parseEncryptionTag = (tagAttributes: Record<string, string>): Encryption | SessionKey => {
  const METHOD = 'METHOD';
  const URI = 'URI';
  const IV = 'IV';
  const KEYFORMAT = 'KEYFORMAT';
  const KEYFORMATVERSIONS = 'KEYFORMATVERSIONS';

  return {
    method: tagAttributes[METHOD] as 'NONE' | 'AES-128' | 'SAMPLE-AES',
    uri: tagAttributes[URI],
    iv: tagAttributes[IV],
    keyFormat: tagAttributes[KEYFORMAT] || 'identity',
    keyFormatVersions: tagAttributes[KEYFORMATVERSIONS] ? tagAttributes[KEYFORMATVERSIONS].split('/').map(Number) : [1],
  };
};
