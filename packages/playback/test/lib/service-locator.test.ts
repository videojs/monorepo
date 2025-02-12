import { ChunkPlaylistParser } from '@videojs/hls-parser';
import { ServiceLocator } from '../../src/lib/service-locator';
import { beforeEach, describe, expect, it } from 'vitest';
import { HlsPipelineLoader } from '../../src/lib/pipeline-loaders/hls-pipeline-loader';

describe('Service locator spec', () => {
  let serviceLocator: ServiceLocator;
  beforeEach(() => {
    serviceLocator = new ServiceLocator();
  });

  it('should create a service locator instance', () => {
    expect(serviceLocator).toBeInstanceOf(ServiceLocator);
  });

  it('should return the chunk hls parser', () => {
    expect(serviceLocator.getHlsParser()).toEqual(null);
    // set parser
    HlsPipelineLoader.setHlsParser(ChunkPlaylistParser);
    const ChunkHlsParser = serviceLocator.getHlsParser();
    expect(ChunkHlsParser).toBeTypeOf('function');
    const parser = ChunkHlsParser ? ChunkHlsParser.create({}) : null;
    expect(parser).toBeInstanceOf(ChunkPlaylistParser);
  });
});
