import type { IKeySystemConfig, ISource } from '../types/source.declarations';

export class Source {
  private static counter_: number = 0;

  public readonly id: number;
  public readonly url: URL;
  public readonly mimeType: string;
  public readonly asset: string | ArrayBuffer | null = null;
  public readonly keySystems: Record<string, IKeySystemConfig>;

  public constructor(rawSource: ISource) {
    this.id = ++Source.counter_;
    this.url = rawSource.url;
    this.mimeType = rawSource.mimeType;
    this.asset = rawSource.asset || null;
    this.keySystems = rawSource.keySystems ?? {};
  }
}
