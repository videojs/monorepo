// enums can be imported as types and as values,
// since they can be used as values they should not be in the types folder

export enum ErrorCategory {
  Pipeline = 1,
  Eme = 2,
}

// enums can be imported as types and as values,
// since they can be used as values they should not be in the types folder
export enum ErrorCode {
  NoSupportedPipelines = 1000,
  PipelineLoaderFailedToDeterminePipeline,
  // EME Errors
  EmeManagerMissing = 2000,
  SourceNotSet,
  SourceMissingKeySystems,
  KeySessionClosed,
  KeySessionCreateFailed,
  InvalidServerCertificate,
  LicenseResponseRejected,
  LicenseRequestFailed,
  MediaKeyCreateFailed,
  MissingEmeSupport,
}
