import type { IPipelineDependencies } from '../../types/pipeline.declarations';
import MsePipeline from './mse-pipeline';
import { ChunkPlaylistParser, type FullPlaylistParser } from '@videojs/hls-parser';

export class HlsPipeline extends MsePipeline {
  public static parser: ChunkPlaylistParser | FullPlaylistParser;

  public static create(dependencies: IPipelineDependencies): HlsPipeline {
    dependencies.logger = dependencies.logger.createSubLogger('HlsPipeline');
    this.parser = ChunkPlaylistParser.create({
      debugCallback: dependencies.logger.debug,
      warnCallback: dependencies.logger.warn,
    });
    return new HlsPipeline(dependencies);
  }
}
