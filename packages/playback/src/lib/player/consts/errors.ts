export const ErrorCategory = {
  Pipeline: 'Pipeline',
  Network: 'Network',
} as const;

export const PipelineErrorCodes = {
  NoSupportedPipeline: 'NoSupportedPipeline',
} as const;

export const NetworkErrorCodes = {
  NoNetworkManagerRegisteredForProtocol: 'NoNetworkManagerRegisteredForProtocol',
} as const;

export type ErrorCode = keyof typeof PipelineErrorCodes | keyof typeof NetworkErrorCodes;
