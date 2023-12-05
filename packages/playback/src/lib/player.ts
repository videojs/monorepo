import type { PlayerConfiguration } from './configuration';
import Logger, { LoggerLevel } from './utils/logger';
import { createDefaultConfiguration } from './configuration';
import type { Callback } from './utils/eventEmitter';
import EventEmitter from './utils/eventEmitter';

import {
  Events,
  EnterPictureInPictureModeEvent,
  LeavePictureInPictureModeEvent,
  ErrorEvent,
  VolumeChangedEvent,
  LoggerLevelChangedEvent,
  MutedStatusChangedEvent,
} from './events';
import type { EventToTypeMap } from './events';
import type Pipeline from './pipelines/basePipeline';
import NativePipeline from './pipelines/native/nativePipeline';
import { NoSupportedPipelineError } from './errors';
import type NetworkManager from './networkManager';
import { RequestType } from './networkManager';
import PlayerTimeRange from './utils/timeRanges';

enum PlaybackState {
  Playing = 'Playing',
  Paused = 'Paused',
  Buffering = 'Buffering',
  Idle = 'Idle',
}

// TODO: text tracks
interface PlayerTextTrack {}

// TODO: audio tracks
interface PlayerAudioTrack {}

// TODO: image tracks
interface PlayerImageTrack {}

// TODO video tracks (quality levels)
interface PlayerVideoTrack {}

// TODO player stats
interface PlayerStats {}

interface PlayerDependencies {
  logger: Logger;
  eventEmitter: EventEmitter<EventToTypeMap>;
}

export default class Player {
  public static readonly Events = Events;

  public static readonly RequestType = RequestType;

  public static readonly LoggerLevel = LoggerLevel;

  public static createPlayer(): Player {
    const logger = new Logger(console, 'Player');
    const eventEmitter = new EventEmitter<EventToTypeMap>();

    return new Player({
      logger,
      eventEmitter,
    });
  }

  private readonly logger: Logger;
  private readonly eventEmitter: EventEmitter<EventToTypeMap>;

  private videoElement: HTMLVideoElement | null = null;
  private pictureInPictureWindow: PictureInPictureWindow | null = null;
  private configuration: PlayerConfiguration = createDefaultConfiguration();
  private playbackState: PlaybackState = PlaybackState.Idle;

  private readonly mimeTypeToPipelineMap = new Map<string, Pipeline>();
  private readonly protocolToNetworkManagerMap = new Map<string, NetworkManager>();

  public constructor(dependencies: PlayerDependencies) {
    this.logger = dependencies.logger;
    this.eventEmitter = dependencies.eventEmitter;
  }

  public registerPipeline(mimeType: string, pipeline: Pipeline): void {
    if (this.mimeTypeToPipelineMap.has(mimeType)) {
      this.logger.warn(`Overriding existing pipeline for "${mimeType}" mimeType.`);
    }

    this.mimeTypeToPipelineMap.set(mimeType, pipeline);
  }

  public registerNetworkManager(protocol: string, networkManager: NetworkManager): void {
    if (this.protocolToNetworkManagerMap.has(protocol)) {
      this.logger.warn(`Overriding existing networkManager for "${protocol}" protocol.`);
    }

    this.protocolToNetworkManagerMap.set(protocol, networkManager);
  }

  public getPipelineForMimeType(mimeType: string): Pipeline | undefined {
    return this.mimeTypeToPipelineMap.get(mimeType);
  }

  public getNetworkManagerForProtocol(protocol: string): NetworkManager | undefined {
    return this.protocolToNetworkManagerMap.get(protocol);
  }

  public getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  public getConfiguration(): PlayerConfiguration {
    return structuredClone(this.configuration);
  }

  public getLoggerLevel(): LoggerLevel {
    return this.logger.getLoggerLevel();
  }

  public getPlaybackState(): PlaybackState {
    return this.playbackState;
  }

  public getVolumeLevel(): number {
    return this.safeAttemptOnVideoElement('getVolumeLevel', (videoElement) => videoElement.volume, 0);
  }

  public getPlaybackRate(): number {
    return this.safeAttemptOnVideoElement('getPlaybackRate', (videoElement) => videoElement.playbackRate, 0);
  }

