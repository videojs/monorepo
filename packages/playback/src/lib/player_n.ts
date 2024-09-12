import type { ILogger } from './types/logger.declarations';
import Logger from './utils/logger';
import { LoggerLevel } from './consts/loggerLevel';
import type { PlayerConfiguration } from './types/configuration.declarations';
import type { IStore } from './types/store.declarations';
import ConfigurationManager from './configuration/configurationManager';
import type { DeepPartial } from './types/utility.declarations';

interface PlayerDependencies {
  logger?: ILogger;
  configurationManager?: IStore<PlayerConfiguration>;
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

  private readonly logger_: ILogger;
  private readonly configurationManager_: IStore<PlayerConfiguration>;

  /**
   * You can pass your own implementations via dependencies.
   * - Pass your own logger, you have to implement ILogger interface.
   * @param dependencies - optional dependencies
   */
  public constructor(dependencies: PlayerDependencies = {}) {
    this.logger_ = dependencies.logger ?? new Logger(console, 'Player');
    this.configurationManager_ = dependencies.configurationManager ?? new ConfigurationManager();
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
    // TODO: emit logger level changed event
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
    // TODO: emit configuration change (prev, new)
  }

  /**
   * reset current configuration to default
   */
  public resetConfiguration(): void {
    this.configurationManager_.reset();
    // TODO: emit configuration change (prev, new)
  }
}
