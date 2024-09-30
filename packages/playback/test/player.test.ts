import { beforeEach, describe, expect, it } from 'vitest';
import { Player } from '../src/lib/player';
import type { PlayerConfiguration } from '../src/lib/types/configuration.declarations';
import {
  ConfigurationChangedEvent,
  LoggerLevelChangedEvent,
  VolumeChangedEvent,
} from '../src/lib/events/player-events';
import type { PlayerEvent } from '../src/lib/events/base-player-event';
import { RequestType } from '../src/lib/consts/request-type';
import { ServiceLocator } from '../src/lib/service-locator';
// import type { ILogger } from '../src/lib/types/logger';
// import { instance, mock, verify, when } from '@typestrong/ts-mockito';

const createPlayerDefaultConfiguration = (): PlayerConfiguration => ({
  network: {
    [RequestType.DashManifest]: {
      maxAttempts: 2,
      initialDelay: 2_000,
      delayFactor: 0.2,
      fuzzFactor: 0.2,
      timeout: 20_000,
    },
    [RequestType.HlsPlaylist]: {
      maxAttempts: 2,
      initialDelay: 2_000,
      delayFactor: 0.2,
      fuzzFactor: 0.2,
      timeout: 20_000,
    },
    [RequestType.Key]: {
      maxAttempts: 2,
      initialDelay: 2_000,
      delayFactor: 0.2,
      fuzzFactor: 0.2,
      timeout: 20_000,
    },
    [RequestType.MediaSegment]: {
      maxAttempts: 2,
      initialDelay: 2_000,
      delayFactor: 0.2,
      fuzzFactor: 0.2,
      timeout: 20_000,
    },
    [RequestType.InitSegment]: {
      maxAttempts: 2,
      initialDelay: 2_000,
      delayFactor: 0.2,
      fuzzFactor: 0.2,
      timeout: 20_000,
    },
    [RequestType.License]: {
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
  let serviceLocator: ServiceLocator;

  beforeEach(() => {
    serviceLocator = new ServiceLocator();
    player = new Player(serviceLocator);
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
      const expectedEvents = [
        new LoggerLevelChangedEvent(Player.LoggerLevel.Info),
        new LoggerLevelChangedEvent(Player.LoggerLevel.Warn),
      ];

      const actualEvents: Array<LoggerLevelChangedEvent> = [];

      player.addEventListener(Player.Event.LoggerLevelChanged, (event) => {
        actualEvents.push(event);
      });

      expect(player.getLoggerLevel()).toBe(Player.LoggerLevel.Debug);
      player.setLoggerLevel(Player.LoggerLevel.Info);
      expect(player.getLoggerLevel()).toBe(Player.LoggerLevel.Info);
      player.setLoggerLevel(Player.LoggerLevel.Warn);
      expect(player.getLoggerLevel()).toBe(Player.LoggerLevel.Warn);

      expect(expectedEvents).toEqual(actualEvents);
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
      const expectedEvents: Array<ConfigurationChangedEvent> = [];
      const actualEvents: Array<ConfigurationChangedEvent> = [];

      player.addEventListener(Player.Event.ConfigurationChanged, (event) => {
        actualEvents.push(event);
      });

      const snapshot1 = player.getConfigurationSnapshot();
      expect(snapshot1.network[RequestType.License].maxAttempts).toBe(2);

      player.updateConfiguration({
        network: {
          [RequestType.License]: {
            maxAttempts: 1,
          },
        },
      });

      const snapshot2 = player.getConfigurationSnapshot();
      expectedEvents.push(new ConfigurationChangedEvent(snapshot2));
      expect(snapshot2.network[RequestType.License].maxAttempts).toBe(1);
      expect(snapshot1.network[RequestType.License].maxAttempts).toBe(2);
      expect(expectedEvents).toEqual(actualEvents);
    });
  });

  describe('resetConfiguration', () => {
    it('should reset configuration to defaults', () => {
      const expectedEvents: Array<ConfigurationChangedEvent> = [];
      const actualEvents: Array<ConfigurationChangedEvent> = [];

      player.addEventListener(Player.Event.ConfigurationChanged, (event) => {
        actualEvents.push(event);
      });

      const snapshot1 = player.getConfigurationSnapshot();
      expect(snapshot1.network[RequestType.License].maxAttempts).toBe(2);

      player.updateConfiguration({
        network: {
          [RequestType.License]: {
            maxAttempts: 1,
          },
        },
      });

      const snapshot2 = player.getConfigurationSnapshot();
      expectedEvents.push(new ConfigurationChangedEvent(snapshot2));
      expect(snapshot2.network[RequestType.License].maxAttempts).toBe(1);

      player.resetConfiguration();

      const snapshot3 = player.getConfigurationSnapshot();
      expectedEvents.push(new ConfigurationChangedEvent(snapshot3));
      expect(snapshot3.network[RequestType.License].maxAttempts).toBe(2);

      expect(expectedEvents).toEqual(actualEvents);
    });
  });

  describe('addEventListener', () => {
    it('should add new event listener for a specific type', () => {
      const expectedEvents = [
        new LoggerLevelChangedEvent(Player.LoggerLevel.Warn),
        new LoggerLevelChangedEvent(Player.LoggerLevel.Info),
        new VolumeChangedEvent(0.5),
      ];
      const actualEvents: Array<PlayerEvent> = [];

      player.addEventListener(Player.Event.LoggerLevelChanged, (event) => {
        actualEvents.push(event);
      });

      player.addEventListener(Player.Event.VolumeChanged, (event) => {
        actualEvents.push(event);
      });

      serviceLocator.eventEmitter.emitEvent(new LoggerLevelChangedEvent(Player.LoggerLevel.Warn));
      serviceLocator.eventEmitter.emitEvent(new LoggerLevelChangedEvent(Player.LoggerLevel.Info));
      serviceLocator.eventEmitter.emitEvent(new VolumeChangedEvent(0.5));
      serviceLocator.eventEmitter.emitEvent(new ConfigurationChangedEvent(player.getConfigurationSnapshot()));

      expect(expectedEvents).toEqual(actualEvents);
    });
  });

  describe('once', () => {
    it('should add new event listener for a specific type once', () => {
      const expectedEvents = [new LoggerLevelChangedEvent(Player.LoggerLevel.Warn)];
      const actualEvents: Array<PlayerEvent> = [];

      player.once(Player.Event.LoggerLevelChanged, (event) => {
        actualEvents.push(event);
      });

      serviceLocator.eventEmitter.emitEvent(new LoggerLevelChangedEvent(Player.LoggerLevel.Warn));
      serviceLocator.eventEmitter.emitEvent(new LoggerLevelChangedEvent(Player.LoggerLevel.Info));
      serviceLocator.eventEmitter.emitEvent(new VolumeChangedEvent(0.5));
      serviceLocator.eventEmitter.emitEvent(new ConfigurationChangedEvent(player.getConfigurationSnapshot()));

      expect(expectedEvents).toEqual(actualEvents);
    });
  });

  describe('removeEventListener', () => {
    it('should remove event listener for a specific type', () => {
      const expectedEvents = [new LoggerLevelChangedEvent(Player.LoggerLevel.Warn), new VolumeChangedEvent(0.5)];
      const actualEvents: Array<PlayerEvent> = [];

      const listener = (event: PlayerEvent): void => {
        actualEvents.push(event);
      };

      player.addEventListener(Player.Event.LoggerLevelChanged, listener);
      player.addEventListener(Player.Event.VolumeChanged, listener);

      serviceLocator.eventEmitter.emitEvent(new LoggerLevelChangedEvent(Player.LoggerLevel.Warn));

      player.removeEventListener(Player.Event.LoggerLevelChanged, listener);

      serviceLocator.eventEmitter.emitEvent(new LoggerLevelChangedEvent(Player.LoggerLevel.Info));
      serviceLocator.eventEmitter.emitEvent(new VolumeChangedEvent(0.5));

      player.removeEventListener(Player.Event.VolumeChanged, listener);

      serviceLocator.eventEmitter.emitEvent(new VolumeChangedEvent(0.6));

      serviceLocator.eventEmitter.emitEvent(new ConfigurationChangedEvent(player.getConfigurationSnapshot()));

      expect(expectedEvents).toEqual(actualEvents);
    });
  });

  describe('removeAllEventListenersForType', () => {
    it('should remove event listeners for a specific type', () => {
      const expectedEvents = [
        new LoggerLevelChangedEvent(Player.LoggerLevel.Info),
        new LoggerLevelChangedEvent(Player.LoggerLevel.Info),
        new LoggerLevelChangedEvent(Player.LoggerLevel.Info),
      ];
      const actualEvents: Array<PlayerEvent> = [];

      const listener1 = (event: PlayerEvent): void => {
        actualEvents.push(event);
      };

      const listener2 = (event: PlayerEvent): void => {
        actualEvents.push(event);
      };

      const listener3 = (event: PlayerEvent): void => {
        actualEvents.push(event);
      };

      player.addEventListener(Player.Event.LoggerLevelChanged, listener1);
      player.addEventListener(Player.Event.LoggerLevelChanged, listener2);
      player.addEventListener(Player.Event.LoggerLevelChanged, listener3);

      serviceLocator.eventEmitter.emitEvent(new LoggerLevelChangedEvent(Player.LoggerLevel.Info));

      player.removeAllEventListenersForType(Player.Event.LoggerLevelChanged);

      serviceLocator.eventEmitter.emitEvent(new LoggerLevelChangedEvent(Player.LoggerLevel.Info));
      serviceLocator.eventEmitter.emitEvent(new LoggerLevelChangedEvent(Player.LoggerLevel.Info));
      serviceLocator.eventEmitter.emitEvent(new LoggerLevelChangedEvent(Player.LoggerLevel.Info));

      expect(expectedEvents).toEqual(actualEvents);
    });
  });

  describe('removeAllEventListeners', () => {
    it('should remove all event listeners', () => {
      const expectedEvents = [new LoggerLevelChangedEvent(Player.LoggerLevel.Warn), new VolumeChangedEvent(0.5)];
      const actualEvents: Array<PlayerEvent> = [];

      const listener = (event: PlayerEvent): void => {
        actualEvents.push(event);
      };

      player.addEventListener(Player.Event.LoggerLevelChanged, listener);
      player.addEventListener(Player.Event.VolumeChanged, listener);

      serviceLocator.eventEmitter.emitEvent(new LoggerLevelChangedEvent(Player.LoggerLevel.Warn));
      serviceLocator.eventEmitter.emitEvent(new VolumeChangedEvent(0.5));

      player.removeAllEventListeners();

      serviceLocator.eventEmitter.emitEvent(new LoggerLevelChangedEvent(Player.LoggerLevel.Warn));
      serviceLocator.eventEmitter.emitEvent(new VolumeChangedEvent(0.5));

      expect(expectedEvents).toEqual(actualEvents);
    });
  });
});
