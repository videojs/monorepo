import { beforeEach, describe, expect, it } from 'vitest';
import { Player } from '../../../src/lib/player/player';
import {
  ConfigurationChangedEvent,
  LoggerLevelChangedEvent,
  VolumeChangedEvent,
} from '../../../src/lib/events/player-events';
import type { PlayerEvent } from '../../../src/lib/events/base-player-event';
import { RequestType } from '../../../src/lib/consts/request-type';
import { ServiceLocator } from '../../../src/lib/service-locator';
import { PlaybackState } from '../../../src/lib/consts/playback-state';

describe('Player spec', () => {
  let player: Player;
  let serviceLocator: ServiceLocator;

  beforeEach(() => {
    serviceLocator = new ServiceLocator();
    player = new Player(serviceLocator);
  });

  describe('getLoggerLevel', () => {
    it('should return current logger level', () => {
      expect(player.getLoggerLevel()).toBe(Player.LoggerLevel.Debug);
    });
  });

  describe('setLoggerLevel', () => {
    it('should set logger level', () => {
      const expectedEvents = [
        new LoggerLevelChangedEvent(Player.LoggerLevel.Info),
        new LoggerLevelChangedEvent(Player.LoggerLevel.Warn),
      ];

      const actualEvents: Array<LoggerLevelChangedEvent> = [];

      player.addEventListener(Player.EventType.LoggerLevelChanged, (event) => {
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

      expect(snapshot1).not.toBe(snapshot2);
    });
  });

  describe('updateConfiguration', () => {
    it('should update current player configuration', () => {
      const expectedEvents: Array<ConfigurationChangedEvent> = [];
      const actualEvents: Array<ConfigurationChangedEvent> = [];

      player.addEventListener(Player.EventType.ConfigurationChanged, (event) => {
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

      player.addEventListener(Player.EventType.ConfigurationChanged, (event) => {
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

      player.addEventListener(Player.EventType.LoggerLevelChanged, (event) => {
        actualEvents.push(event);
      });

      player.addEventListener(Player.EventType.VolumeChanged, (event) => {
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

      player.once(Player.EventType.LoggerLevelChanged, (event) => {
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

      player.addEventListener(Player.EventType.LoggerLevelChanged, listener);
      player.addEventListener(Player.EventType.VolumeChanged, listener);

      serviceLocator.eventEmitter.emitEvent(new LoggerLevelChangedEvent(Player.LoggerLevel.Warn));

      player.removeEventListener(Player.EventType.LoggerLevelChanged, listener);

      serviceLocator.eventEmitter.emitEvent(new LoggerLevelChangedEvent(Player.LoggerLevel.Info));
      serviceLocator.eventEmitter.emitEvent(new VolumeChangedEvent(0.5));

      player.removeEventListener(Player.EventType.VolumeChanged, listener);

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

      player.addEventListener(Player.EventType.LoggerLevelChanged, listener1);
      player.addEventListener(Player.EventType.LoggerLevelChanged, listener2);
      player.addEventListener(Player.EventType.LoggerLevelChanged, listener3);

      serviceLocator.eventEmitter.emitEvent(new LoggerLevelChangedEvent(Player.LoggerLevel.Info));

      player.removeAllEventListenersForType(Player.EventType.LoggerLevelChanged);

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

      player.addEventListener(Player.EventType.LoggerLevelChanged, listener);
      player.addEventListener(Player.EventType.VolumeChanged, listener);

      serviceLocator.eventEmitter.emitEvent(new LoggerLevelChangedEvent(Player.LoggerLevel.Warn));
      serviceLocator.eventEmitter.emitEvent(new VolumeChangedEvent(0.5));

      player.removeAllEventListeners();

      serviceLocator.eventEmitter.emitEvent(new LoggerLevelChangedEvent(Player.LoggerLevel.Warn));
      serviceLocator.eventEmitter.emitEvent(new VolumeChangedEvent(0.5));

      expect(expectedEvents).toEqual(actualEvents);
    });
  });

  describe('state', () => {
    it('should transition to playing', () => {
      player.play();
      expect(player.getPlaybackState()).toEqual(PlaybackState.Playing);
    });

    it('should transition to paused', () => {
      player.pause();
      expect(player.getPlaybackState()).toEqual(PlaybackState.Paused);
    });

    it('should transition to buffering', () => {
      // cast as any to call handleWaiting directly.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (player as any).handleWaiting_();
      expect(player.getPlaybackState()).toEqual(PlaybackState.Buffering);
    });
  });
});
