export const parseBoolean = (val: string, fallback: boolean): boolean => {
  if (val === 'YES') {
    return true;
  }

  if (val === 'NO') {
    return false;
  }

  return fallback;
};
