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
import { ConfigurationChangedEvent, LoggerLevelChangedEvent } from './events/playerEvents';
import type { CapabilitiesProbeResult, IEnvCapabilitiesProvider } from './types/envCapabilities.declarations';
import EnvCapabilitiesProvider from './utils/envCapabilities';

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
  public static LoggerLevel = LoggerLevel;
  public static Event = PlayerEventType;

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
   * Version API
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
   * Debug API
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
   * Configuration API
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
   * Events API
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
   * Probe env capabilities
   */
  public probeEnvCapabilities(): Promise<CapabilitiesProbeResult> {
    return this.envCapabilitiesProvider_.probe();
  }
}
