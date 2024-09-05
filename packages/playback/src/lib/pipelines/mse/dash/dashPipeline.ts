/* eslint-disable no-unused-vars,@typescript-eslint/no-unused-vars */
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
  private static parserFactory_: DashParserFactory = ProgressiveParser;

  public static setParserFactory(parserFactory: DashParserFactory): void {
    DashPipeline.parserFactory_ = parserFactory;
  }

  public static create(dependencies: PipelineDependencies): DashPipeline {
    dependencies.logger = dependencies.logger.createSubLogger('DashPipeline');
    const parser = DashPipeline.parserFactory_.create({
      warnCallback: (warn) => dependencies.logger.warn(warn),
    });

    return new DashPipeline({ ...dependencies, parser });
  }

  private readonly parser_: ProgressiveParser;

  protected constructor(dashPipelineDependencies: DashPipelineDependencies) {
    super(dashPipelineDependencies);
    this.parser_ = dashPipelineDependencies.parser;
  }

  public loadRemoteAsset(uri: URL): void {}

  public loadLocalAsset(asset: string | ArrayBuffer, baseUrl: string): void {}

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
