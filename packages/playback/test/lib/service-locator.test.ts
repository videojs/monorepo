import { FullPlaylistParser } from '@videojs/hls-parser';
import { ServiceLocator } from '../../src/lib/service-locator';
import { beforeEach, describe, expect, it } from 'vitest';
describe('Service locator spec', () => {
  let serviceLocator: ServiceLocator;
  beforeEach(() => {
    serviceLocator = new ServiceLocator();
  });

  it('should create a service locator instance', () => {
    expect(serviceLocator).toBeInstanceOf(ServiceLocator);
  });

  it('should return the full hls parser', () => {
    expect(serviceLocator.getHlsParser()).toBeInstanceOf(FullPlaylistParser);
  });
});
