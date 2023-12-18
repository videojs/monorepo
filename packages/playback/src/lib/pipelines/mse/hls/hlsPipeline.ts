import type { ParserOptions } from '@videojs/hls-parser';
import { ProgressiveParser } from '@videojs/hls-parser';
import MsePipeLine from '../msePipeline';
import type { PipelineDependencies } from '../../basePipeline';
import type {
  PlayerTextTrack,
  PlayerAudioTrack,
  PlayerImageTrack,
  PlayerVideoTrack,
  PlayerStats,
} from '../../../types/player';

interface HlsParserFactory {
  create(options: ParserOptions): ProgressiveParser;
}

interface HlsPipelineDependencies extends PipelineDependencies {
  parser: ProgressiveParser;
}

export default class HlsPipeline extends MsePipeLine {
  private static parserFactory: HlsParserFactory = ProgressiveParser;

  public static setParserFactory(parserFactory: HlsParserFactory): void {
    HlsPipeline.parserFactory = parserFactory;
  }

  public static create(dependencies: PipelineDependencies): HlsPipeline {
    const parser = HlsPipeline.parserFactory.create({}); // TODO options

    return new HlsPipeline({ ...dependencies, parser });
  }

  private readonly parser: ProgressiveParser;

  protected constructor(hlsPipelineDependencies: HlsPipelineDependencies) {
    super(hlsPipelineDependencies);
    this.parser = hlsPipelineDependencies.parser;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public loadRemoteAsset(uri: URL): void {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public loadLocalAsset(asset: string | ArrayBuffer): void {}

  public selectTextTrack(textTrack: PlayerTextTrack): void {
    throw new Error('Method not implemented.');
  }
  public selectAudioTrack(audioTrack: PlayerAudioTrack): void {
    throw new Error('Method not implemented.');
  }
  public selectImageTrack(imageTrack: PlayerImageTrack): void {
    throw new Error('Method not implemented.');
  }
  public selectVideoTrack(videoTrack: PlayerVideoTrack): void {
    throw new Error('Method not implemented.');
  }
  public getTextTracks(): Array<PlayerTextTrack> {
    throw new Error('Method not implemented.');
  }
  public getAudioTracks(): Array<PlayerAudioTrack> {
    throw new Error('Method not implemented.');
  }
  public getImageTracks(): Array<PlayerImageTrack> {
    throw new Error('Method not implemented.');
  }
  public getVideoTracks(): Array<PlayerVideoTrack> {
    throw new Error('Method not implemented.');
  }
  public getStats(): PlayerStats {
    throw new Error('Method not implemented.');
  }
  public dispose(): void {
    throw new Error('Method not implemented.');
  }
}
