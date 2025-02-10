import { ChunkPlaylistParser } from '@videojs/hls-parser';
import { ServiceLocator } from '../../src/lib/service-locator';
import { beforeEach, describe, expect, it } from 'vitest';
import { HlsPipeline } from '../../src/lib/pipelines/mse/hls-pipeline';
import type { IPipelineDependencies } from '../../src/entry-points/api-reference';
describe('Service locator spec', () => {
  let serviceLocator: ServiceLocator;
  beforeEach(() => {
    serviceLocator = new ServiceLocator();
  });

  it('should create a service locator instance', () => {
    expect(serviceLocator).toBeInstanceOf(ServiceLocator);
  });

  it('should return the chunk hls parser', () => {
    HlsPipeline.create({
      logger: serviceLocator.logger,
    } as IPipelineDependencies);
    expect(serviceLocator.getHlsParser()).toBeInstanceOf(ChunkPlaylistParser);
  });
});
