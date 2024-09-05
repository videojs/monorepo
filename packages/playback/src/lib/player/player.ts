import type { PlayerConfiguration, PlayerConfigurationChunk } from '../types/configuration';
import Logger, { LoggerLevel } from '../utils/logger';
import ConfigurationManager from './configuration';
import type { Callback } from '../utils/eventEmitter';
import EventEmitter from '../utils/eventEmitter';
import { Events } from './consts/events';
import NetworkManager from '../network/networkManager';
import type { Pipeline, PipelineDependencies } from '../pipelines/basePipeline';
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
import type {
  PlayerAudioTrack,
  PlayerImageTrack,
  PlayerStats,
  PlayerTextTrack,
  PlayerVideoTrack,
} from '../types/player';
import { PlaybackState } from '../types/player';
import { RequestType } from '../types/network';

interface PlayerDependencies {
  logger: Logger;
  configurationManager: ConfigurationManager;
  networkManager: NetworkManager;
  eventEmitter: EventEmitter<PlayerEventTypeToEventMap>;
}

export interface PipelineFactory {
  create(dependencies: PipelineDependencies): Pipeline;
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

  private readonly logger_: Logger;
  private readonly configurationManager_: ConfigurationManager;
  private readonly eventEmitter_: EventEmitter<PlayerEventTypeToEventMap>;

  private networkManager_: NetworkManager;
  private videoElement_: HTMLVideoElement | null = null;
  private activePipeline_: Pipeline | null = null;
  private pictureInPictureWindow_: PictureInPictureWindow | null = null;
  private playbackState_: PlaybackState = PlaybackState.Idle;

  private readonly mimeTypeToPipelineFactoryMap_ = new Map<string, PipelineFactory>();

  public constructor(dependencies: PlayerDependencies) {
    this.logger_ = dependencies.logger;
    this.configurationManager_ = dependencies.configurationManager;
    this.networkManager_ = dependencies.networkManager;
    this.eventEmitter_ = dependencies.eventEmitter;
  }

  public registerPipelineFactory(mimeType: string, pipelineFactory: PipelineFactory): void {
    if (this.mimeTypeToPipelineFactoryMap_.has(mimeType)) {
      this.logger_.warn(`Overriding existing pipeline factory for "${mimeType}" mimeType.`);
    }

    this.mimeTypeToPipelineFactoryMap_.set(mimeType, pipelineFactory);
  }

  public getNetworkManager(): NetworkManager {
    return this.networkManager_;
  }

  public setNetworkManager(networkManager: NetworkManager): void {
    this.networkManager_ = networkManager;
  }

  public getVideoElement(): HTMLVideoElement | null {
    return this.videoElement_;
  }

  public getConfiguration(): PlayerConfiguration {
    return this.configurationManager_.getConfiguration();
  }

  public getLoggerLevel(): LoggerLevel {
    return this.logger_.getLoggerLevel();
  }

  public getPlaybackState(): PlaybackState {
    return this.playbackState_;
  }

  public getVolumeLevel(): number {
    return this.safeAttemptOnVideoElement_('getVolumeLevel', (videoElement) => videoElement.volume, 0);
  }

  public setVolumeLevel(volumeLevel: number): void {
    let level: number;

    if (volumeLevel > 1) {
      level = 1;
      this.logger_.warn(`Volume level should be in range [0, 1]. Received: ${volumeLevel}. Value is clamped to 1.`);
    } else if (volumeLevel < 0) {
      level = 0;
      this.logger_.warn(`Volume level should be in range [0, 1]. Received: ${volumeLevel}. Value is clamped to 0.`);
    } else {
      level = volumeLevel;
    }

    return this.safeVoidAttemptOnVideoElement_('setVolumeLevel', (videoElement) => void (videoElement.volume = level));
  }

  public getPlaybackRate(): number {
    return this.safeAttemptOnVideoElement_('getPlaybackRate', (videoElement) => videoElement.playbackRate, 0);
  }

  public setPlaybackRate(rate: number): void {
    return this.safeVoidAttemptOnVideoElement_('setPlaybackRate', (videoElement) => (videoElement.playbackRate = rate));
  }

  public getCurrentTime(): number {
    return this.safeAttemptOnVideoElement_('getCurrentTime', (videoElement) => videoElement.currentTime, 0);
  }

