import type { WarnCallback } from '../types/parser-options';

export abstract class TagProcessor {
  protected readonly warnCallback_: WarnCallback;
  protected abstract readonly tag_: string;

  public constructor(warnCallback: WarnCallback) {
    this.warnCallback_ = warnCallback;
  }
}
