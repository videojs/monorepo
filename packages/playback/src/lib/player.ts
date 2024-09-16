import type { ILogger } from './types/logger.declarations';
import Logger from './utils/logger';
import { LoggerLevel } from './consts/loggerLevel';
import type { PlayerConfiguration } from './types/configuration.declarations';
import type { IStore } from './types/store.declarations';
import ConfigurationManager from './configuration/configurationManager';
import type { DeepPartial } from './types/utility.declarations';
import type { EventListener, IEventEmitter } from './types/eventEmitter.declarations';
import type { EventTypeToEventMap } from './types/eventTypeToEventMap.declarations';
import EventEmitter from './utils/eventEmitter';
import { PlayerEventType } from './consts/events';
import {
  ConfigurationChangedEvent,
  LoggerLevelChangedEvent,
  MutedStatusChangedEvent,
  PlayerErrorEvent,
  VolumeChangedEvent,
} from './events/playerEvents';
import type { CapabilitiesProbeResult, IEnvCapabilitiesProvider } from './types/envCapabilities.declarations';
import EnvCapabilitiesProvider from './utils/envCapabilities';
import type { ISource } from './types/source.declarations';
import type { IPipeline } from './types/pipeline.declarations';
import type PlayerTimeRange from './utils/timeRanges';
import { PlaybackState } from './consts/playbackState';
import type { PlaybackStats } from './types/playbackStats.declarations';
import type { IAudioTrack } from './types/tracks.declarations';
import { NoSupportedPipelineError } from './errors/pipelineErrors';

interface PlayerDependencies {
  logger?: ILogger;
  configurationManager?: IStore<PlayerConfiguration>;
  eventEmitter?: IEventEmitter<EventTypeToEventMap>;
  envCapabilitiesProvider?: IEnvCapabilitiesProvider;
}

interface VersionInfo {
  version: string;
  hash: string;
  isExperimental: boolean;
}

declare const __COMMIT_HASH: string;
declare const __VERSION: string;
declare const __EXPERIMENTAL: boolean;

export class Player {
  /**
   * MARK: Static members
   */

  public static LoggerLevel = LoggerLevel;
  public static Event = PlayerEventType;

  /**
   * MARK: Private Properties
   */

  private activeVideoElement_: HTMLVideoElement | null = null;
  private activeSource_: ISource | null = null;
  private activePipeline_: IPipeline | null = null;

  /**
   * MARK: Private services
   */

  private readonly logger_: ILogger;
  private readonly configurationManager_: IStore<PlayerConfiguration>;
  private readonly eventEmitter_: IEventEmitter<EventTypeToEventMap>;
  private readonly envCapabilitiesProvider_: IEnvCapabilitiesProvider;

  /**
   * You can pass your own implementations via dependencies.
   * - Pass your own logger, you have to implement ILogger interface.
   * @param dependencies - optional dependencies
   */
  public constructor(dependencies: PlayerDependencies = {}) {
    this.logger_ = dependencies.logger ?? new Logger(console, 'Player');
    this.configurationManager_ = dependencies.configurationManager ?? new ConfigurationManager();
    this.eventEmitter_ = dependencies.eventEmitter ?? new EventEmitter<EventTypeToEventMap>();
    this.envCapabilitiesProvider_ = dependencies.envCapabilitiesProvider ?? new EnvCapabilitiesProvider();
  }

  /**
   * MARK: Version API
   */

  /**
   * getter for version info object
   */
  public getVersionInfo(): VersionInfo {
    return {
      version: __VERSION,
      hash: __COMMIT_HASH,
      isExperimental: __EXPERIMENTAL,
    };
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
    this.eventEmitter_.emitEvent(new ConfigurationChangedEvent(this.getConfigurationSnapshot()));
  }

