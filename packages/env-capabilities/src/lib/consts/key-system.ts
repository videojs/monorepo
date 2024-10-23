// enums can be imported as types and as values,
// since they can be used as values they should not be in the types folder
export enum KeySystem {
  Widevine = 'com.widevine.alpha',
  Playready = 'com.microsoft.playready',
  Fairplay = 'com.apple.fps',
  FairplayLegacy = 'com.apple.fps.1_0',
}
