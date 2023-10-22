import type { PlayerConfiguration } from './configuration.ts';
import { LoggerLevel } from '../utils/logger.ts';
import Logger from '../utils/logger.ts';
import { getDefaultPlayerConfiguration } from './configuration.ts';
import EventEmitter from '../utils/eventEmitter.ts';

import { Events, EnterPictureInPictureModeEvent, LeavePictureInPictureModeEvent, ErrorEvent } from './events.ts';
import type { EventToTypeMap } from './events.ts';
import type Pipeline from '@/pipelines/basePipeline.ts';
import NativePipeline from '@/pipelines/native/nativePipeline.ts';
import { NoSupportedPipelineError } from '@/player/errors.ts';
import NetworkManager, { RequestType } from '@/player/networkManager.ts';

enum PlaybackState {
  Playing = 'Playing',
  Paused = 'Paused',
  Buffering = 'Buffering',
  Idle = 'Idle',
}

interface PlayerTimeRange {
  start: number;
  end: number;
  isInRange: (time: number) => boolean;
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

export default class Player {
  private static readonly pipelinesMap = new Map<string, Pipeline>();

  public static readonly Events = Events;

  public static readonly RequestType = RequestType;

  public static readonly LoggerLevel = LoggerLevel;

  public static registerPipeline(mimeType: string, pipeline: Pipeline): void {
    Player.pipelinesMap.set(mimeType, pipeline);
  }

  private videoElement: HTMLVideoElement | null = null;
  private pictureInPictureWindow: PictureInPictureWindow | null = null;
  private configuration: PlayerConfiguration = getDefaultPlayerConfiguration();
  private playbackState: PlaybackState = PlaybackState.Idle;

  private readonly logger = new Logger(console, 'Player');
  private readonly eventEmitter = new EventEmitter<EventToTypeMap>();
  private readonly networkManager: NetworkManager = new NetworkManager(this.logger);

  public getNetworkManager(): NetworkManager {
    return this.networkManager;
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
    if (this.videoElement === null) {
      this.warnAttempt('getVolumeLevel');
      return 0;
    }

    return this.videoElement.volume;
  }

  public getPlaybackRate(): number {
    if (this.videoElement === null) {
      this.warnAttempt('getPlaybackRate');
      return 0;
    }

    return this.videoElement.playbackRate;
  }

  public getCurrentTime(): number {
    if (this.videoElement === null) {
      this.warnAttempt('getCurrentTime');
      return 0;
    }

    return this.videoElement.currentTime;
  }

  public setPlaybackRate(rate: number): void {
    if (this.videoElement === null) {
      return this.warnAttempt('setPlaybackRate');
    }

    this.videoElement.playbackRate = rate;
  }

  public setVolumeLevel(volumeLevel: number): void {
    if (this.videoElement === null) {
      return this.warnAttempt('setVolumeLevel');
    }

    if (volumeLevel > 1 || volumeLevel < 0) {
      this.logger.warn('volume level should in range [0, 1]. received: ', volumeLevel);
    }

    this.videoElement.volume = volumeLevel;
  }

  public seek(seekTarget: number): void {
    if (this.videoElement === null) {
      return this.warnAttempt('seek');
    }

    const isValidSeekTarget = this.getSeekableRanges().some((timeRange) => timeRange.isInRange(seekTarget));

    if (!isValidSeekTarget) {
      return this.logger.warn('provided seek target is out of available seekable time ranges');
    }

    this.videoElement.currentTime = seekTarget;
    // TODO: should we interact with pipeline here? Or "seeking" event will be enough
  }

  public getSeekableRanges(): Array<PlayerTimeRange> {
    // TODO: should be from the current pipeline
    return [];
  }

  public getBuffered(): Array<PlayerTimeRange> {
    // TODO: should be from the current pipeline
    return [];
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
    if (this.videoElement === null) {
      return this.warnAttempt('mute');
    }

    this.videoElement.muted = true;
  }

  public unmute(): void {
    if (this.videoElement === null) {
      return this.warnAttempt('unmute');
    }

    this.videoElement.muted = false;
  }

  public getIsMuted(): boolean {
    if (this.videoElement === null) {
      this.warnAttempt('getIsMuted');
      return false;
    }

    return this.videoElement.muted;
  }

  public setLoggerLevel(level: LoggerLevel): void {
    return this.logger.setLoggerLevel(level);
  }

  public readonly addEventListener = this.eventEmitter.on.bind(this.eventEmitter);

  public readonly removeEventListener = this.eventEmitter.off.bind(this.eventEmitter);

  public readonly removeAllEventListeners = this.eventEmitter.reset.bind(this.eventEmitter);

  public readonly removeAllEventListenersForType = this.eventEmitter.offAllFor.bind(this.eventEmitter);

  public readonly once = this.eventEmitter.once.bind(this.eventEmitter);

  public readonly on = this.addEventListener;

  public readonly off = this.removeEventListener;

  private warnAttempt(method: string): void {
    this.logger.warn(`Attempt to call "${method}", but no video element attached. Call "attach" first.`);
  }

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

    this.videoElement.addEventListener('leavepictureinpicture', this.handleLevePictureInPicture);
    this.videoElement.addEventListener('enterpictureinpicture', this.handleEnterPictureInPicture);

    this.videoElement = null;
  }

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
    this.configuration = getDefaultPlayerConfiguration();
  }

  public dispose(): void {
    // TODO
  }

  private load(mimeType: string, pipelineHandler: (pipeline: Pipeline) => void): void {
    const pipeline = Player.pipelinesMap.get(mimeType);

    if (pipeline) {
      return pipelineHandler(pipeline);
    }

    if (this.videoElement?.canPlayType(mimeType)) {
      return pipelineHandler(new NativePipeline());
    }

    this.logger.warn('no supported pipelines found for ', mimeType);

    this.eventEmitter.emit(Events.Error, new ErrorEvent(new NoSupportedPipelineError()));
  }

  public loadRemoteAsset(uri: string, mimeType: string): void {
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
}