  /**
   * reset current configuration to default
   */
  public resetConfiguration(): void {
    this.configurationManager_.reset();
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
   * MARK: Env Capabilities API
   */

  /**
   * Probe env capabilities
   */
  public probeEnvCapabilities(): Promise<CapabilitiesProbeResult> {
    return this.envCapabilitiesProvider_.probe();
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
    // TODO: call pipeline stop

    this.activeSource_ = null;
  }

  /**
   * Cleanup everything and prepare the player instance to be safely garbage collected
   */
  public dispose(): void {
    this.detach();
    this.activePipeline_?.dispose();
    this.activePipeline_ = null;
  }

  /**
   * load source
   * @param source - source to load
   */
  public load(source: ISource): void {
    if (this.activeSource_ !== null) {
      this.stop('load');
    }

    this.activeSource_ = source;
    // TODO: pipeline load

    this.logger_.warn('no supported pipelines found for ', source.mimeType);
    this.eventEmitter_.emitEvent(new PlayerErrorEvent(new NoSupportedPipelineError(true)));
  }

  /**
   * current source getter
   */
  public getCurrentSource(): ISource | null {
    return this.activeSource_;
  }

  private readonly handleVolumeChange_ = (event: Event): void => {
    const target = event.target as HTMLVideoElement;

    this.eventEmitter_.emitEvent(new VolumeChangedEvent(target.volume));
  };

  /**
   * MARK: Playback API
   */

  /**
   * resume active playback session
   */
  public play(): void {
    return this.voidSafeAttemptOnPipeline_('play', (pipeline) => pipeline.play());
  }

  /**
   * pause active playback session
   */
  public pause(): void {
    return this.voidSafeAttemptOnPipeline_('pause', (pipeline) => pipeline.pause());
  }

  /**
   * seek to the provided seek target
   * should return false if seek target is out of available seekable ranges
   * @param seekTarget - seek target
   */
  public seek(seekTarget: number): boolean {
    return this.safeAttemptOnPipeline_(
      'seek',
      (pipeline) => {
        const seekableRanges = this.getSeekableRanges();
        const isValidSeekTarget = seekableRanges.some((timeRange) => timeRange.isInRangeInclusive(seekTarget));

        if (!isValidSeekTarget) {
          this.logger_.warn(
            `Provided seek target (${seekTarget}) is out of available seekable time ranges: `,
            seekableRanges.map((range) => range.toString()).join('\n')
          );
          return false;
        }

        return pipeline.seek(seekTarget);
      },
      false
    );
  }

  /**
   * current time getter
   */
  public getCurrentTime(): number {
    return this.safeAttemptOnPipeline_('getCurrentTime', (pipeline) => pipeline.getCurrentTime(), 0);
  }

  /**
   * playback rate getter
   */
  public getPlaybackRate(): number {
    return this.safeAttemptOnPipeline_('getCurrentTime', (pipeline) => pipeline.getPlaybackRate(), 0);
  }

  /**
   * playback rate setter
   * @param rate - playback rate
   */
  public setPlaybackRate(rate: number): void {
    return this.voidSafeAttemptOnPipeline_('setPlaybackRate', (pipeline) => pipeline.setPlaybackRate(rate));
  }

  /**
   * mute active playback session
   */
  public mute(): void {
    return this.voidSafeAttemptOnPipeline_('mute', (pipeline) => {
      if (pipeline.getIsMuted()) {
        // already muted
        return;
      }

      pipeline.mute();
      this.eventEmitter_.emitEvent(new MutedStatusChangedEvent(true));
    });
  }

  /**
   * unmute active playback session
   */
  public unmute(): void {
    return this.voidSafeAttemptOnPipeline_('unmute', (pipeline) => {
      if (!pipeline.getIsMuted()) {
        // already un-muted
        return;
      }

      pipeline.unmute();
      this.eventEmitter_.emitEvent(new MutedStatusChangedEvent(false));
    });
  }

  /**
   * muted status getter
   */
  public getIsMuted(): boolean {
    return this.safeAttemptOnPipeline_('getIsMuted', (pipeline) => pipeline.getIsMuted(), false);
  }

  /**
   * volume level getter
   */
  public getVolumeLevel(): number {
    return this.safeAttemptOnPipeline_('getVolumeLevel', (pipeline) => pipeline.getVolumeLevel(), 0);
  }

  /**
   * update volume level for the active playback session
   * @param volumeLevel - volume level
   */
  public setVolumeLevel(volumeLevel: number): void {
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

    return this.voidSafeAttemptOnPipeline_('setVolumeLevel', (pipeline) => pipeline.setVolumeLevel(level));
  }

  /**
   * current playback session duration getter
   */
  public getDuration(): number {
    return this.safeAttemptOnPipeline_('getDuration', (pipeline) => pipeline.getDuration(), 0);
  }

  /**
   * current playback session state getter
   */
  public getPlaybackState(): PlaybackState {
    if (this.activePipeline_) {
      return this.activePipeline_.getPlaybackState();
    }

    return PlaybackState.Idle;
  }

  /**
   * get snapshot of the seekable ranges from the active pipeline
   */
  public getSeekableRanges(): Array<PlayerTimeRange> {
    return this.safeAttemptOnPipeline_('getSeekableRanges', (pipeline) => pipeline.getSeekableRanges(), []);
  }

  /**
   * get snapshot of the current active seekable range:
   * current time is in range inclusively
   */
  public getActiveSeekableRange(): PlayerTimeRange | null {
    return this.getSeekableRanges().find((range) => range.isInRangeInclusive(this.getCurrentTime())) ?? null;
  }

  /**
   * get snapshot of the buffered ranges from the active pipeline
   */
  public getBufferedRanges(): Array<PlayerTimeRange> {
    return this.safeAttemptOnPipeline_('getBufferedRanges', (pipeline) => pipeline.getBufferedRanges(), []);
  }

  /**
   * get snapshot of the current active buffered range:
   * current time is in range inclusively
   */
  public getActiveBufferedRange(): PlayerTimeRange | null {
    return this.getBufferedRanges().find((range) => range.isInRangeInclusive(this.getCurrentTime())) ?? null;
  }

  /**
   * active playback session stats getter
   */
  public getPlaybackStats(): PlaybackStats {
    return this.safeAttemptOnPipeline_('getPlaybackStats', (pipeline) => pipeline.getPlaybackStats(), {
      bandwidth: 0,
      segmentsLoaded: 0,
    });
  }

  /**
   * MARK: Playback API -- Audio Tracks
   */

  /**
   * current playback session audio tracks getter
   */
  public getAudioTracks(): Array<IAudioTrack> {
    return this.safeAttemptOnPipeline_('getAudioTracks', (pipeline) => pipeline.getAudioTracks(), []);
  }

  /**
   * Active audio track getter
   */
  public getActiveAudioTrack(): IAudioTrack | null {
    return this.getAudioTracks().find((track) => track.isActive) ?? null;
  }

  /**
   * select audio track by id
   * @param id - track id
   */
  public selectAudioTrack(id: string): boolean {
    return this.safeAttemptOnPipeline_('selectAudioTrack', (pipeline) => pipeline.selectAudioTrack(id), false);
  }

  private safeAttemptOnPipeline_<T>(method: string, executor: (target: IPipeline) => T, fallback: T): T {
    if (this.activePipeline_ === null) {
      this.logger_.warn(
        `Attempt to call "${method}", but player does not have an active pipeline. Please call "load" first.`
      );

      return fallback;
    }

    return executor(this.activePipeline_);
  }

  private voidSafeAttemptOnPipeline_(method: string, executor: (target: IPipeline) => void): void {
    return this.safeAttemptOnPipeline_(method, executor, undefined);
  }
}
