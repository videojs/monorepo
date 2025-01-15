export interface IKeySystemConfig {
  licenseServerUri: string;
  serverCertificateUri?: string;
  serverCertificate?: Uint8Array;
  persistentState?: MediaKeysRequirement;
  distinctiveIdentifier?: MediaKeysRequirement;
  sessionType?: MediaKeySessionType;
  sessionId?: string;
  priority?: number;
  /**
   * A map of ClearKey key IDs to keys.
   * These values should be encoded in hex or base64.
   * Defaults to an empty object.
   */
  clearKeys?: Record<string, string>;
  /**
   * On 'individualization-request' events, this URI will be used for the license request.
   * playready specific
   * Defaults to ''.
   */
  individualizationServerUri?: string;
  getContentId?: (contentId: string) => string;
  // Rare cases when we want to leave it up to the user to get the license
  getLicense?: (contentId: string, keyMessage: MediaKeyMessageEvent) => void;
}

export interface ILoadSource {
  mimeType: string;
  loaderAlias?: string;
  keySystems?: Record<string, IKeySystemConfig>;
  /**
   * You have to provide baseUrl for MPEG-DASH or HLS parsing
   * If provided manifest/playlist has relative urls inside and provided as one of the following formats:
   * - data: | blob: URL
   * - string | ArrayBuffer | Blob | File asset
   */
  baseUrl?: URL;
}

export interface ILoadRemoteSource extends ILoadSource {
  /**
   * Popular use-cases: (http:|https:|data:|blob:) all should work fine with fetch
   * Potentially, could be any other protocols, so custom network manager should be provider by the client
   */
  readonly url: URL;
}

export interface ILoadLocalSource extends ILoadSource {
  /**
   * Provided asset will be converted as follows:
   * new URL(URL.createObjectURL(new Blob([source.asset])));
   */
  readonly asset: string | ArrayBuffer | Blob | File;
}

export interface IPlayerSource {
  readonly isDisposed: boolean;
  readonly id: number;
  readonly loaderAlias: string | null;
  readonly mimeType: string;
  readonly keySystems: Record<string, IKeySystemConfig>;
  readonly url: URL;
  readonly baseUrl: URL | null;
  dispose(): void;
}
