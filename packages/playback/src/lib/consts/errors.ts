// enums can be imported as types and as values,
// since they can be used as values they should not be in the types folder

export enum ErrorCategory {
  Pipeline = 1,
}

// enums can be imported as types and as values,
// since they can be used as values they should not be in the types folder
export enum ErrorCode {
  NoSupportedPipelines = 1000,
  PipelineLoaderFailedToDeterminePipeline,
}
