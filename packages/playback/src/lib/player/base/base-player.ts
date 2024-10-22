// enums/consts
import { LoggerLevel } from '../../consts/logger-level';
import { PlayerEventType } from '../../consts/events';
// types
import type { IPlayerSource } from '../../types/source.declarations';
import type { IInterceptorsStorage } from '../../types/interceptors.declarations';
import type { IInterceptorsStorage, Interceptor } from '../../types/interceptors.declarations';
import type { ILogger } from '../../types/logger.declarations';
import type { PlayerConfiguration } from '../../types/configuration.declarations';
import type { DeepPartial } from '../../types/utility.declarations';
import type { IStore } from '../../types/store.declarations';
import type { EventListener, IEventEmitter } from '../../types/event-emitter.declarations';
import type { EventTypeToEventMap } from '../../types/mappers/event-type-to-event-map.declarations';
// events
import { ConfigurationChangedEvent, LoggerLevelChangedEvent, VolumeChangedEvent } from '../../events/player-events';
// models
// errors
// pipelines
import { PipelineLoaderFactoryStorage } from './pipeline-loader-factory-storage';
import type { InterceptorType } from '../../consts/interceptor-type';
import type { InterceptorTypeToInterceptorPayloadMap } from '../../types/mappers/interceptor-type-to-interceptor-map.declarations';

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
  public static readonly Event = PlayerEventType;

  /**
   * static player's version getter
   */
  public static readonly version: string = __VERSION;

  /**
   * static player's version hash getter
   */
  public static readonly versionHash: string = __COMMIT_HASH;

  /**
   * static is experimental build flag getter
   */
  public static readonly isExperimentalBuild: boolean = __EXPERIMENTAL;

  /**
   * static pipeline loader factory storage getter
   */
  public static readonly pipelineLoaderFactoryStorage = new PipelineLoaderFactoryStorage();

  /**
   * MARK: PROTECTED INSTANCE MEMBERS
   */

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
   * MARK: Debug API
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
   * MARK: Configuration API
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
   * MARK: Events API
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
   * MARK: Life Cycle API
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
}