  public getCurrentTime(): number {
    return this.safeAttemptOnVideoElement('getCurrentTime', (videoElement) => videoElement.currentTime, 0);
  }

  public setPlaybackRate(rate: number): void {
    return this.safeAttemptOnVideoElement(
      'setPlaybackRate',
      (videoElement) => void (videoElement.playbackRate = rate),
      undefined
    );
  }

  public setVolumeLevel(volumeLevel: number): void {
    let level: number;

    if (volumeLevel > 1) {
      level = 1;
      this.logger.warn(`Volume level should be in range [0, 1]. Received: ${volumeLevel}. Value is clamped to 1.`);
    } else if (volumeLevel < 0) {
      level = 0;
      this.logger.warn(`Volume level should be in range [0, 1]. Received: ${volumeLevel}. Value is clamped to 0.`);
    } else {
      level = volumeLevel;
    }

    // console.log('level: ', level);

    return this.safeAttemptOnVideoElement(
      'setVolumeLevel',
      (videoElement) => void (videoElement.volume = level),
      undefined
    );
  }

  public seek(seekTarget: number): void {
    return this.safeAttemptOnVideoElement(
      'seek',
      (videoElement) => {
        const seekableRanges = this.getSeekableRanges();
        const isValidSeekTarget = seekableRanges.some((timeRange) => timeRange.isInRangeInclusive(seekTarget));

        if (!isValidSeekTarget) {
          this.logger.warn(
            `provided seek target (${seekTarget}) is out of available seekable time ranges: `,
            seekableRanges
          );
          return;
        }

        videoElement.currentTime = seekTarget;
        // TODO: should we interact with pipeline here? Or "seeking" event will be enough
      },
      undefined
    );
  }

  public getSeekableRanges(): Array<PlayerTimeRange> {
    return this.safeAttemptOnVideoElement(
      'getSeekableRanges',
      (videoElement) => PlayerTimeRange.fromTimeRanges(videoElement.seekable),
      [] as Array<PlayerTimeRange>
    );
  }

  public getBufferedRanges(): Array<PlayerTimeRange> {
    return this.safeAttemptOnVideoElement(
      'getBufferedRanges',
      (videoElement) => PlayerTimeRange.fromTimeRanges(videoElement.buffered),
      [] as Array<PlayerTimeRange>
    );
  }

  public getTextTracks(): Array<PlayerTextTrack> {
    // TODO: should be from the current pipeline
    return [];
  }

  public getAudioTracks(): Array<PlayerAudioTrack> {
    // TODO: should be from the current pipeline
    return [];
  }

  public getImageTracks(): Array<PlayerImageTrack> {
    // TODO: should be from the current pipeline
    return [];
  }

  public getVideoTracks(): Array<PlayerVideoTrack> {
    // TODO: should be from the current pipeline
    return [];
  }

  public getStats(): PlayerStats {
    // TODO: should be from the current pipeline
    return {};
  }

  public selectVideoTrack(): void {
    // TODO: forward to the current pipeline
    // TODO: we should disable abr here, if it is not "auto" (probably should be separate method)
  }

  public selectImageTrack(): void {
    // TODO: forward to the current pipeline
  }

  public selectAudioTrack(): void {
    // TODO: forward to the current pipeline
  }

  public selectTextTrack(): void {
    // TODO: forward to the current pipeline
  }

  public mute(): void {
    return this.safeAttemptOnVideoElement(
      'mute',
      (videoElement) => {
        const isMuted = videoElement.muted;

        if (isMuted) {
          //already muted
          return;
        }

        videoElement.muted = true;
        this.eventEmitter.emit(Events.MutedStatusChanged, new MutedStatusChangedEvent(true));
      },
      undefined
    );
  }

  public unmute(): void {
    return this.safeAttemptOnVideoElement(
      'unmute',
      (videoElement) => {
        const isMuted = videoElement.muted;

        if (!isMuted) {
          // already un-muted
          return;
        }

        videoElement.muted = false;
        this.eventEmitter.emit(Events.MutedStatusChanged, new MutedStatusChangedEvent(false));
      },
      undefined
    );
  }

