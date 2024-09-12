import type { LoggerLevel } from '../consts/loggerLevel';

export interface ILogger {
  createSubLogger(subLabel: string): ILogger;

  setLoggerLevel(level: LoggerLevel): void;

  getLoggerLevel(): LoggerLevel;

  debug(...args: Array<unknown>): void;

  info(...args: Array<unknown>): void;

  warn(...args: Array<unknown>): void;

  error(...args: Array<unknown>): void;
}
