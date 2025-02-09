// enums/consts
import { LoggerLevel } from '../consts/logger-level';
import { PlayerEventType } from '../consts/events';
// types
import type { ILoadLocalSource, ILoadRemoteSource, IPlayerSource } from '../types/source.declarations';
import type { IInterceptorsStorage, Interceptor } from '../types/interceptors.declarations';
import type { ILogger } from '../types/logger.declarations';
import type { PlayerConfiguration } from '../types/configuration.declarations';
import type { DeepPartial } from '../types/utility.declarations';
import type { IStore } from '../types/store.declarations';
import type { EventListener, IEventEmitter } from '../types/event-emitter.declarations';
import type { EventTypeToEventMap } from '../types/mappers/event-type-to-event-map.declarations';
// events
import {
  ConfigurationChangedEvent,
  CurrentTimeChangedEvent,
  LoggerLevelChangedEvent,
  MutedStatusChangedEvent,
  ErrorEvent,
  RateChangedEvent,
  VolumeChangedEvent,
  PlaybackStateChangedEvent,
} from '../events/player-events';
// models
import { PlayerSource } from '../models/player-source';
// errors
import { NoSupportedPipelineError, PipelineLoaderFailedToDeterminePipelineError } from '../errors/pipeline-errors';
// pipelines
import { InterceptorType } from '../consts/interceptor-type';
import type { InterceptorTypeToInterceptorPayloadMap } from '../types/mappers/interceptor-type-to-interceptor-map.declarations';
import { PlaybackState } from '../consts/playback-state';
import { PlayerTimeRange } from '../models/player-time-range';
import type { IPlayerTimeRange } from '../types/player-time-range.declarations';
import type { IPlaybackStats } from '../types/playback-stats.declarations';
import type { IPlayerAudioTrack } from '../types/audio-track.declarations';
import type { IPlayerThumbnailTrack, IRemoteVttThumbnailTrackOptions } from '../types/thumbnail-track.declarations';
import type { IQualityLevel } from '../types/quality-level.declarations';
import type { VersionInfo } from '../types/version-info.declarations';
import type { IPlayerTextTrack } from '../types/text-track.declarations';
import { NativePipeline } from '../pipelines/native/native-pipeline';
import type { IPipeline, IPipelineLoader, IPipelineLoaderFactory } from '../types/pipeline.declarations';
import type { INetworkManager, INetworkRequestInfo, INetworkResponseInfo } from '../types/network.declarations';
import {
  NetworkRequestAttemptCompletedSuccessfullyEvent,
  NetworkRequestAttemptCompletedUnsuccessfullyEvent,
  NetworkRequestAttemptFailedEvent,
  NetworkRequestAttemptStartedEvent,
} from '../events/network-events';
import type { IEmeManager, IEmeManagerDependencies } from '../types/eme-manager.declarations';
import { EncryptedEvent, WaitingForKeyEvent } from '../events/eme-events';
import type { PipelineLoaderFactoryStorage } from '../utils/pipeline-loader-factory-storage';

declare const __COMMIT_HASH: string;
declare const __VERSION: string;
declare const __EXPERIMENTAL: boolean;

export interface PlayerDependencies {
  readonly logger: ILogger;
  readonly interceptorsStorage: IInterceptorsStorage<InterceptorTypeToInterceptorPayloadMap>;
  readonly configurationManager: IStore<PlayerConfiguration>;
  readonly eventEmitter: IEventEmitter<EventTypeToEventMap>;
  readonly pipelineLoaderFactoryStorage: PipelineLoaderFactoryStorage;
  // we have to duplicate network manager in both main and worker threads since we may have eme controller on main thread, which requires network manager
  readonly networkManager: INetworkManager;
}

/**
 * Base abstract player for main/worker thread implementations
 */
export abstract class BasePlayer {
  /**
   * MARK: STATIC MEMBERS
   */

  /**
   * static player's logger level enum getter
   */
  public static readonly LoggerLevel = LoggerLevel;

  /**
   * static player's event type enum getter
   */
  public static readonly EventType = PlayerEventType;

  /**
   * static player's version info getter
   */
  public static get versionIfo(): VersionInfo {
    return {
      version: __VERSION,
      versionHash: __COMMIT_HASH,
      isExperimental: __EXPERIMENTAL,
    };
  }

