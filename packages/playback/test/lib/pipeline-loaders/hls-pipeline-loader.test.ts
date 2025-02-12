import { describe, expect, it } from 'vitest';
import { HlsPipelineLoader } from '../../../src/lib/pipeline-loaders/hls-pipeline-loader';
import { ChunkPlaylistParser } from '@videojs/hls-parser';

describe('hls-pipeline-loader spec', () => {
  it('parser is static pipeline loader member', () => {
    expect(HlsPipelineLoader.getHlsParser()).toBe(null);
    // set parser
    HlsPipelineLoader.setHlsParser(ChunkPlaylistParser);
    const ChunkHlsParser = HlsPipelineLoader.getHlsParser();
    expect(ChunkHlsParser).toBeTypeOf('function');
    const parser = ChunkHlsParser ? ChunkHlsParser.create({}) : null;
    expect(parser).toBeInstanceOf(ChunkPlaylistParser);
  });
});
