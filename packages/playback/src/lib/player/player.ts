import type { PlayerConfiguration, PlayerConfigurationChunk } from './configuration';
import Logger, { LoggerLevel } from '../utils/logger';
import ConfigurationManager from './configuration';
import type { Callback } from '../utils/eventEmitter';
import EventEmitter from '../utils/eventEmitter';
import { Events } from './consts/events';
import NetworkManager, { RequestType } from '../network/networkManager';
import type Pipeline from '../pipelines/basePipeline';
import PlayerTimeRange from '../utils/timeRanges';
import {
  EnterPictureInPictureModeEvent,
  LeavePictureInPictureModeEvent,
  LoggerLevelChangedEvent,
  MutedStatusChangedEvent,
  VolumeChangedEvent,
  ErrorEvent,
} from './events/playerEvents';
import NativePipeline from '../pipelines/native/nativePipeline';
import { NoSupportedPipelineError } from './errors/pipelinePlayerErrors';
import type { PlayerEventTypeToEventMap } from './events/playerEventTypeToEventMap';

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
  configurationManager: ConfigurationManager;
  networkManager: NetworkManager;
  eventEmitter: EventEmitter<PlayerEventTypeToEventMap>;
}

export default class Player {
  public static readonly Events = Events;

  public static readonly RequestType = RequestType;

  public static readonly LoggerLevel = LoggerLevel;

  public static create(): Player {
    const logger = new Logger(console, 'Player');
    const networkManager = new NetworkManager({ logger: logger.createSubLogger('NetworkManager') });
    const eventEmitter = new EventEmitter<PlayerEventTypeToEventMap>();
    const configurationManager = new ConfigurationManager();

    return new Player({ logger, eventEmitter, configurationManager, networkManager });
  }

  private readonly logger: Logger;
  private readonly configurationManager: ConfigurationManager;
  private readonly eventEmitter: EventEmitter<PlayerEventTypeToEventMap>;

  private networkManager: NetworkManager;
  private videoElement: HTMLVideoElement | null = null;
  private pictureInPictureWindow: PictureInPictureWindow | null = null;
  private playbackState: PlaybackState = PlaybackState.Idle;

  private readonly mimeTypeToPipelineMap = new Map<string, Pipeline>();

  public constructor(dependencies: PlayerDependencies) {
    this.logger = dependencies.logger;
    this.configurationManager = dependencies.configurationManager;
    this.networkManager = dependencies.networkManager;
    this.eventEmitter = dependencies.eventEmitter;
  }

  public registerPipeline(mimeType: string, pipeline: Pipeline): void {
    if (this.mimeTypeToPipelineMap.has(mimeType)) {
      this.logger.warn(`Overriding existing pipeline for "${mimeType}" mimeType.`);
    }

    this.mimeTypeToPipelineMap.set(mimeType, pipeline);
  }

  public getPipelineForMimeType(mimeType: string): Pipeline | undefined {
    return this.mimeTypeToPipelineMap.get(mimeType);
  }

  public getNetworkManager(): NetworkManager {
    return this.networkManager;
  }

  public setNetworkManager(networkManager: NetworkManager): void {
    this.networkManager = networkManager;
  }

  public getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  public getConfiguration(): PlayerConfiguration {
    return this.configurationManager.getConfiguration();
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

    return this.safeVoidAttemptOnVideoElement('setVolumeLevel', (videoElement) => void (videoElement.volume = level));
  }

  public getPlaybackRate(): number {
    return this.safeAttemptOnVideoElement('getPlaybackRate', (videoElement) => videoElement.playbackRate, 0);
  }

  public setPlaybackRate(rate: number): void {
    return this.safeVoidAttemptOnVideoElement('setPlaybackRate', (videoElement) => (videoElement.playbackRate = rate));
  }

  public getCurrentTime(): number {
    return this.safeAttemptOnVideoElement('getCurrentTime', (videoElement) => videoElement.currentTime, 0);
  }