  /**
   * MARK: PROTECTED INSTANCE MEMBERS
   */

  /**
   * pipeline loader factory storage
   */
  protected pipelineLoaderFactoryStorage_: PipelineLoaderFactoryStorage;

  /**
   * current player's playback state
   */
  protected currentPlaybackState_: PlaybackState = PlaybackState.Idle;

  /**
   * attached video element
   */
  protected activeVideoElement_: HTMLVideoElement | null = null;

  /**
   * loaded source
   */
  protected activeSource_: IPlayerSource | null = null;

  /**
   * active pipeline loader
   */
  protected activePipelineLoader_: IPipelineLoader | null = null;

  /**
   * active pipeline
   */
  protected activePipeline_: IPipeline | null = null;

  /**
   * internal logger service
   */
  protected readonly logger_: ILogger;

  /**
   * internal event emitter service
   */
  protected readonly eventEmitter_: IEventEmitter<EventTypeToEventMap>;

  /**
   * internal interceptor's storage service
   */
  protected readonly interceptorsStorage_: IInterceptorsStorage<InterceptorTypeToInterceptorPayloadMap>;

  /**
   * internal network manager instance
   */
  protected readonly networkManager_: INetworkManager;

  /**
   * internal EME manager instance (opt-in feature, so it's nullable)
   */
  protected emeManager_: IEmeManager | null = null;

  /**
   * MARK: PRIVATE INSTANCE MEMBERS
   */

  /**
   * internal configuration manager service
   */
  private readonly configurationManager_: IStore<PlayerConfiguration>;

  /**
   * You can pass your own implementations via dependencies.
   * @param dependencies - player dependencies
   */
  protected constructor(dependencies: PlayerDependencies) {
    this.logger_ = dependencies.logger;
    this.eventEmitter_ = dependencies.eventEmitter;
    this.interceptorsStorage_ = dependencies.interceptorsStorage;
    this.configurationManager_ = dependencies.configurationManager;
    this.networkManager_ = dependencies.networkManager;
    this.pipelineLoaderFactoryStorage_ = dependencies.pipelineLoaderFactoryStorage;
    // setup network manager:
    this.networkManager_.hooks.onAttemptStarted = this.onNetworkRequestAttemptStarted_;
    this.networkManager_.hooks.onAttemptCompletedSuccessfully = this.onNetworkRequestAttemptCompletedSuccessfully_;
    this.networkManager_.hooks.onAttemptCompletedUnsuccessfully = this.onNetworkRequestAttemptCompletedUnsuccessfully_;
    this.networkManager_.hooks.onAttemptFailed = this.onNetworkRequestAttemptFailed_;
    this.networkManager_.requestInterceptor = this.networkRequestInterceptor_;
  }

  public getPipelineLoaderFactoryStorage(): PipelineLoaderFactoryStorage {
    return this.pipelineLoaderFactoryStorage_;
  }

  public setEmeManagerFactory(factory: (deps: IEmeManagerDependencies) => IEmeManager): void {
    this.emeManager_ = factory({
      logger: this.logger_.createSubLogger('EmeManager'),
      networkManager: this.networkManager_,
    });

    if (this.activeVideoElement_) {
      this.emeManager_.attach(this.activeVideoElement_);
    }

    if (this.activeSource_) {
      this.emeManager_.setSource(this.activeSource_);
    }
  }

  public resetEmeManager(): void {
    this.emeManager_?.dispose();
    this.emeManager_ = null;
  }

  protected readonly networkRequestInterceptor_ = (requestInfo: INetworkRequestInfo): Promise<INetworkRequestInfo> => {
    return this.interceptorsStorage_.executeInterceptors(InterceptorType.NetworkRequest, requestInfo);
  };

  protected readonly onNetworkRequestAttemptStarted_ = (requestInfo: INetworkRequestInfo): void => {
    this.eventEmitter_.emitEvent(new NetworkRequestAttemptStartedEvent(requestInfo));
  };

  protected readonly onNetworkRequestAttemptCompletedSuccessfully_ = (
    requestInfo: INetworkRequestInfo,
    responseInfo: INetworkResponseInfo
  ): void => {
    this.eventEmitter_.emitEvent(new NetworkRequestAttemptCompletedSuccessfullyEvent(requestInfo, responseInfo));
  };