  public getIsMuted(): boolean {
    return this.safeAttemptOnVideoElement('getIsMuted', (videoElement) => videoElement.muted, false);
  }

  public setLoggerLevel(level: LoggerLevel): void {
    this.logger.setLoggerLevel(level);
    this.eventEmitter.emit(Events.LoggerLevelChanged, new LoggerLevelChangedEvent(this.getLoggerLevel()));
  }

  public addEventListener<K extends keyof EventToTypeMap>(event: K, callback: Callback<EventToTypeMap[K]>): void {
    return this.eventEmitter.on(event, callback);
  }

  public once<K extends keyof EventToTypeMap>(event: K, callback: Callback<EventToTypeMap[K]>): void {
    return this.eventEmitter.once(event, callback);
  }

  public removeEventListener<K extends keyof EventToTypeMap>(event: K, callback: Callback<EventToTypeMap[K]>): void {
    return this.eventEmitter.off(event, callback);
  }

  public removeAllEventListenersForType<K extends keyof EventToTypeMap>(event: K): void {
    return this.eventEmitter.offAllFor(event);
  }

  public removeAllEventListeners(): void {
    return this.eventEmitter.reset();
  }

  public readonly on = this.addEventListener;

  public readonly off = this.removeEventListener;

  public play(): void {
    if (this.videoElement === null) {
      return this.warnAttempt('play');
    }

    this.videoElement.play().catch((reason) => {
      // TODO: should we fallback to mute?
      this.logger.warn('player request was unsuccessful. Reason: ', reason);
    });
  }

  public pause(): void {
    if (this.videoElement === null) {
      return this.warnAttempt('pause');
    }

    this.videoElement.pause();
  }

  public requestPictureInPicture(): void {
    if (this.videoElement === null) {
      return this.warnAttempt('requestPictureInPicture');
    }

    if (!window.document.pictureInPictureEnabled) {
      return this.logger.warn(
        'User agent does not support pictureInPicture. document.pictureInPictureEnabled is false.'
      );
    }

    if (this.videoElement.disablePictureInPicture) {
      return this.logger.warn(
        'pictureInPicture is disabled for this videoElement. Set videoElement.disablePictureInPicture to false to enable pictureInPicture'
      );
    }

    if (this.getIsInPictureInPictureMode()) {
      return this.logger.warn('This videoElement is already in pictureInPicture mode.');
    }

    this.videoElement
      .requestPictureInPicture()
      .then((pictureInPictureWindow) => {
        this.pictureInPictureWindow = pictureInPictureWindow;

        this.pictureInPictureWindow.addEventListener('resize', this.handlePictureAndPictureSize);
        this.handlePictureAndPictureSize();
      })
      .catch((error) => {
        this.logger.warn('pictureInPicture request failed, see reason: ', error);
      });
  }

  public getIsInPictureInPictureMode(): boolean {
    return this.videoElement !== null && window.document.pictureInPictureElement === this.videoElement;
  }

  private readonly handlePictureAndPictureSize = (): void => {
    // probably report to abr:
    // this.pictureInPictureWindow.width
    // this.pictureInPictureWindow.height
  };

  public exitPictureInPicture(): void {
    if (this.videoElement === null) {
      return this.warnAttempt('exitPictureInPicture');
    }

    if (!this.getIsInPictureInPictureMode()) {
      return this.logger.warn('current video element is not in pictureInPicture mode.');
    }

    this.pictureInPictureWindow?.removeEventListener('resize', this.handlePictureAndPictureSize);
    this.pictureInPictureWindow = null;

    window.document.exitPictureInPicture().catch((error) => {
      this.logger.warn('exitPictureInPicture request failed, see reason: ', error);
    });
  }

  public attach(videoElement: HTMLVideoElement): void {
    if (this.videoElement !== null) {
      this.detach();
    }

    this.videoElement = videoElement;

    this.videoElement.addEventListener('volumechange', this.handleVolumeChange);
    this.videoElement.addEventListener('leavepictureinpicture', this.handleLevePictureInPicture);
    this.videoElement.addEventListener('enterpictureinpicture', this.handleEnterPictureInPicture);
  }

