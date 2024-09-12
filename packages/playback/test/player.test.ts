import { beforeEach, describe, expect, it } from 'vitest';
import { Player } from '../src/lib/player_n';
// import type { ILogger } from '../src/lib/types/logger';
// import { instance, mock, verify, when } from '@typestrong/ts-mockito';

describe('Player spec', () => {
  let player: Player;
  // let mockedLogger: ILogger;

  beforeEach(() => {
    // mockedLogger = mock<ILogger>();
    // player = new Player({ logger: instance(mockedLogger) });
    player = new Player();
  });

  describe('getLoggerLevel', () => {
    it('should return current logger level', () => {
      // when(mockedLogger.getLoggerLevel()).thenReturn(Player.LoggerLevel.Warn);
      expect(player.getLoggerLevel()).toBe(Player.LoggerLevel.Debug);
      // verify(mockedLogger.getLoggerLevel()).once();
    });
  });

  describe('setLoggerLevel', () => {
    it('should set logger level', () => {
      expect(player.getLoggerLevel()).toBe(Player.LoggerLevel.Debug);
      player.setLoggerLevel(Player.LoggerLevel.Info);
      expect(player.getLoggerLevel()).toBe(Player.LoggerLevel.Info);
      player.setLoggerLevel(Player.LoggerLevel.Warn);
      expect(player.getLoggerLevel()).toBe(Player.LoggerLevel.Warn);
    });
  });
});
