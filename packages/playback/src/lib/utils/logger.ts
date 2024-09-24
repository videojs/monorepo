import { LoggerLevel } from '../consts/loggerLevel';
import type { ILogger } from '../types/logger.declarations';

const style = 'background: #333; padding: 3px; color: #bada55';

export interface LoggerDependencies {
  console: Console;
  label: string;
  delimiter: string;
}

export class Logger implements ILogger {
  private readonly console_: Console;
  private readonly label_: string;
  private readonly delimiter_: string;

  private level_: LoggerLevel = LoggerLevel.Debug;

  public constructor(dependencies: LoggerDependencies) {
    this.console_ = dependencies.console;
    this.label_ = `%c${dependencies.label}`;
    this.delimiter_ = dependencies.delimiter;
  }

  public createSubLogger(subLabel: string): Logger {
    return new Logger({
      console: this.console_,
      label: `${this.label_} ${this.delimiter_} ${subLabel}`,
      delimiter: this.delimiter_,
    });
  }

  public setLoggerLevel(level: LoggerLevel): void {
    this.level_ = level;
  }

  public getLoggerLevel(): LoggerLevel {
    return this.level_;
  }

  public debug(...args: Array<unknown>): void {
    if (this.level_ > LoggerLevel.Debug) {
      return;
    }

    this.console_.debug(this.label_, style, ...args);
  }

  public info(...args: Array<unknown>): void {
    if (this.level_ > LoggerLevel.Info) {
      return;
    }

    this.console_.info(this.label_, style, ...args);
  }

  public warn(...args: Array<unknown>): void {
    if (this.level_ > LoggerLevel.Warn) {
      return;
    }

    this.console_.warn(this.label_, style, ...args);
  }

  public error(...args: Array<unknown>): void {
    if (this.level_ > LoggerLevel.Error) {
      return;
    }

    this.console_.error(this.label_, style, ...args);
  }
}
