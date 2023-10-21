import type PlayerError from '@/player/errors.ts';

export const Events = {
  EnterPictureInPictureMode: 'EnterPictureInPictureMode',
  LeavePictureInPictureMode: 'LeavePictureInPictureMode',
  Error: 'Error',
} as const;

abstract class PlayerEvent {
  public abstract readonly type: (typeof Events)[keyof typeof Events];
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
  [Events.EnterPictureInPictureMode]: EnterPictureInPictureModeEvent;
  [Events.LeavePictureInPictureMode]: LeavePictureInPictureModeEvent;
  [Events.Error]: ErrorEvent;
}
