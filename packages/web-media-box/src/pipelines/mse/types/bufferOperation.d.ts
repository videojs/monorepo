export enum OperationType {
  append,
  remove,
}

export interface SourceBufferWrapper {
  buffer: SourceBuffer;
  queue: Array<() => Promise<void>>;
}
