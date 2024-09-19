import { Pipeline } from '../basePipeline';
import type { PipelineDependencies } from '../../types/pipeline.declarations';
import type { IAudioTrack, ITextTrack } from '../../types/tracks.declarations';
import type PlayerTimeRange from '../../utils/timeRanges';
import type { PlaybackState } from '../../consts/playbackState';
import type { PlaybackStats } from '../../types/playbackStats.declarations';

export default class NativePipeline extends Pipeline {
  public static create(dependencies: PipelineDependencies): Promise<NativePipeline> {
    dependencies.logger = dependencies.logger.createSubLogger('NativePipeline');

    return Promise.resolve(new NativePipeline(dependencies));
  }

  public dispose(): void {}

  public getAudioTracks(): Array<IAudioTrack> {
    throw new Error('Not implemented');
  }

  public getBufferedRanges(): Array<PlayerTimeRange> {
    throw new Error('Not implemented');
  }

  public getDuration(): number {
    return 0;
  }

  public getPlaybackState(): PlaybackState {
    throw new Error('Not implemented');
  }

  public getPlaybackStats(): PlaybackStats {
    throw new Error('Not implemented');
  }

  public getSeekableRanges(): Array<PlayerTimeRange> {
    throw new Error('Not implemented');
  }

  public getTextTracks(): Array<ITextTrack> {
    throw new Error('Not implemented');
  }

  public selectAudioTrack(id: string): boolean {
    throw new Error(`Not implemented: ${id}`);
  }
}
