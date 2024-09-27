import type {
  IKeySystemConfig,
  ILoadLocalSource,
  ILoadRemoteSource,
  IPlayerSource,
} from '../types/source.declarations';

export class PlayerSource implements IPlayerSource {
  private static counter_: number = 0;

  public readonly id: number;
  public readonly mimeType: string;
  public readonly keySystems: Record<string, IKeySystemConfig>;
  public readonly url: URL;
  public readonly baseUrl: URL | null = null;

  private readonly isBlob_: boolean = false;

  private isDisposed_: boolean = false;

  public constructor(rawSource: ILoadRemoteSource | ILoadLocalSource) {
    this.id = ++PlayerSource.counter_;
    this.mimeType = rawSource.mimeType;
    this.baseUrl = rawSource.baseUrl ?? null;
    this.keySystems = rawSource.keySystems ?? {};

    if ('asset' in rawSource) {
      const blob = new Blob([rawSource.asset]);
      const blobUrl = URL.createObjectURL(blob);
      this.url = new URL(blobUrl);
      this.isBlob_ = true;
    } else {
      this.url = rawSource.url;
    }
  }

  public get isDisposed(): boolean {
    return this.isDisposed_;
  }

  public dispose(): void {
    this.isDisposed_ = true;
    if (this.isBlob_) {
      URL.revokeObjectURL(this.url.toString());
    }
  }
}
