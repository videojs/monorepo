/**
 * A helper method to determine if the keySystem is FairPlay
 * @param keySystem The key system string
 * @returns Whether the key system is FairPlay
 */
export const isFairPlayKeySystem = (keySystem: string): boolean => {
  if (keySystem) {
    return !!keySystem.match(/^com\.apple\.fps/);
  }

  return false;
};

/**
 * A helper method to determine if the keySystem is PlayReady
 * @param keySystem The key system string
 * @returns Whether the key system is PlayReady
 */
export const isPlayReadyKeySystem = (keySystem: string): boolean => {
  if (keySystem) {
    return !!keySystem.match(/^com\.(microsoft|chromecast)\.playready/);
  }

  return false;
};

/**
 * @param keySystem The key system type
 * @returns Whether the keySystem is ClearKey
 */
export const isClearKeySystem = (keySystem: string): boolean => {
  return keySystem === 'org.w3.clearkey';
};
