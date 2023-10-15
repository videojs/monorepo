export const Events = {
  EnterPictureInPictureMode: 'EnterPictureInPictureMode',
  LeavePictureInPictureMode: 'LeavePictureInPictureMode',
} as const;

abstract class PlayerEvent {
  abstract readonly type: (typeof Events)[keyof typeof Events];
}

export class EnterPictureInPictureModeEvent extends PlayerEvent {
  readonly type = Events.EnterPictureInPictureMode;
}

export class LeavePictureInPictureModeEvent extends PlayerEvent {
  readonly type = Events.LeavePictureInPictureMode;
}

export interface EventToTypeMap {
  [Events.EnterPictureInPictureMode]: EnterPictureInPictureModeEvent;
  [Events.LeavePictureInPictureMode]: LeavePictureInPictureModeEvent;
}
