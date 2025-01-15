import type {
  NetworkConfiguration,
  PlayerConfiguration,
  PlayerEmeConfiguration,
  PlayerHlsConfiguration,
  PlayerMseConfiguration,
  PlayerNetworkConfiguration,
} from '../types/configuration.declarations';
import { RequestType } from '../consts/request-type';

export const getNetworkConfigurationDefaults = (): NetworkConfiguration => ({
  maxAttempts: 2,
  initialDelay: 2_000,
  delayFactor: 0.2,
  fuzzFactor: 0.2,
  timeout: 20_000,
});

export const getPlayerNetworkConfigurationDefaults = (): PlayerNetworkConfiguration => ({
  [RequestType.DashManifest]: getNetworkConfigurationDefaults(),
  [RequestType.HlsPlaylist]: getNetworkConfigurationDefaults(),
  [RequestType.License]: getNetworkConfigurationDefaults(),
  [RequestType.Key]: getNetworkConfigurationDefaults(),
  [RequestType.InitSegment]: getNetworkConfigurationDefaults(),
  [RequestType.MediaSegment]: getNetworkConfigurationDefaults(),
});

export const getPlayerEmeConfigurationDefaults = (): PlayerEmeConfiguration => ({
  reusePersistentKeySessions: false,
  audioRobustness: '',
  videoRobustness: '',
});

export const getPlayerMseConfigurationDefaults = (): PlayerMseConfiguration => ({
  useManagedMediaSourceIfAvailable: true,
  requiredBufferDuration: 30,
});

export const getPlayerHlsConfigurationDefaults = (): PlayerHlsConfiguration => ({
  ignoreTags: new Set(),
  customTagMap: new Map(),
  transformTagValue: (tagKey, tagValue) => tagValue,
  transformTagAttributes: (tagKey, tagAttributes) => tagAttributes,
});

export const getPlayerConfigurationDefaults = (): PlayerConfiguration => ({
  network: getPlayerNetworkConfigurationDefaults(),
  mse: getPlayerMseConfigurationDefaults(),
  hls: getPlayerHlsConfigurationDefaults(),
  eme: getPlayerEmeConfigurationDefaults(),
});
