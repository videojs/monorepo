import { describe, it, expect, beforeEach } from '@jest/globals';
import { Player } from '../src/player';
import Logger from '../src/lib/utils/logger';
import NetworkManager from '../src/lib/network/networkManager';
import type { PlayerEventTypeToEventMap } from '../src/lib/player/events/PlayerEventTypeToEventMap';
import EventEmitter from '../src/lib/utils/eventEmitter';
import { DashPipeline, HlsPipeline } from '../src/lib/pipelines/mse';

describe('Player', () => {
  let logger: Logger;
  let networkManager: NetworkManager;
  let videoElement: HTMLVideoElement;
  let dashPipeline: DashPipeline;
  let hlsPipeline: HlsPipeline;
  let eventEmitter: EventEmitter<PlayerEventTypeToEventMap>;
  let player: Player;

  beforeEach(() => {
    logger = new Logger(console, 'Player');
    networkManager = new NetworkManager(logger);
    eventEmitter = new EventEmitter<PlayerEventTypeToEventMap>();
    videoElement = document.createElement('video');
    dashPipeline = new DashPipeline();
    hlsPipeline = new HlsPipeline();
    player = new Player({ logger, eventEmitter });
  });

  describe('registerPipeline', () => {
    it('should register a new pipeline', () => {
      player.registerPipeline('application/dash+xml', dashPipeline);
      player.registerPipeline('application/x-mpegurl', hlsPipeline);
      expect(player.getPipelineForMimeType('application/dash+xml')).toBe(dashPipeline);
      expect(player.getPipelineForMimeType('application/x-mpegurl')).toBe(hlsPipeline);
      expect(player.getPipelineForMimeType('application/custom')).toBe(undefined);
    });

    it('should log warn if pipeline with provided mimetype already exists', () => {
      const warnSpy = jest.spyOn(logger, 'warn');
      player.registerPipeline('application/dash+xml', dashPipeline);
      player.registerPipeline('application/dash+xml', dashPipeline);
      expect(warnSpy).toHaveBeenNthCalledWith(1, 'Overriding existing pipeline for "application/dash+xml" mimeType.');
    });
  });

  describe('registerNetworkManager', () => {
    it('should register a new networkManager', () => {
      player.registerNetworkManager('http', networkManager);
      player.registerNetworkManager('https', networkManager);
      expect(player.getNetworkManagerForProtocol('http')).toBe(networkManager);
      expect(player.getNetworkManagerForProtocol('https')).toBe(networkManager);
      expect(player.getNetworkManagerForProtocol('custom')).toBe(undefined);
    });

    it('should log warn if networkManager with provided protocol already exists', () => {
      const warnSpy = jest.spyOn(logger, 'warn');
      player.registerNetworkManager('http', networkManager);
      player.registerNetworkManager('http', networkManager);
      expect(warnSpy).toHaveBeenNthCalledWith(1, 'Overriding existing networkManager for "http" protocol.');
    });
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
        const warnSpy = jest.spyOn(logger, 'warn');
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
        const warnSpy = jest.spyOn(logger, 'warn');
        player.attach(videoElement);
        player.setVolumeLevel(2);
        expect(videoElement.volume).toBe(1);
        expect(warnSpy).toHaveBeenNthCalledWith(
          1,
          'Volume level should be in range [0, 1]. Received: 2. Value is clamped to 1.'
        );
      });

      it('should clamp value to 0 if provided value is more less than 0', () => {
        const warnSpy = jest.spyOn(logger, 'warn');
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
        const warnSpy = jest.spyOn(logger, 'warn');
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
        const warnSpy = jest.spyOn(logger, 'warn');
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
        const warnSpy = jest.spyOn(logger, 'warn');
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
        const warnSpy = jest.spyOn(logger, 'warn');
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
