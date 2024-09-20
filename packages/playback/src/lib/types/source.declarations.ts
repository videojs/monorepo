export interface IKeySystemConfig {
  licenseServerUri: string;
  serverCertificateUri?: string;
  serverCertificate?: Uint8Array;
  persistentState?: MediaKeysRequirement;
  distinctiveIdentifier?: MediaKeysRequirement;
  videoRobustness?: string;
  audioRobustness?: string;
  sessionType?: MediaKeySessionType;
  getContentId?: (contentId: string) => string;
}

export interface ISource {
  url: URL;
  mimeType: string;
  asset?: string | ArrayBuffer;
  keySystems?: Record<string, IKeySystemConfig>;
}
