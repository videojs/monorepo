// enums/consts
import { LoggerLevel } from '../../consts/logger-level';
import { PlayerEventType } from '../../consts/events';
// types
import type { ILoadLocalSource, ILoadRemoteSource, IPlayerSource } from '../../types/source.declarations';
import type { IInterceptorsStorage, Interceptor } from '../../types/interceptors.declarations';
import type { ILogger } from '../../types/logger.declarations';
import type { PlayerConfiguration } from '../../types/configuration.declarations';
import type { DeepPartial } from '../../types/utility.declarations';
import type { IStore } from '../../types/store.declarations';
import type { EventListener, IEventEmitter } from '../../types/event-emitter.declarations';
import type { EventTypeToEventMap } from '../../types/mappers/event-type-to-event-map.declarations';
// events
import {
  ConfigurationChangedEvent,
  LoggerLevelChangedEvent,
  MutedStatusChangedEvent,
  PlayerErrorEvent,
  VolumeChangedEvent,
} from '../../events/player-events';
// models
import { PlayerSource } from '../../models/player-source';
// errors
import { NoSupportedPipelineError } from '../../errors/pipeline-errors';
// pipelines
import { PipelineLoaderFactoryStorage } from './pipeline-loader-factory-storage';
import type { InterceptorType } from '../../consts/interceptor-type';
import type { InterceptorTypeToInterceptorPayloadMap } from '../../types/mappers/interceptor-type-to-interceptor-map.declarations';
import { PlaybackState } from '../../consts/playback-state';
import { PlayerTimeRange } from '../../models/player-time-range';
import type { IPlayerTimeRange } from '../../types/player-time-range.declarations';
import type { IPlaybackStats } from '../../types/playback-stats.declarations';
import type { IPlayerAudioTrack } from '../../types/audio-track.declarations';
import type { IPlayerThumbnailTrack, IRemoteVttThumbnailTrackOptions } from '../../types/thumbnail-track.declarations';
import type { IQualityLevel } from '../../types/quality-level.declarations';
import type { VersionInfo } from '../../types/version-info.declarations';

declare const __COMMIT_HASH: string;
declare const __VERSION: string;
declare const __EXPERIMENTAL: boolean;

export interface PlayerDependencies {
  readonly logger: ILogger;
  readonly interceptorsStorage: IInterceptorsStorage<InterceptorTypeToInterceptorPayloadMap>;
  readonly configurationManager: IStore<PlayerConfiguration>;
  readonly eventEmitter: IEventEmitter<EventTypeToEventMap>;
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
   * static pipeline loader factory storage getter
   */
  public static readonly pipelineLoaderFactoryStorage = new PipelineLoaderFactoryStorage();

  /**
   * MARK: PROTECTED INSTANCE MEMBERS
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
  }

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
    // this.networkManager_.updateConfiguration(this.configurationManager_.getSnapshot().network);
    this.eventEmitter_.emitEvent(new ConfigurationChangedEvent(this.getConfigurationSnapshot()));
  }

  /**
   * reset current configuration to default
   */
  public resetConfiguration(): void {
    this.configurationManager_.reset();
    // this.networkManager_.updateConfiguration(this.configurationManager_.getSnapshot().network);
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

    // TODO: update list of all possible events + add EME events here as well
    this.activeVideoElement_.addEventListener('volumechange', this.handleVolumeChange_);
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
    this.activeVideoElement_.removeEventListener('volumechange', this.handleVolumeChange_);

    this.activeVideoElement_ = null;
  }

  /**
   * stop current playback session and transition to the Idle state
   * @param reason - stop reason
   */
  public stop(reason: string): void {
    this.logger_.debug('stop is called. reason: ', reason);

    this.activeSource_?.dispose();
    this.activeSource_ = null;
    this.transitionPlaybackState_(PlaybackState.Idle);

    // this.activePipelineLoader_?.abort();
    // this.activePipelineLoader_ = null;
    // this.activePipeline_?.dispose();
    // this.activePipeline_ = null;
  }

  /**
   * Cleanup everything and prepare the player instance to be safely garbage collected
   */
  public dispose(): void {
    this.detach();
    this.eventEmitter_.removeAllEventListeners();
    this.interceptorsStorage_.removeAllInterceptors();
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

    // TODO: implement pipeline loader flow
    // if (this.hasPipelineFactoryConfiguration(this.activeSource_.mimeType.toLowerCase())) {
    //   const { loader, vod, live } = this.getPipelineFactoryConfiguration(this.activeSource_.mimeType.toLowerCase())!;
    //   this.activePipelineLoader_ = loader.create({
    //     logger: this.logger_,
    //     videoElement: this.activeVideoElement_,
    //     networkManager: this.networkManager_,
    //     source: this.activeSource_,
    //     vodFactory: vod,
    //     liveFactory: live,
    //   });
    //
    //   this.activePipelineLoader_.load().then(
    //     (pipeline) => {
    //       this.activePipeline_ = pipeline;
    //     },
    //     (error) => {
    //       this.eventEmitter_.emitEvent(
    //         new PlayerErrorEvent(new PipelineLoaderFailedToDeterminePipelineError(true, error))
    //       );
    //     }
    //   );
    //
    //   return;
    // }

    this.logger_.debug(
      `No registered pipeline's configuration found for the provided mime type (${this.activeSource_.mimeType}).`
    );

    if (this.activeVideoElement_.canPlayType(this.activeSource_.mimeType)) {
      this.logger_.debug('Native Pipeline can play the provided mime type. Fallback to the Native Pipeline');
      // TODO: implement NativePipeline flow
      // this.activePipeline_ = NativePipeline.create({
      //   logger: this.logger_,
      //   videoElement: this.activeVideoElement_,
      //   networkManager: this.networkManager_,
      //   source: this.activeSource_,
      // });
      //
      // this.activePipeline_.start();
      return;
    } else {
      this.logger_.debug('Native Pipeline can not play the provided mime type.');
    }

    this.logger_.warn('No supported pipelines found for ', source.mimeType);
    this.eventEmitter_.emitEvent(new PlayerErrorEvent(new NoSupportedPipelineError(true)));
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
  private readonly handleVolumeChange_ = (event: Event): void => {
    const target = event.target as HTMLVideoElement;

    this.eventEmitter_.emitEvent(new VolumeChangedEvent(target.volume));
  };

  private transitionPlaybackState_(to: PlaybackState): void {
    if (this.currentPlaybackState_ !== to) {
      this.currentPlaybackState_ = to;
      // TODO: emit event
    }
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