  protected readonly onNetworkRequestAttemptCompletedUnsuccessfully_ = (
    requestInfo: INetworkRequestInfo,
    responseInfo: INetworkResponseInfo
  ): void => {
    this.eventEmitter_.emitEvent(new NetworkRequestAttemptCompletedUnsuccessfullyEvent(requestInfo, responseInfo));
  };

  protected readonly onNetworkRequestAttemptFailed_ = (requestInfo: INetworkRequestInfo, error: Error): void => {
    this.eventEmitter_.emitEvent(new NetworkRequestAttemptFailedEvent(requestInfo, error));
  };

  /**
   * MARK: INTERCEPTORS API
   */

  /**
   * add new interceptor for a specific type
   * @param interceptorType - specific interceptor type
   * @param interceptor - interceptor
   */
  public addInterceptor<K extends InterceptorType>(
    interceptorType: K,
    interceptor: Interceptor<InterceptorTypeToInterceptorPayloadMap[K]>
  ): void {
    this.interceptorsStorage_.addInterceptor(interceptorType, interceptor);
  }

  /**
   * remove specific interceptor for a specific type
   * @param interceptorType - specific interceptor type
   * @param interceptor - interceptor
   */
  public removeInterceptor<K extends InterceptorType>(
    interceptorType: K,
    interceptor: Interceptor<InterceptorTypeToInterceptorPayloadMap[K]>
  ): void {
    this.interceptorsStorage_.removeInterceptor(interceptorType, interceptor);
  }

  /**
   * remove all interceptors for a specific type
   * @param interceptorType - specific interceptor type
   */
  public removeAllInterceptorsForType<K extends InterceptorType>(interceptorType: K): void {
    this.interceptorsStorage_.removeAllInterceptorsForType(interceptorType);
  }

  /**
   * remove all interceptors
   */
  public removeAllInterceptors(): void {
    this.interceptorsStorage_.removeAllInterceptors();
  }

  /**
   * MARK: DEBUG API
   */

  /**
   * logger level getter
   */
  public getLoggerLevel(): LoggerLevel {
    return this.logger_.getLoggerLevel();
  }

  /**
   * logger level setter
   * @param loggerLevel - required logger level
   */
  public setLoggerLevel(loggerLevel: LoggerLevel): void {
    this.logger_.setLoggerLevel(loggerLevel);
    this.eventEmitter_.emitEvent(new LoggerLevelChangedEvent(this.getLoggerLevel()));
  }

  /**
   * MARK: CONFIGURATION API
   */

  /**
   * get deep copy of the current configuration
   */
  public getConfigurationSnapshot(): PlayerConfiguration {
    return this.configurationManager_.getSnapshot();
  }

  /**
   * update current configuration with a chunk
   * @param configurationChunk - chunk to update
   */
  public updateConfiguration(configurationChunk: DeepPartial<PlayerConfiguration>): void {
    this.configurationManager_.update(configurationChunk);
    const snapshot = this.configurationManager_.getSnapshot();

    this.networkManager_.updateConfiguration(snapshot.network);
    this.activePipelineLoader_?.updateConfiguration(snapshot);
    // this.emeManager_?.updateConfiguration(snapshot.eme);
    this.eventEmitter_.emitEvent(new ConfigurationChangedEvent(this.getConfigurationSnapshot()));
  }

  /**
   * reset current configuration to default
   */
  public resetConfiguration(): void {
    this.configurationManager_.reset();
    this.networkManager_.updateConfiguration(this.configurationManager_.getSnapshot().network);
    this.eventEmitter_.emitEvent(new ConfigurationChangedEvent(this.getConfigurationSnapshot()));
  }

  /**
   * MARK: EVENTS API
   */

  /**
   * Register event listener for a specific event type
   * @param eventType - specific event type
   * @param eventListener - event listener
   */
  public addEventListener<K extends PlayerEventType>(
    eventType: K,
    eventListener: EventListener<EventTypeToEventMap[K]>
  ): void {
    return this.eventEmitter_.addEventListener(eventType, eventListener);
  }

