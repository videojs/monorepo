import { beforeEach, describe, expect, it } from 'vitest';
import { Player } from '../src/lib/player_n';
import type { PlayerConfiguration } from '../src/lib/types/configuration.declarations';
// import type { ILogger } from '../src/lib/types/logger';
// import { instance, mock, verify, when } from '@typestrong/ts-mockito';

const createPlayerDefaultConfiguration = (): PlayerConfiguration => ({
  network: {
    manifest: {
      maxAttempts: 2,
      initialDelay: 2_000,
      delayFactor: 0.2,
      fuzzFactor: 0.2,
      timeout: 20_000,
    },
    license: {
      maxAttempts: 2,
      initialDelay: 2_000,
      delayFactor: 0.2,
      fuzzFactor: 0.2,
      timeout: 20_000,
    },
    segment: {
      maxAttempts: 2,
      initialDelay: 2_000,
      delayFactor: 0.2,
      fuzzFactor: 0.2,
      timeout: 20_000,
    },
  },
});

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

  describe('getCurrentConfigurationSnapshot', () => {
    it('should return current configuration snapshot', () => {
      const snapshot1 = player.getConfigurationSnapshot();
      const snapshot2 = player.getConfigurationSnapshot();

      expect(snapshot1).toEqual(createPlayerDefaultConfiguration());
      expect(snapshot2).toEqual(createPlayerDefaultConfiguration());
      expect(snapshot1).not.toBe(snapshot2);
    });
  });

  describe('updateConfiguration', () => {
    it('should update current player configuration', () => {
      const snapshot1 = player.getConfigurationSnapshot();
      expect(snapshot1.network.license.maxAttempts).toBe(2);

      player.updateConfiguration({
        network: {
          license: {
            maxAttempts: 1,
          },
        },
      });

      const snapshot2 = player.getConfigurationSnapshot();
      expect(snapshot2.network.license.maxAttempts).toBe(1);
      expect(snapshot1.network.license.maxAttempts).toBe(2);
    });
  });

  describe('resetConfiguration', () => {
    it('should reset configuration to defaults', () => {
      const snapshot1 = player.getConfigurationSnapshot();
      expect(snapshot1.network.license.maxAttempts).toBe(2);

      player.updateConfiguration({
        network: {
          license: {
            maxAttempts: 1,
          },
        },
      });

      const snapshot2 = player.getConfigurationSnapshot();
      expect(snapshot2.network.license.maxAttempts).toBe(1);

      player.resetConfiguration();

      const snapshot3 = player.getConfigurationSnapshot();
      expect(snapshot3.network.license.maxAttempts).toBe(2);
    });
  });
});
