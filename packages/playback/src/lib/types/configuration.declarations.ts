import type { CustomTagMap } from '@videojs/hls-parser';
import type { RequestType } from '../consts/request-type';

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
}

export interface PlayerConfiguration {
  network: PlayerNetworkConfiguration;
  mse: PlayerMseConfiguration;
  hls: PlayerHlsConfiguration;
}