  /**
   * Register event listener for a specific event type once
   * @param eventType - specific event type
   * @param eventListener - event listener
   */
  public once<K extends PlayerEventType>(eventType: K, eventListener: EventListener<EventTypeToEventMap[K]>): void {
    return this.eventEmitter_.once(eventType, eventListener);
  }
  /**
   * Remove specific registered event listener for a specific event type
   * @param eventType - specific event type
   * @param eventListener - specific event listener
   */
  public removeEventListener<K extends PlayerEventType>(
    eventType: K,
    eventListener: EventListener<EventTypeToEventMap[K]>
  ): void {
    return this.eventEmitter_.removeEventListener(eventType, eventListener);
  }

  /**
   * Remove all registered event handlers for specific event type
   * @param eventType - specific event type
   */
  public removeAllEventListenersForType<K extends PlayerEventType>(eventType: K): void {
    return this.eventEmitter_.removeAllEventListenersFor(eventType);
  }

  /**
   * Remove all registered event handlers for all events
   */
  public removeAllEventListeners(): void {
    return this.eventEmitter_.removeAllEventListeners();
  }

  /**
   * MARK: LIFE CYCLE API
   */

  /**
   * attach player to the video element
   * @param videoElement - target video element
   */
  public attach(videoElement: HTMLVideoElement): void {
    if (this.activeVideoElement_ !== null) {
      this.detach();
    }

    this.activeVideoElement_ = videoElement;

    this.emeManager_?.attach(this.activeVideoElement_);

    // TODO: update list of all possible events + add EME events here as well
    // Playback
    this.activeVideoElement_.addEventListener('volumechange', this.handleVolumeChange_);
    this.activeVideoElement_.addEventListener('ratechange', this.handleRateChange_);
    this.activeVideoElement_.addEventListener('timeupdate', this.handleTimeUpdate_);
    // EME
    this.activeVideoElement_.addEventListener('encrypted', this.handleEncryptedEvent_);
    this.activeVideoElement_.addEventListener('waitingforkey', this.handleWaitingForKeyEvent_);
  }

  /**
   * current video element getter
   */
  public getCurrentVideoElement(): HTMLVideoElement | null {
    return this.activeVideoElement_;
  }

  /**
   * detach player from the current video element
   */
  public detach(): void {
    if (this.activeVideoElement_ === null) {
      this.logger_.warn('video element is already detached');
      return;
    }

    this.stop('detach');

    // TODO: update list of all possible events + add EME events here as well
    // Playback
    this.activeVideoElement_.removeEventListener('volumechange', this.handleVolumeChange_);
    this.activeVideoElement_.removeEventListener('ratechange', this.handleRateChange_);
    this.activeVideoElement_.removeEventListener('timeupdate', this.handleTimeUpdate_);
    // EME
    this.activeVideoElement_.removeEventListener('encrypted', this.handleEncryptedEvent_);
    this.activeVideoElement_.removeEventListener('waitingforkey', this.handleWaitingForKeyEvent_);

    this.emeManager_?.detach();
    this.activeVideoElement_ = null;
  }

  /**
   * stop current playback session and transition to the Idle state
   * @param reason - stop reason
   */
  public stop(reason: string): void {
    this.logger_.debug('stop is called. reason: ', reason);

    this.emeManager_?.stop();

    this.activeSource_?.dispose();
    this.activeSource_ = null;
    this.transitionPlaybackState_(PlaybackState.Idle);

    this.activePipelineLoader_?.abort();
    this.activePipelineLoader_ = null;
    this.activePipeline_?.dispose();
    this.activePipeline_ = null;
  }

  /**
   * Cleanup everything and prepare the player instance to be safely garbage collected
   */
  public dispose(): void {
    this.detach();
    this.eventEmitter_.removeAllEventListeners();
    this.interceptorsStorage_.removeAllInterceptors();
    this.emeManager_?.dispose();
  }