  public seek(seekTarget: number): void {
    return this.safeVoidAttemptOnVideoElement('seek', (videoElement) => {
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
    });
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
    return this.safeVoidAttemptOnVideoElement('mute', (videoElement) => {
      const isMuted = videoElement.muted;

      if (isMuted) {
        //already muted
        return;
      }

      videoElement.muted = true;
      this.eventEmitter.emit(Events.MutedStatusChanged, new MutedStatusChangedEvent(true));
    });
  }

  public unmute(): void {
    return this.safeVoidAttemptOnVideoElement('unmute', (videoElement) => {
      const isMuted = videoElement.muted;

      if (!isMuted) {
        // already un-muted
        return;
      }

      videoElement.muted = false;
      this.eventEmitter.emit(Events.MutedStatusChanged, new MutedStatusChangedEvent(false));
    });
  }

  public getIsMuted(): boolean {
    return this.safeAttemptOnVideoElement('getIsMuted', (videoElement) => videoElement.muted, false);
  }

  public setLoggerLevel(level: LoggerLevel): void {
    this.logger.setLoggerLevel(level);
    this.eventEmitter.emit(Events.LoggerLevelChanged, new LoggerLevelChangedEvent(this.getLoggerLevel()));
  }

  public addEventListener<K extends keyof PlayerEventTypeToEventMap>(
    event: K,
    callback: Callback<PlayerEventTypeToEventMap[K]>
  ): void {
    return this.eventEmitter.on(event, callback);
  }

  public once<K extends keyof PlayerEventTypeToEventMap>(
    event: K,
    callback: Callback<PlayerEventTypeToEventMap[K]>
  ): void {
    return this.eventEmitter.once(event, callback);
  }

  public removeEventListener<K extends keyof PlayerEventTypeToEventMap>(
    event: K,
    callback: Callback<PlayerEventTypeToEventMap[K]>
  ): void {
    return this.eventEmitter.off(event, callback);
  }

  public removeAllEventListenersForType<K extends keyof PlayerEventTypeToEventMap>(event: K): void {
    return this.eventEmitter.offAllFor(event);
  }

  public removeAllEventListeners(): void {
    return this.eventEmitter.reset();
  }

  public play(): void {
    return this.safeVoidAttemptOnVideoElement('play', (videoElement) => videoElement.play());
  }

  public pause(): void {
    return this.safeVoidAttemptOnVideoElement('pause', (videoElement) => videoElement.pause());
  }

  public requestPictureInPicture(): void {
    if (!window.document.pictureInPictureEnabled) {
      return this.logger.warn(
        'User agent does not support pictureInPicture. document.pictureInPictureEnabled is false.'
      );
    }

    return this.safeVoidAttemptOnVideoElement('requestPictureInPicture', (videoElement) => {
      if (videoElement.disablePictureInPicture) {
        return this.logger.warn(
          'pictureInPicture is disabled for this videoElement. Set videoElement.disablePictureInPicture to false to enable pictureInPicture'
        );
      }

      if (this.getIsInPictureInPictureMode()) {
        return this.logger.warn('This videoElement is already in pictureInPicture mode.');
      }

      videoElement
        .requestPictureInPicture()
        .then((pictureInPictureWindow) => {
          this.pictureInPictureWindow = pictureInPictureWindow;

          this.pictureInPictureWindow.addEventListener('resize', this.handlePictureAndPictureSize);
          this.handlePictureAndPictureSize();
        })
        .catch((error) => {
          this.logger.warn('pictureInPicture request failed, see reason: ', error);
        });
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

  public updateConfiguration(configurationChunk: PlayerConfigurationChunk): void {
    return this.configurationManager.updateConfiguration(configurationChunk);
  }

  public resetConfiguration(): void {
    return this.configurationManager.reset();
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
      pipeline = new NativePipeline({ logger: this.logger.createSubLogger('NativePipeline') });
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

  private safeVoidAttemptOnVideoElement(methodName: string, executor: (videoElement: HTMLVideoElement) => void): void {
    return this.safeAttemptOnVideoElement(methodName, executor, undefined);
  }

  private warnAttempt(method: string): void {
    this.logger.warn(`Attempt to call "${method}", but no video element attached. Call "attach" first.`);
  }
}
