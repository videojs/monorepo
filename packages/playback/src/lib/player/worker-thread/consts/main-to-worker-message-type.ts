export enum MainToWorkerMessageType {
  SetLoggerLevel = 'SetLoggerLevel',
  UpdateConfiguration = 'UpdateConfiguration',
  InterceptorsExecutionResult = 'InterceptorsExecutionResult',
  Stop = 'Stop',
}
