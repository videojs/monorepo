import { beforeEach, describe, it, expect, vi } from 'vitest';
import { Logger } from '../../src/lib/utils/logger';
import { LoggerLevel } from '../../src/lib/consts/logger-level';

describe('Logger', () => {
  let console: Console;
  let logger: Logger;

  beforeEach(() => {
    console = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Console;

    logger = new Logger({
      console,
      label: 'Player',
      delimiter: '-',
    });
  });

  it('should create sub logger', () => {
    const subLogger = logger.createSubLogger('Sub').createSubLogger('Sub2').createSubLogger('Sub3');

    expect(subLogger.label).toBe('Player - Sub - Sub2 - Sub3');
    subLogger.debug('msg');

    expect(console.debug).toHaveBeenNthCalledWith(
      1,
      '%cPlayer - Sub - Sub2 - Sub3',
      'background: #333; padding: 3px; color: #bada55',
      'msg'
    );
  });

  it('set logger level', () => {
    expect(logger.getLoggerLevel()).toBe(LoggerLevel.Debug);

    logger.setLoggerLevel(LoggerLevel.Info);

    expect(logger.getLoggerLevel()).toBe(LoggerLevel.Info);
  });

  it('debug should allow debug/info/warn/error', () => {
    logger.setLoggerLevel(LoggerLevel.Debug);

    logger.debug('msg');
    logger.info('msg');
    logger.warn('msg');
    logger.error('msg');

    expect(console.debug).toHaveBeenNthCalledWith(
      1,
      '%cPlayer',
      'background: #333; padding: 3px; color: #bada55',
      'msg'
    );
    expect(console.info).toHaveBeenNthCalledWith(
      1,
      '%cPlayer',
      'background: #333; padding: 3px; color: #bada55',
      'msg'
    );
    expect(console.warn).toHaveBeenNthCalledWith(
      1,
      '%cPlayer',
      'background: #333; padding: 3px; color: #bada55',
      'msg'
    );
    expect(console.error).toHaveBeenNthCalledWith(
      1,
      '%cPlayer',
      'background: #333; padding: 3px; color: #bada55',
      'msg'
    );
  });

  it('info should allow info/warn/error', () => {
    logger.setLoggerLevel(LoggerLevel.Info);

    logger.debug('msg');
    logger.info('msg');
    logger.warn('msg');
    logger.error('msg');

    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).toHaveBeenNthCalledWith(
      1,
      '%cPlayer',
      'background: #333; padding: 3px; color: #bada55',
      'msg'
    );
    expect(console.warn).toHaveBeenNthCalledWith(
      1,
      '%cPlayer',
      'background: #333; padding: 3px; color: #bada55',
      'msg'
    );
    expect(console.error).toHaveBeenNthCalledWith(
      1,
      '%cPlayer',
      'background: #333; padding: 3px; color: #bada55',
      'msg'
    );
  });

  it('warn should allow warn/error', () => {
    logger.setLoggerLevel(LoggerLevel.Warn);

    logger.debug('msg');
    logger.info('msg');
    logger.warn('msg');
    logger.error('msg');

    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenNthCalledWith(
      1,
      '%cPlayer',
      'background: #333; padding: 3px; color: #bada55',
      'msg'
    );
    expect(console.error).toHaveBeenNthCalledWith(
      1,
      '%cPlayer',
      'background: #333; padding: 3px; color: #bada55',
      'msg'
    );
  });

  it('error should allow error only', () => {
    logger.setLoggerLevel(LoggerLevel.Error);

    logger.debug('msg');
    logger.info('msg');
    logger.warn('msg');
    logger.error('msg');

    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();

    expect(console.error).toHaveBeenNthCalledWith(
      1,
      '%cPlayer',
      'background: #333; padding: 3px; color: #bada55',
      'msg'
    );
  });

  it('off should  disable all', () => {
    logger.setLoggerLevel(LoggerLevel.Off);

    logger.debug('msg');
    logger.info('msg');
    logger.warn('msg');
    logger.error('msg');

    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });
});
