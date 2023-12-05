import type PlayerError from './errors';

export const Events = {
  EnterPictureInPictureMode: 'EnterPictureInPictureMode',
  LeavePictureInPictureMode: 'LeavePictureInPictureMode',
  VolumeChanged: 'VolumeChanged',
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
  [Events.VolumeChanged]: VolumeChangedEvent;
  [Events.EnterPictureInPictureMode]: EnterPictureInPictureModeEvent;
  [Events.LeavePictureInPictureMode]: LeavePictureInPictureModeEvent;
  [Events.Error]: ErrorEvent;
}
