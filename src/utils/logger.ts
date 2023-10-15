export enum LoggerLevel {
  DEBUG,
  INFO,
  WARN,
  ERROR,
  OFF,
}

const style = 'background: #333; padding: 3px; color: #bada55';

export default class Logger {
  private readonly console: Console;
  private readonly label: string;

  private level: LoggerLevel = LoggerLevel.WARN;

  constructor(console: Console, label: string) {
    this.console = console;
    this.label = `%c${label}`;
  }

  createSubLogger(subLabel: string): Logger {
    return new Logger(this.console, this.label + ' > ' + subLabel);
  }

  setLoggerLevel(level: LoggerLevel): void {
    this.level = level;
  }

  getLoggerLevel(): LoggerLevel {
    return this.level;
  }

  debug(...args: unknown[]): void {
    if (this.level > LoggerLevel.DEBUG) {
      return;
    }

    this.console.debug(this.label, style, ...args);
  }

  info(...args: unknown[]): void {
    if (this.level > LoggerLevel.INFO) {
      return;
    }

    this.console.info(this.label, style, ...args);
  }

  warn(...args: unknown[]): void {
    if (this.level > LoggerLevel.WARN) {
      return;
    }

    this.console.warn(this.label, style, ...args);
  }

  error(...args: unknown[]): void {
    if (this.level > LoggerLevel.ERROR) {
      return;
    }

    this.console.error(this.label, style, ...args);
  }
}
