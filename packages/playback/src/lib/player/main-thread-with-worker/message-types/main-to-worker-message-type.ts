export enum MainToWorkerMessageType {
  SetLoggerLevel = 'SetLoggerLevel',
  UpdateConfiguration = 'UpdateConfiguration',
  InterceptorsExecutionResult = 'InterceptorsExecutionResult',
  AttachMseFallbackExecutionResult = 'AttachMseFallbackExecutionResult',
  Stop = 'Stop',
}
