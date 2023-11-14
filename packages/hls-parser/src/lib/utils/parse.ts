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
