import type PlayerError from './errors';
import type { LoggerLevel } from './utils/logger';

export const Events = {
  EnterPictureInPictureMode: 'EnterPictureInPictureMode',
  LeavePictureInPictureMode: 'LeavePictureInPictureMode',
  VolumeChanged: 'VolumeChanged',
  LoggerLevelChanged: 'LoggerLevelChanged',
  MutedStatusChanged: 'MutedStatusChanged',
  Error: 'Error',
} as const;

abstract class PlayerEvent {
  public abstract readonly type: (typeof Events)[keyof typeof Events];
}

export class VolumeChangedEvent extends PlayerEvent {
  public readonly type = Events.VolumeChanged;
  public readonly volume: number;

  public constructor(volume: number) {
    super();
    this.volume = volume;
  }
}

export class MutedStatusChangedEvent extends PlayerEvent {
  public readonly type = Events.MutedStatusChanged;
  public readonly isMuted: boolean;

  public constructor(isMuted: boolean) {
    super();
    this.isMuted = isMuted;
  }
}

export class LoggerLevelChangedEvent extends PlayerEvent {
  public readonly type = Events.LoggerLevelChanged;
  public readonly level: LoggerLevel;

  public constructor(level: LoggerLevel) {
    super();
    this.level = level;
  }
}

export class EnterPictureInPictureModeEvent extends PlayerEvent {
  public readonly type = Events.EnterPictureInPictureMode;
}

export class LeavePictureInPictureModeEvent extends PlayerEvent {
  public readonly type = Events.LeavePictureInPictureMode;
}

export class ErrorEvent extends PlayerEvent {
  public readonly type = Events.Error;
  public readonly error: PlayerError;

  public constructor(error: PlayerError) {
    super();
    this.error = error;
  }
}

export interface EventToTypeMap {
  [Events.LoggerLevelChanged]: LoggerLevelChangedEvent;
  [Events.VolumeChanged]: VolumeChangedEvent;
  [Events.MutedStatusChanged]: MutedStatusChangedEvent;
  [Events.EnterPictureInPictureMode]: EnterPictureInPictureModeEvent;
  [Events.LeavePictureInPictureMode]: LeavePictureInPictureModeEvent;
  [Events.Error]: ErrorEvent;
}
