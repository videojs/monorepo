import type { ILogger } from './types/logger';
import Logger from './utils/logger';
import { LoggerLevel } from './consts/loggerLevel';

interface PlayerDependencies {
  logger?: ILogger;
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

  public constructor(dependencies: PlayerDependencies = {}) {
    this.logger_ = dependencies.logger ?? new Logger(console, 'Player');
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
  }
}
