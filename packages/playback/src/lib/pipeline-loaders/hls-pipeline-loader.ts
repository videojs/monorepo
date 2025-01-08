import type { ChunkPlaylistParser } from '@videojs/hls-parser';

import type { IPipeline, IPipelineLoader, IPipelineLoaderDependencies } from '../types/pipeline.declarations';
import type { INetworkManager, INetworkRequest } from '../types/network.declarations';
import type { ILogger } from '../types/logger.declarations';
import type { IPlayerSource } from '../types/source.declarations';
import { RequestType } from '../consts/request-type';

interface IHlsPipelineLoaderDependencies extends IPipelineLoaderDependencies {
  parser: ChunkPlaylistParser;
}

export class HlsPipelineLoader implements IPipelineLoader {
  private static hlsParserFactory_: typeof ChunkPlaylistParser | null = null;

  public static setHlsParser(parser: typeof ChunkPlaylistParser): void {
    HlsPipelineLoader.hlsParserFactory_ = parser;
  }

  public static setVodPipelineFactory(): void {}

  public static setLivePipelineFactory(): void {}

  public static create(dependencies: IPipelineLoaderDependencies): IPipelineLoader {
    const logger = dependencies.logger.createSubLogger('HlsPipelineLoader');

    if (!HlsPipelineLoader.hlsParserFactory_) {
      throw new Error('HlsPipelineLoader: hls parser factory is not set');
    }

    const parser = HlsPipelineLoader.hlsParserFactory_.create({
      warnCallback: (warn) => {
        logger.warn(warn);
      },
      debugCallback: (...debug) => {
        logger.debug(...debug);
      },
      // TODO: add from the player's options
      customTagMap: {},
      ignoreTags: new Set(),
      // transformTagValue: (tagKey, tagValue) => null,
      // transformTagAttributes: (tagKey, tagAttributes) => {
      //   return {};
      // },
    });

    return new HlsPipelineLoader({
      videoElement: dependencies.videoElement,
      networkManager: dependencies.networkManager,
      source: dependencies.source,
      logger,
      parser,
    });
  }

  private readonly videoElement_: HTMLVideoElement;
  private readonly networkManager_: INetworkManager;
  private readonly logger_: ILogger;
  private readonly source_: IPlayerSource;
  private readonly parser_: ChunkPlaylistParser;

  private activeNetworkRequest_: INetworkRequest<void> | null = null;

  public constructor(dependencies: IHlsPipelineLoaderDependencies) {
    this.videoElement_ = dependencies.videoElement;
    this.networkManager_ = dependencies.networkManager;
    this.logger_ = dependencies.logger;
    this.source_ = dependencies.source;
    this.parser_ = dependencies.parser;
  }

  public async load(): Promise<IPipeline> {
    this.activeNetworkRequest_ = this.networkManager_.getProgressive({
      url: this.source_.url,
      requestType: RequestType.HlsPlaylist,
      chunkHandler: (chunk) => {
        this.parser_.push(chunk, { baseUrl: this.source_.url.toString() });
      },
    });

    try {
      await this.activeNetworkRequest_.done;
      // TODO: add hls playlist parsed interceptors
      const playlist = this.parser_.done();

      if (playlist.variantStreams.length) {
        // Received top-level playlist, start loading media-playlists to determine if it is vod or live
        // TODO: use abr manager to select the best variant to load
      } else {
        // Received a media playlist as a top-level playlist, check if it is vod or live
        if (playlist.endList) {
          // media vod playlist
        } else {
          //media live playlist
        }
      }
    } catch (e) {
      this.logger_.warn(`Failed to load playlist: ${this.source_.url} : `, e);
      throw e;
    }

    throw new Error('Not implemented');
  }

  public abort(): void {
    if (this.activeNetworkRequest_) {
      this.activeNetworkRequest_.abort('abort requested by user');
    }
  }
}