  public detach(): void {
    if (this.videoElement === null) {
      return this.logger.warn('video element is already detached');
    }

    if (this.getIsInPictureInPictureMode()) {
      this.exitPictureInPicture();
    }

    this.videoElement.removeEventListener('volumechange', this.handleVolumeChange);
    this.videoElement.removeEventListener('leavepictureinpicture', this.handleLevePictureInPicture);
    this.videoElement.removeEventListener('enterpictureinpicture', this.handleEnterPictureInPicture);

    this.videoElement = null;
  }

  private readonly handleVolumeChange = (event: Event): void => {
    const target = event.target as HTMLVideoElement;
    this.eventEmitter.emit(Events.VolumeChanged, new VolumeChangedEvent(target.volume));
  };

  private readonly handleEnterPictureInPicture = (): void => {
    this.eventEmitter.emit(Events.EnterPictureInPictureMode, new EnterPictureInPictureModeEvent());
  };

  private readonly handleLevePictureInPicture = (): void => {
    this.eventEmitter.emit(Events.LeavePictureInPictureMode, new LeavePictureInPictureModeEvent());
  };

  public configure(receivedConfigChunk: Partial<PlayerConfiguration>): void {
    return this.deepCloneForConfiguration(receivedConfigChunk, this.configuration as Record<string, unknown>, '');
  }

  private deepCloneForConfiguration(
    received: Record<string, unknown>,
    current: Record<string, unknown>,
    path: string
  ): void {
    for (const key in received) {
      if (!Object.hasOwn(received, key)) {
        continue;
      }

      if (!Object.hasOwn(current, key)) {
        this.logger.warn(`Skipping setting ${path}${key}. Reason: Unsupported setting.`);
        continue;
      }

      const receivedValue = received[key];
      const currentValue = current[key];

      if (typeof receivedValue !== typeof currentValue) {
        this.logger.warn(
          `Skipping setting ${path}${key}. Reason: Type does not match. Received: ${typeof receivedValue}. Required: ${typeof currentValue}.`
        );
        continue;
      }

      const isNested = typeof receivedValue === 'object' && receivedValue !== null && !Array.isArray(receivedValue);

      if (isNested) {
        this.deepCloneForConfiguration(
          receivedValue as Record<string, unknown>,
          currentValue as Record<string, unknown>,
          `${path}${key}.`
        );
      }

      current[key] = structuredClone(receivedValue);
    }
  }

  public resetConfiguration(): void {
    this.configuration = createDefaultConfiguration();
  }

  public dispose(): void {
    this.detach();
    this.removeAllEventListeners();
    // TODO
  }

  public loadRemoteAsset(uri: URL, mimeType: string): void {
    if (this.videoElement === null) {
      return this.warnAttempt('loadRemoteAsset');
    }

    return this.load(mimeType, (pipeline) => pipeline.loadRemoteAsset(uri));
  }

  public loadLocalAsset(asset: string | ArrayBuffer, mimeType: string): void {
    if (this.videoElement === null) {
      return this.warnAttempt('loadLocalAsset');
    }

    return this.load(mimeType, (pipeline) => pipeline.loadLocalAsset(asset));
  }

  private load(mimeType: string, pipelineHandler: (pipeline: Pipeline) => void): void {
    let pipeline = this.mimeTypeToPipelineMap.get(mimeType);

    if (!pipeline && this.videoElement?.canPlayType(mimeType)) {
      pipeline = new NativePipeline();
    }

    if (pipeline) {
      pipeline.setMapProtocolToNetworkManager(this.protocolToNetworkManagerMap);
      return pipelineHandler(pipeline);
    }

    this.logger.warn('no supported pipelines found for ', mimeType);

    this.eventEmitter.emit(Events.Error, new ErrorEvent(new NoSupportedPipelineError()));
  }

  private safeAttemptOnVideoElement<T>(
    methodName: string,
    executor: (videoElement: HTMLVideoElement) => T,
    fallback: T
  ): T {
    if (this.videoElement === null) {
      this.warnAttempt(methodName);
      return fallback;
    }

    return executor(this.videoElement);
  }

  private warnAttempt(method: string): void {
    this.logger.warn(`Attempt to call "${method}", but no video element attached. Call "attach" first.`);
  }
}
