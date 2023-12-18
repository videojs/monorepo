import type { ParsedPlaylist, ParserOptions } from '@videojs/hls-parser';
import { ProgressiveParser } from '@videojs/hls-parser';
import MsePipeLine from '../msePipeline';
import type { PipelineDependencies } from '../../basePipeline';
import type {
  PlayerAudioTrack,
  PlayerImageTrack,
  PlayerStats,
  PlayerTextTrack,
  PlayerVideoTrack,
} from '../../../types/player';
import { RequestType } from '../../../types/network';

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
    dependencies.logger = dependencies.logger.createSubLogger('HlsPipeline');
    const parser = HlsPipeline.parserFactory.create({
      warnCallback: (warn) => dependencies.logger.warn(warn),
    });

    return new HlsPipeline({ ...dependencies, parser });
  }

  private readonly parser: ProgressiveParser;

  protected constructor(hlsPipelineDependencies: HlsPipelineDependencies) {
    super(hlsPipelineDependencies);
    this.parser = hlsPipelineDependencies.parser;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public loadRemoteAsset(uri: URL): void {
    const { abort, done } = this.networkManager.getProgressive(
      uri.toString(),
      RequestType.HlsPlaylist,
      {},
      this.playerConfiguration.network.manifest,
      this.playerConfiguration.network.manifest.timeout,
      (chunk) => {
        this.parser.pushBuffer(chunk, { baseUrl: uri.toString() });
      }
    );

    done.then(
      () => {
        const parsed = this.parser.done();

        // TODO: initialize Presentations
      },
      (error) => {
        //TODO: check abort
        //TODO: trigger error
      }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public loadLocalAsset(asset: string | ArrayBuffer, baseUrl: string): void {
    let parsed: ParsedPlaylist;

    if (typeof asset === 'string') {
      this.parser.pushString(asset, { baseUrl });
    } else {
      this.parser.pushBuffer(new Uint8Array(asset), { baseUrl });
    }

    parsed = this.parser.done();

    // TODO: initialize Presentations
  }

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
    // TODO: abort pending initial request
    throw new Error('Method not implemented.');
  }
}
