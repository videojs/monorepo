import type { LoggerLevel } from '../consts/logger-level';

export interface ILogger {
  readonly label: string;

  createSubLogger(subLabel: string): ILogger;

  setLoggerLevel(level: LoggerLevel): void;

  getLoggerLevel(): LoggerLevel;

  debug(...args: Array<unknown>): void;

  info(...args: Array<unknown>): void;

  warn(...args: Array<unknown>): void;

  error(...args: Array<unknown>): void;
}
