import type { WarnCallback } from '../types/parserOptions';

export abstract class TagProcessor {
  protected readonly warnCallback: WarnCallback;
  protected abstract readonly tag: string;

  constructor(warnCallback: WarnCallback) {
    this.warnCallback = warnCallback;
  }
}
