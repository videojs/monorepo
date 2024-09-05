export enum LoggerLevel {
  Debug,
  Info,
  Warn,
  Error,
  Off,
}

const style = 'background: #333; padding: 3px; color: #bada55';

export default class Logger {
  private readonly console_: Console;
  private readonly label_: string;

  private level_: LoggerLevel = LoggerLevel.Debug;

  public constructor(console: Console, label: string) {
    this.console_ = console;
    this.label_ = `%c${label}`;
  }

  public createSubLogger(subLabel: string): Logger {
    return new Logger(this.console_, this.label_ + ' > ' + subLabel);
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
