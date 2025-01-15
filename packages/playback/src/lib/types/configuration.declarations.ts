import type { CustomTagMap, TransformTagValue, TransformTagAttributes } from '@videojs/hls-parser';
import type { RequestType } from '../consts/request-type';
import type { IKeySystemConfig } from './source.declarations';

export interface NetworkConfiguration {
  /**
   * The maximum number of requests before we fail.
   * Defaults to `1`
   */
  maxAttempts: number;

  /**
   * The base delay in ms between retries.
   * Defaults to `1_000`
   */
  initialDelay: number;

  /**
   * Increase delay for each retry: delay += (delay * delayFactor).
   * Defaults to `0.2`
   */
  delayFactor: number;

  /**
   * Do not send retry requests in the exact same timing, but rather fuzz it by some range, eg: if the delay = 3000, and fuzz factor is 0.1,
   * then the requests will be made somewhere in the following time range range: [2700, 3300].
   * Defaults to `0.2`
   */
  fuzzFactor: number;

  /**
   * The timeout in ms, after which we abort.
   * Defaults to `20_000`
   */
  timeout: number;
}

export interface PlayerNetworkConfiguration {
  [RequestType.DashManifest]: NetworkConfiguration;
  [RequestType.HlsPlaylist]: NetworkConfiguration;
  [RequestType.License]: NetworkConfiguration;
  [RequestType.Key]: NetworkConfiguration;
  [RequestType.MediaSegment]: NetworkConfiguration;
  [RequestType.InitSegment]: NetworkConfiguration;
}

export interface PlayerMseConfiguration {
  /**
   * Defaults to `true`
   */
  useManagedMediaSourceIfAvailable: boolean;

  /**
   * In Seconds
   * Defaults to 30
   */
  requiredBufferDuration: number;
}

export interface PlayerHlsConfiguration {
  ignoreTags: Set<string>;
  customTagMap: CustomTagMap;
  transformTagValue: TransformTagValue;
  transformTagAttributes: TransformTagAttributes;

}

/** Would be used if we allowed the user to pass in a persistent session */
// If we need this, move it to another file
// export interface KeySessionMetadata {
//   sessionId: string;
//   initData: Uint8Array;
//   initDataType: string;
// }


export interface PlayerEmeConfiguration {
  /**
   * A map of ClearKey key IDs to keys.
   * These values should be encoded in hex or base64.
   * Defaults to an empty object.
   */
  clearKeys: Record<string, string>;

  /**
   * Key sessions metadata to load before starting playback.
   * Defaults to an empty array.
   */
  // initialKeySessions: Array<KeySessionMetadata>;


  // NOTE: We could make this order the priority that the user intends.
  // If not, do we want a different config option that lists priority of key systems?
  // Or maybe a `priority` value in the keySystems?
  // Do we want to priortize different types of the same DRM (com.widevine.something vs com.widevine.alpha)
  keySystems: Record<string, IKeySystemConfig>;


  /**
   * The time in ms to check if the media key session is expired.
   * Defaults to 1000.
   */
  sessionExpirationInterval: number;

  /**
   * The minimum version of HDCP to start EME streams.
   * Defaults to ''.
   */
  minHdcpVersion: string;

  // This will probably replace the firstWebkitneedkeyTimeout option in contrib eme
  /**
   * Option to ignore duplicate init data on the encrypted event or through pssh boxes.
   * Defaults to true
   */
  ignoreDuplicateInitData: boolean;


  /**
   * The amount of time in milliseconds to wait on the first `webkitneedkey` event before making the key request.
   * is was implemented due to a bug in Safari where rendition switches at the start of playback can cause `webkitneedkey` to fire multiple times, with only the last one being valid.
   * Defaults to 1000.
   */
  webkitneedkeyTimeout: number;

  // POLYFILLS

  // This would enable the legacy fairplay specific code, in a polyfill manner.
  /**
   * Build modern EME into browsers that use Apple's prefixed EME in Safari.
   * Defaults to false
   */
  enableLegacyFairplay: boolean;

  /**
   * Adds the logic to fix setServerCertificate implementation on older platforms which claim to support modern EME.
   * Defaults to false
   */
  enableSetServerCertificate: boolean;

  /**
   * Build modern EME into browsers that use legacy webkit EME API
   * Shaka defaults this to true, I'd guess we would too.
   */
  enableLegacyWebkit: boolean;

  /**
   * Add support for EncryptionScheme queries in EME.
   * https://wicg.github.io/encrypted-media-encryption-scheme/
   * defaults to false.
   */
  enableEncryptionSchemes: boolean;

  // keySystemsByURI: Record<string, string>;
  // This maps something like 'urn:uuid:9a04f079-9840-4286-ab92-e65be0885f95': 'com.microsoft.playready.recommendation',
  // I am guessing we want to do this manually. Should the user have this capability?
  // They could just create a value in `keySystems`.

  // keySystemsMapping: similar to above for two strings, just create another key session.

  // delayLicenseRequestUntilPlayed?? - not sure how this would be useful

  // persistentSessionOnlinePlayback?? - try playback with given persistent session ids
  // before requesting a license. Also prevents the session removal at playback
  // stop, as-to be able to re-use it later..
  // DO THIS BY DEFAULT?

  // initDataTransform?? - do we want to allow the user to transform initData??

  // parseInbandPsshEnabled?? - enabled by default I would guess

  // setMediaKeysNoOp?? - meant to stub out eme API for browsers without it.
  // Shaka supports this but I do not know if we want this as an option.
}

export interface PlayerConfiguration {
  network: PlayerNetworkConfiguration;
  mse: PlayerMseConfiguration;
  hls: PlayerHlsConfiguration;
  eme: PlayerEmeConfiguration;
}