  /**
   * load source
   * @param source - source to load
   */
  public load(source: ILoadRemoteSource | ILoadLocalSource): void {
    if (this.activeVideoElement_ === null) {
      this.logger_.warn(
        'You are trying to load a source, while no video element attached to the player. Please call "attach" with a target video element first.'
      );

      return;
    }

    if (this.activeSource_ !== null) {
      this.stop('load');
    }

    this.transitionPlaybackState_(PlaybackState.Loading);
    this.activeSource_ = new PlayerSource(source);

    this.logger_.debug('received a load request: ', this.activeSource_);

    this.emeManager_?.setSource(this.activeSource_);

    let pipelineLoaderFactory: IPipelineLoaderFactory | null = null;

    if (this.activeSource_.loaderAlias) {
      pipelineLoaderFactory = this.pipelineLoaderFactoryStorage_.get(
        this.activeSource_.mimeType,
        this.activeSource_.loaderAlias
      );
    } else {
      pipelineLoaderFactory = this.pipelineLoaderFactoryStorage_.getFirstAvailable(this.activeSource_.mimeType);
    }

    if (pipelineLoaderFactory) {
      this.activePipelineLoader_ = pipelineLoaderFactory.create({
        videoElement: this.activeVideoElement_,
        networkManager: this.networkManager_,
        logger: this.logger_,
        source: this.activeSource_,
        configuration: this.getConfigurationSnapshot(),
      });

      this.activePipelineLoader_.load().then(
        (pipeline) => {
          this.activePipeline_ = pipeline;
        },
        (error) => {
          // TODO: ignore aborts if received from stop('load')
          this.eventEmitter_.emitEvent(new ErrorEvent(new PipelineLoaderFailedToDeterminePipelineError(true, error)));
        }
      );

      return;
    }

    this.logger_.debug(
      `No registered pipeline's configuration found for the provided mime type (${this.activeSource_.mimeType}).`
    );

    if (this.activeVideoElement_.canPlayType(this.activeSource_.mimeType)) {
      this.logger_.debug('Native Pipeline can play the provided mime type. Fallback to the Native Pipeline');

      this.activePipeline_ = NativePipeline.create({
        logger: this.logger_,
        videoElement: this.activeVideoElement_,
        networkManager: this.networkManager_,
        source: this.activeSource_,
      });

      this.activePipeline_.start();
      return;
    } else {
      this.logger_.debug('Native Pipeline can not play the provided mime type.');
    }

    this.logger_.warn('No supported pipelines found for ', source.mimeType);
    this.eventEmitter_.emitEvent(new ErrorEvent(new NoSupportedPipelineError(true)));
  }

  /**
   * current source getter
   */
  public getCurrentSource(): IPlayerSource | null {
    return this.activeSource_;
  }

  /**
   * internal volume change handler
   * @param event - volume changed event
   */
  protected readonly handleVolumeChange_ = (event: Event): void => {
    const target = event.target as HTMLVideoElement;

    this.eventEmitter_.emitEvent(new VolumeChangedEvent(target.volume));
  };

  protected readonly handleRateChange_ = (event: Event): void => {
    const target = event.target as HTMLVideoElement;

    this.eventEmitter_.emitEvent(new RateChangedEvent(target.playbackRate));
  };

  protected readonly handleTimeUpdate_ = (event: Event): void => {
    const target = event.target as HTMLVideoElement;

    this.eventEmitter_.emitEvent(new CurrentTimeChangedEvent(target.currentTime));
  };

  protected readonly handleEncryptedEvent_ = (event: MediaEncryptedEvent): void => {
    this.logger_.debug('received encrypted event', event);

    if (!this.emeManager_) {
      // TODO: stop and emit error
      return;
    }

    if (event.initData === null) {
      return;
    }

    this.eventEmitter_.emitEvent(new EncryptedEvent(event.initData, event.initDataType));
    this.emeManager_.setInitData(event.initDataType, event.initData);
  };

  protected readonly handleWaitingForKeyEvent_ = (): void => {
    this.logger_.debug('received "waitingforkey" event');

    if (!this.emeManager_) {
      // TODO: stop and emit error
      return;
    }

    this.eventEmitter_.emitEvent(new WaitingForKeyEvent());
    this.emeManager_.handleWaitingForKey();
  };

  private transitionPlaybackState_(to: PlaybackState): void {
    if (this.currentPlaybackState_ === to) {
      return;
    }

    this.currentPlaybackState_ = to;
    this.eventEmitter_.emitEvent(new PlaybackStateChangedEvent(this.currentPlaybackState_));
  }

  /**
   * MARK: Playback API
   */

  /**
   * Resumes active playback session (if any)
   */
  public play(): void {
    this.activeVideoElement_?.play();
    // TODO: pass command to loader/pipeline
  }

  /**
   * Pauses active playback session (if any)
   */
  public pause(): void {
    this.activeVideoElement_?.pause();
    // TODO: pass command to loader/pipeline
  }

