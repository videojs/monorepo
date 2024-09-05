import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Player } from '../src/index';
import Logger from '../src/lib/utils/logger';
import NetworkManager from '../src/lib/network/networkManager';
import type { PlayerEventTypeToEventMap } from '../src/lib/player/events/playerEventTypeToEventMap';
import EventEmitter from '../src/lib/utils/eventEmitter';
import ConfigurationManager from '../src/lib/player/configuration';

describe('Player', () => {
  let logger: Logger;
  let networkManager: NetworkManager;
  let videoElement: HTMLVideoElement;
  let eventEmitter: EventEmitter<PlayerEventTypeToEventMap>;
  let configurationManager: ConfigurationManager;
  let player: Player;

  beforeEach(() => {
    logger = new Logger(console, 'Player');
    networkManager = new NetworkManager({ logger });
    eventEmitter = new EventEmitter<PlayerEventTypeToEventMap>();
    configurationManager = new ConfigurationManager();
    videoElement = document.createElement('video');
    player = new Player({ logger, eventEmitter, networkManager, configurationManager });
  });

  describe('loggerLevel', () => {
    describe('setLoggerLevel', () => {
      it('should set logger level', () => {
        player.addEventListener(Player.Events.LoggerLevelChanged, (event) => {
          expect(event.type).toBe(Player.Events.LoggerLevelChanged);
          expect(event.level).toBe(Player.LoggerLevel.Info);
        });

        player.setLoggerLevel(Player.LoggerLevel.Info);
        expect(player.getLoggerLevel()).toBe(Player.LoggerLevel.Info);
      });
    });

    describe('getLoggerLevel', () => {
      it('should return default logger level', () => {
        const level = player.getLoggerLevel();
        expect(level).toBe(Player.LoggerLevel.Debug);
      });
    });
  });

  describe('volume', () => {
    describe('setVolumeLevel', () => {
      it('should log attempt message if video element is not attached', () => {
        const warnSpy = vi.spyOn(logger, 'warn');
        player.setVolumeLevel(0.5);
        expect(warnSpy).toHaveBeenNthCalledWith(
          1,
          'Attempt to call "setVolumeLevel", but no video element attached. Call "attach" first.'
        );
      });

      it('should set volume level on the attached video element', () => {
        player.addEventListener(Player.Events.VolumeChanged, (event) => {
          expect(event.type).toBe(Player.Events.VolumeChanged);
          expect(event.volume).toBe(0.5);
        });

        player.attach(videoElement);
        player.setVolumeLevel(0.5);
        expect(videoElement.volume).toBe(0.5);
      });

      it('should clamp value to 1 if provided value is more than 1', () => {
        const warnSpy = vi.spyOn(logger, 'warn');
        player.attach(videoElement);
        player.setVolumeLevel(2);
        expect(videoElement.volume).toBe(1);
        expect(warnSpy).toHaveBeenNthCalledWith(
          1,
          'Volume level should be in range [0, 1]. Received: 2. Value is clamped to 1.'
        );
      });

      it('should clamp value to 0 if provided value is more less than 0', () => {
        const warnSpy = vi.spyOn(logger, 'warn');
        player.attach(videoElement);
        player.setVolumeLevel(-1);
        expect(videoElement.volume).toBe(0);
        expect(warnSpy).toHaveBeenNthCalledWith(
          1,
          'Volume level should be in range [0, 1]. Received: -1. Value is clamped to 0.'
        );
      });
    });

    describe('getVolumeLevel', () => {
      it('should log attempt message if video element is not attached and return fallback', () => {
        const warnSpy = vi.spyOn(logger, 'warn');
        const level = player.getVolumeLevel();
        expect(level).toBe(0);
        expect(warnSpy).toHaveBeenNthCalledWith(
          1,
          'Attempt to call "getVolumeLevel", but no video element attached. Call "attach" first.'
        );
      });

      it('should return default value', () => {
        player.attach(videoElement);
        const level = player.getVolumeLevel();
        expect(level).toBe(1);
      });
    });
  });

  describe('mute/unmute', () => {
    describe('getIsMuted', () => {
      it('should log attempt message if video element is not attached and return fallback', () => {
        const warnSpy = vi.spyOn(logger, 'warn');
        const isMuted = player.getIsMuted();
        expect(isMuted).toBe(false);
        expect(warnSpy).toHaveBeenNthCalledWith(
          1,
          'Attempt to call "getIsMuted", but no video element attached. Call "attach" first.'
        );
      });

      it('should return default value', () => {
        player.attach(videoElement);
        expect(player.getIsMuted()).toBe(false);
      });
    });

    describe('mute', () => {
      it('should log attempt message if video element is not attached', () => {
        const warnSpy = vi.spyOn(logger, 'warn');
        player.mute();
        expect(warnSpy).toHaveBeenNthCalledWith(
          1,
          'Attempt to call "mute", but no video element attached. Call "attach" first.'
        );
      });

      it('should mute player', () => {
        player.addEventListener(Player.Events.MutedStatusChanged, (event) => {
          expect(event.type).toBe(Player.Events.MutedStatusChanged);
          expect(event.isMuted).toBe(true);
        });
        player.attach(videoElement);
        player.mute();
        expect(player.getIsMuted()).toBe(true);
      });
    });

    describe('unmute', () => {
      it('should log attempt message if video element is not attached', () => {
        const warnSpy = vi.spyOn(logger, 'warn');
        player.unmute();
        expect(warnSpy).toHaveBeenNthCalledWith(
          1,
          'Attempt to call "unmute", but no video element attached. Call "attach" first.'
        );
      });

      it('should unmute player', () => {
        player.attach(videoElement);
        player.mute();
        expect(player.getIsMuted()).toBe(true);
        player.addEventListener(Player.Events.MutedStatusChanged, (event) => {
          expect(event.type).toBe(Player.Events.MutedStatusChanged);
          expect(event.isMuted).toBe(false);
        });
        player.unmute();
        expect(player.getIsMuted()).toBe(false);
      });
    });
  });
});
