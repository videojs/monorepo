export enum LoggerLevel {
  Debug,
  Info,
  Warn,
  Error,
  Off,
}

const style = 'background: #333; padding: 3px; color: #bada55';

export default class Logger {
  private readonly console: Console;
  private readonly label: string;

  private level: LoggerLevel = LoggerLevel.Debug;

  public constructor(console: Console, label: string) {
    this.console = console;
    this.label = `%c${label}`;
  }

  public createSubLogger(subLabel: string): Logger {
    return new Logger(this.console, this.label + ' > ' + subLabel);
  }

  public setLoggerLevel(level: LoggerLevel): void {
    this.level = level;
  }

  public getLoggerLevel(): LoggerLevel {
    return this.level;
  }

  public debug(...args: Array<unknown>): void {
    if (this.level > LoggerLevel.Debug) {
      return;
    }

    this.console.debug(this.label, style, ...args);
  }

  public info(...args: Array<unknown>): void {
    if (this.level > LoggerLevel.Info) {
      return;
    }

    this.console.info(this.label, style, ...args);
  }

  public warn(...args: Array<unknown>): void {
    if (this.level > LoggerLevel.Warn) {
      return;
    }

    this.console.warn(this.label, style, ...args);
  }

  public error(...args: Array<unknown>): void {
    if (this.level > LoggerLevel.Error) {
      return;
    }

    this.console.error(this.label, style, ...args);
  }
}
