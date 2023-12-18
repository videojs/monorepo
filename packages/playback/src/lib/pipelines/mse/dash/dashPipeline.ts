import MsePipeLine from '../msePipeline';
import type { PipelineDependencies } from '../../basePipeline';
import type {
  PlayerTextTrack,
  PlayerAudioTrack,
  PlayerImageTrack,
  PlayerVideoTrack,
  PlayerStats,
} from '../../../types/player';
import type { ParserOptions } from '@videojs/dash-parser';
import { ProgressiveParser } from '@videojs/dash-parser';

interface DashParserFactory {
  create(options: ParserOptions): ProgressiveParser;
}

interface DashPipelineDependencies extends PipelineDependencies {
  parser: ProgressiveParser;
}

export default class DashPipeline extends MsePipeLine {
  private static parserFactory: DashParserFactory = ProgressiveParser;

  public static setParserFactory(parserFactory: DashParserFactory): void {
    DashPipeline.parserFactory = parserFactory;
  }

  public static create(dependencies: PipelineDependencies): DashPipeline {
    const parser = DashPipeline.parserFactory.create({}); // TODO options

    return new DashPipeline({ ...dependencies, parser });
  }

  private readonly parser: ProgressiveParser;

  protected constructor(dashPipelineDependencies: DashPipelineDependencies) {
    super(dashPipelineDependencies);
    this.parser = dashPipelineDependencies.parser;
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