  public seek(seekTarget: number): void {
    return this.safeVoidAttemptOnVideoElement_('seek', (videoElement) => {
      const seekableRanges = this.getSeekableRanges();
      const isValidSeekTarget = seekableRanges.some((timeRange) => timeRange.isInRangeInclusive(seekTarget));

      if (!isValidSeekTarget) {
        this.logger_.warn(
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
    return this.safeAttemptOnVideoElement_(
      'getSeekableRanges',
      (videoElement) => PlayerTimeRange.fromTimeRanges(videoElement.seekable),
      [] as Array<PlayerTimeRange>
    );
  }

  public getBufferedRanges(): Array<PlayerTimeRange> {
    return this.safeAttemptOnVideoElement_(
      'getBufferedRanges',
      (videoElement) => PlayerTimeRange.fromTimeRanges(videoElement.buffered),
      [] as Array<PlayerTimeRange>
    );
  }

  public getTextTracks(): Array<PlayerTextTrack> {
    if (this.activePipeline_) {
      return this.activePipeline_.getTextTracks();
    }

    return [];
  }

  public getAudioTracks(): Array<PlayerAudioTrack> {
    if (this.activePipeline_) {
      return this.activePipeline_.getAudioTracks();
    }

    return [];
  }

  public getImageTracks(): Array<PlayerImageTrack> {
    if (this.activePipeline_) {
      return this.activePipeline_.getImageTracks();
    }

    return [];
  }

  public getVideoTracks(): Array<PlayerVideoTrack> {
    if (this.activePipeline_) {
      return this.activePipeline_.getVideoTracks();
    }

    return [];
  }

  public getStats(): PlayerStats {
    if (this.activePipeline_) {
      return this.activePipeline_.getStats();
    }

    return {};
  }

  public selectVideoTrack(videoTrack: PlayerVideoTrack): void {
    return this.activePipeline_?.selectVideoTrack(videoTrack);
  }

  public selectImageTrack(imageTrack: PlayerImageTrack): void {
    return this.activePipeline_?.selectImageTrack(imageTrack);
  }

  public selectAudioTrack(audioTrack: PlayerAudioTrack): void {
    return this.activePipeline_?.selectAudioTrack(audioTrack);
  }

  public selectTextTrack(textTrack: PlayerTextTrack): void {
    return this.activePipeline_?.selectTextTrack(textTrack);
  }

  public mute(): void {
    return this.safeVoidAttemptOnVideoElement_('mute', (videoElement) => {
      const isMuted = videoElement.muted;

      if (isMuted) {
        //already muted
        return;
      }

      videoElement.muted = true;
      this.eventEmitter_.emit(Events.MutedStatusChanged, new MutedStatusChangedEvent(true));
    });
  }

  public unmute(): void {
    return this.safeVoidAttemptOnVideoElement_('unmute', (videoElement) => {
      const isMuted = videoElement.muted;

      if (!isMuted) {
        // already un-muted
        return;
      }

      videoElement.muted = false;
      this.eventEmitter_.emit(Events.MutedStatusChanged, new MutedStatusChangedEvent(false));
    });
  }

  public getIsMuted(): boolean {
    return this.safeAttemptOnVideoElement_('getIsMuted', (videoElement) => videoElement.muted, false);
  }

  public setLoggerLevel(level: LoggerLevel): void {
    this.logger_.setLoggerLevel(level);
    this.eventEmitter_.emit(Events.LoggerLevelChanged, new LoggerLevelChangedEvent(this.getLoggerLevel()));
  }

  public addEventListener<K extends keyof PlayerEventTypeToEventMap>(
    event: K,
    callback: Callback<PlayerEventTypeToEventMap[K]>
  ): void {
    return this.eventEmitter_.on(event, callback);
  }

  public once<K extends keyof PlayerEventTypeToEventMap>(
    event: K,
    callback: Callback<PlayerEventTypeToEventMap[K]>
  ): void {
    return this.eventEmitter_.once(event, callback);
  }

  public removeEventListener<K extends keyof PlayerEventTypeToEventMap>(
    event: K,
    callback: Callback<PlayerEventTypeToEventMap[K]>
  ): void {
    return this.eventEmitter_.off(event, callback);
  }

  public removeAllEventListenersForType<K extends keyof PlayerEventTypeToEventMap>(event: K): void {
    return this.eventEmitter_.offAllFor(event);
  }

  public removeAllEventListeners(): void {
    return this.eventEmitter_.reset();
  }

  public play(): void {
    return this.safeVoidAttemptOnVideoElement_('play', (videoElement) => videoElement.play());
  }

  public pause(): void {
    return this.safeVoidAttemptOnVideoElement_('pause', (videoElement) => videoElement.pause());
  }

  public requestPictureInPicture(): void {
    if (!window.document.pictureInPictureEnabled) {
      return this.logger_.warn(
        'User agent does not support pictureInPicture. document.pictureInPictureEnabled is false.'
      );
    }

    return this.safeVoidAttemptOnVideoElement_('requestPictureInPicture', (videoElement) => {
      if (videoElement.disablePictureInPicture) {
        return this.logger_.warn(
          'pictureInPicture is disabled for this videoElement. Set videoElement.disablePictureInPicture to false to enable pictureInPicture'
        );
      }

      if (this.getIsInPictureInPictureMode()) {
        return this.logger_.warn('This videoElement is already in pictureInPicture mode.');
      }

      videoElement
        .requestPictureInPicture()
        .then((pictureInPictureWindow) => {
          this.pictureInPictureWindow_ = pictureInPictureWindow;

          this.pictureInPictureWindow_.addEventListener('resize', this.handlePictureAndPictureSize_);
          this.handlePictureAndPictureSize_();
        })
        .catch((error) => {
          this.logger_.warn('pictureInPicture request failed, see reason: ', error);
        });
    });
  }

  public getIsInPictureInPictureMode(): boolean {
    return this.videoElement_ !== null && window.document.pictureInPictureElement === this.videoElement_;
  }

  private readonly handlePictureAndPictureSize_ = (): void => {
    // probably report to abr:
    // this.pictureInPictureWindow.width
    // this.pictureInPictureWindow.height
  };

  public exitPictureInPicture(): void {
    if (this.videoElement_ === null) {
      return this.warnAttempt_('exitPictureInPicture');
    }

    if (!this.getIsInPictureInPictureMode()) {
      return this.logger_.warn('current video element is not in pictureInPicture mode.');
    }

    this.pictureInPictureWindow_?.removeEventListener('resize', this.handlePictureAndPictureSize_);
    this.pictureInPictureWindow_ = null;

    window.document.exitPictureInPicture().catch((error) => {
      this.logger_.warn('exitPictureInPicture request failed, see reason: ', error);
    });
  }

  public attach(videoElement: HTMLVideoElement): void {
    if (this.videoElement_ !== null) {
      this.detach();
    }

    this.videoElement_ = videoElement;

    this.videoElement_.addEventListener('volumechange', this.handleVolumeChange_);
    this.videoElement_.addEventListener('leavepictureinpicture', this.handleLevePictureInPicture_);
    this.videoElement_.addEventListener('enterpictureinpicture', this.handleEnterPictureInPicture_);
  }

  public detach(): void {
    if (this.videoElement_ === null) {
      return this.logger_.warn('video element is already detached');
    }

    if (this.getIsInPictureInPictureMode()) {
      this.exitPictureInPicture();
    }

    this.videoElement_.removeEventListener('volumechange', this.handleVolumeChange_);
    this.videoElement_.removeEventListener('leavepictureinpicture', this.handleLevePictureInPicture_);
    this.videoElement_.removeEventListener('enterpictureinpicture', this.handleEnterPictureInPicture_);

    this.videoElement_ = null;
  }

  private readonly handleVolumeChange_ = (event: Event): void => {
    const target = event.target as HTMLVideoElement;
    this.eventEmitter_.emit(Events.VolumeChanged, new VolumeChangedEvent(target.volume));
  };

  private readonly handleEnterPictureInPicture_ = (): void => {
    this.eventEmitter_.emit(Events.EnterPictureInPictureMode, new EnterPictureInPictureModeEvent());
  };

  private readonly handleLevePictureInPicture_ = (): void => {
    this.eventEmitter_.emit(Events.LeavePictureInPictureMode, new LeavePictureInPictureModeEvent());
  };

  public updateConfiguration(configurationChunk: PlayerConfigurationChunk): void {
    this.configurationManager_.updateConfiguration(configurationChunk);

    if (this.activePipeline_) {
      this.activePipeline_.updateConfiguration(this.getConfiguration());
    }
  }

  public resetConfiguration(): void {
    return this.configurationManager_.reset();
  }

  public dispose(): void {
    this.detach();
    this.removeAllEventListeners();
    this.activePipeline_?.dispose();
    this.activePipeline_ = null;
    // TODO
  }

  public loadRemoteAsset(uri: URL, mimeType: string): void {
    return this.safeVoidAttemptOnVideoElement_('loadRemoteAsset', (videoElement) => {
      return this.load_(mimeType, videoElement, (pipeline) => pipeline.loadRemoteAsset(uri));
    });
  }

  public loadLocalAsset(asset: string | ArrayBuffer, baseUrl: string, mimeType: string): void {
    return this.safeVoidAttemptOnVideoElement_('loadLocalAsset', (videoElement) => {
      return this.load_(mimeType, videoElement, (pipeline) => pipeline.loadLocalAsset(asset, baseUrl));
    });
  }

  private load_(mimeType: string, videoElement: HTMLVideoElement, pipelineHandler: (pipeline: Pipeline) => void): void {
    let pipelineFactory = this.mimeTypeToPipelineFactoryMap_.get(mimeType);

    if (!pipelineFactory && videoElement.canPlayType(mimeType)) {
      pipelineFactory = NativePipeline;
    }

    if (pipelineFactory) {
      const pipeline = pipelineFactory.create({
        logger: this.logger_,
        networkManager: this.networkManager_,
        playerConfiguration: this.getConfiguration(),
      });
      this.activePipeline_ = pipeline;
      return pipelineHandler(pipeline);
    }

    this.logger_.warn('no supported pipelines found for ', mimeType);

    this.eventEmitter_.emit(Events.Error, new ErrorEvent(new NoSupportedPipelineError()));
  }

  private safeAttemptOnVideoElement_<T>(
    methodName: string,
    executor: (videoElement: HTMLVideoElement) => T,
    fallback: T
  ): T {
    if (this.videoElement_ === null) {
      this.warnAttempt_(methodName);
      return fallback;
    }

    return executor(this.videoElement_);
  }

  private safeVoidAttemptOnVideoElement_(methodName: string, executor: (videoElement: HTMLVideoElement) => void): void {
    return this.safeAttemptOnVideoElement_(methodName, executor, undefined);
  }

  private warnAttempt_(method: string): void {
    this.logger_.warn(`Attempt to call "${method}", but no video element attached. Call "attach" first.`);
  }
}