  /**
   * seek to the provided seek target
   * should return false if seek target is out of available seekable ranges
   * @param seekTarget - seek target
   */
  public seek(seekTarget: number): boolean {
    if (!this.activeVideoElement_) {
      return false;
    }

    const seekableRanges = this.getSeekableRanges();
    const isValidSeekTarget = seekableRanges.some((timeRange) => timeRange.isInRangeInclusive(seekTarget));

    if (!isValidSeekTarget) {
      this.logger_.warn(
        `Provided seek target (${seekTarget}) is out of available seekable time ranges: `,
        seekableRanges.map((range) => range.toString()).join('\n')
      );
      return false;
    }

    this.activeVideoElement_.currentTime = seekTarget;
    // TODO: pass command to loader/pipeline
    return true;
  }

  /**
   * current time getter
   */
  public getCurrentTime(): number {
    return this.activeVideoElement_?.currentTime ?? 0;
  }

  /**
   * playback rate getter
   */
  public getPlaybackRate(): number {
    return this.activeVideoElement_?.playbackRate ?? 1;
  }

  /**
   * playback rate setter
   * @param rate - playback rate
   */
  public setPlaybackRate(rate: number): void {
    if (this.activeVideoElement_) {
      this.activeVideoElement_.playbackRate = rate;
    }
  }

  /**
   * mute active playback session
   */
  public mute(): void {
    if (this.activeVideoElement_ && !this.activeVideoElement_.muted) {
      this.activeVideoElement_.muted = true;
      this.eventEmitter_.emitEvent(new MutedStatusChangedEvent(true));
    }
  }

  /**
   * unmute active playback session
   */
  public unmute(): void {
    if (this.activeVideoElement_ && this.activeVideoElement_.muted) {
      this.activeVideoElement_.muted = false;
      this.eventEmitter_.emitEvent(new MutedStatusChangedEvent(false));
    }
  }

  /**
   * muted status getter
   */
  public getIsMuted(): boolean {
    return this.activeVideoElement_?.muted ?? false;
  }

  /**
   * volume level getter
   */
  public getVolumeLevel(): number {
    return this.activeVideoElement_?.volume ?? 0;
  }

  /**
   * update volume level for the active playback session
   * @param volumeLevel - volume level
   */
  public setVolumeLevel(volumeLevel: number): void {
    if (!this.activeVideoElement_) {
      return;
    }

    let level: number;

    if (volumeLevel > 1) {
      level = 1;
      this.logger_.warn(`Volume level must be in the [0, 1] range. Received: ${volumeLevel}. Value is clamped to 1.`);
    } else if (volumeLevel < 0) {
      level = 0;
      this.logger_.warn(`Volume level must be in the [0, 1] range. Received: ${volumeLevel}. Value is clamped to 0.`);
    } else {
      level = volumeLevel;
    }

    this.activeVideoElement_.volume = level;
  }

  /**
   * current playback session duration getter
   */
  public getDuration(): number {
    // TODO: should we use (active seekable.end - active seekable.start)?
    return this.activeVideoElement_?.duration ?? 0;
  }

  /**
   * Current playback session state getter
   */
  public getPlaybackState(): PlaybackState {
    return this.currentPlaybackState_;
  }

  /**
   * get snapshot of the seekable ranges from the active pipeline
   */
  public getSeekableRanges(): Array<IPlayerTimeRange> {
    if (this.activeVideoElement_) {
      return PlayerTimeRange.fromTimeRanges(this.activeVideoElement_.seekable);
    }

    return [];
  }

  /**
   * get snapshot of the current active seekable range:
   * current time is in range inclusively
   */
  public getActiveSeekableRange(): IPlayerTimeRange | null {
    return this.getSeekableRanges().find((range) => range.isInRangeInclusive(this.getCurrentTime())) ?? null;
  }

  /**
   * get snapshot of the buffered ranges from the active pipeline
   */
  public getBufferedRanges(): Array<IPlayerTimeRange> {
    if (this.activeVideoElement_) {
      return PlayerTimeRange.fromTimeRanges(this.activeVideoElement_.buffered);
    }

    return [];
  }

  /**
   * get snapshot of the current active buffered range:
   * current time is in range inclusively
   */
  public getActiveBufferedRange(): IPlayerTimeRange | null {
    return this.getBufferedRanges().find((range) => range.isInRangeInclusive(this.getCurrentTime())) ?? null;
  }

