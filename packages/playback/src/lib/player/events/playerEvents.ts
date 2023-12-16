import { Events } from '../consts/events';
import type { LoggerLevel } from '../../utils/logger';
import type PlayerError from '../errors/basePlayerError';

abstract class PlayerEvent {
  public abstract readonly type: keyof typeof Events;
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
