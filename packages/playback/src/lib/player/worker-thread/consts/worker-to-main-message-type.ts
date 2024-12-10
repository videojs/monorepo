export enum WorkerToMainMessageType {
  EmitEvent = 'EmitEvent',
  RunInterceptors = 'RunInterceptors',
  AttachMseHandle = 'AttachMseHandle',
  AttachMseFallback = 'AttachMseFallback',
}