  /**
   * Active playback session stats getter
   */
  public getPlaybackStats(): IPlaybackStats {
    let droppedVideoFrames = 0;
    let totalVideoFrames = 0;

    if (this.activeVideoElement_) {
      const playbackQuality = this.activeVideoElement_.getVideoPlaybackQuality();
      droppedVideoFrames = playbackQuality.droppedVideoFrames;
      totalVideoFrames = playbackQuality.totalVideoFrames;
    }

    // TODO: possibly collect other data from loader/pipeline/network
    return {
      droppedVideoFrames,
      totalVideoFrames,
    };
  }

  /**
   * MARK: AUDIO TRACKS API
   */

  /**
   * current playback session audio tracks getter
   */
  public getAudioTracks(): Array<IPlayerAudioTrack> {
    // TODO: audio tracks
    return [];
  }

  /**
   * Active audio track getter
   */
  public getActiveAudioTrack(): IPlayerAudioTrack | null {
    return this.getAudioTracks().find((track) => track.isActive) ?? null;
  }

  /**
   * select audio track by id
   * @param id - track id
   */
  public selectAudioTrack(id: string): boolean {
    // TODO: select audio tracks
    return Boolean(id);
  }

  /**
   * MARK: METADATA API
   */

  // TODO: metadata track
  // public getMetadataTrack(): IPlayerMetadataTrack {
  //
  // }

  /**
   * MARK: TEXT TRACKS API
   */

  public getTextTracks(): Array<IPlayerTextTrack> {
    // TODO: text tracks
    return [];
  }

  /**
   * Multiple text tracks can be enabled at the same time
   * @param id - text track id to enable
   */
  public enableTextTrack(id: string): boolean {
    // TODO: text tracks
    return Boolean(id);
  }

  public disableTextTrack(id: string): boolean {
    // TODO: text tracks
    return Boolean(id);
  }

  public disableAllTextTracks(): void {
    // TODO: text tracks
  }

  // TODO: add remote vtt text track
  // public addRemoteVttTextTrack(remoteTextTrackOptions: RemoteVttTextTrackOptions): void {
  //
  // }

  public removeRemoteVttTextTrack(id: string): boolean {
    // TODO: remove remote vtt text track
    return Boolean(id);
  }

  /**
   * MARK: THUMBNAILS API
   */

  /**
   * current playback session thumbnail tracks getter
   */
  public getThumbnailTracks(): Array<IPlayerThumbnailTrack> {
    // TODO: thumbnails tracks
    return [];
  }

  /**
   * Active thumbnail track getter
   */
  public getActiveThumbnailTrack(): IPlayerThumbnailTrack | null {
    return this.getThumbnailTracks().find((track) => track.isActive) ?? null;
  }

  /**
   * select thumbnails track by id
   * @param id - track id
   */
  public selectThumbnailTrack(id: string): boolean {
    // TODO: select thumbnails tracks
    return Boolean(id);
  }

  /**
   * add remote vtt thumbnail track (only VOD), should return false for live
   * @param options - options
   */
  public addRemoteVttThumbnailTrack(options: IRemoteVttThumbnailTrackOptions): boolean {
    // TODO: add remote vtt thumbnail track
    return Boolean(options);
  }

  /**
   * remove remote vtt thumbnail trac (only VOD), should return false for live
   * @param id - track id
   */
  public removeRemoteVttThumbnailTrack(id: string): boolean {
    // TODO: remove remote vtt thumbnail track
    return Boolean(id);
  }

  /**
   * MARK: QUALITY LEVELS API
   */

  /**
   * current playback session quality levels getter
   */
  public getQualityLevels(): Array<IQualityLevel> {
    // TODO: quality levels
    return [];
  }

  /**
   * Active quality level getter
   */
  public getActiveQualityLevel(): IQualityLevel | null {
    return this.getQualityLevels().find((qualityLevel) => qualityLevel.isActive) ?? null;
  }

  /**
   * select specific quality level, this will disable ABR
   * @param id - quality level id
   */
  public selectQualityLevel(id: string): boolean {
    // TODO: select quality level
    return Boolean(id);
  }

  /**
   * enable ABR
   */
  public selectAutoQualityLevel(): boolean {
    // TODO: select auto quality level
    return false;
  }
}
