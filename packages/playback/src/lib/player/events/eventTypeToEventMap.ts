import type { Events } from '../consts/events';
import type {
  EnterPictureInPictureModeEvent,
  LeavePictureInPictureModeEvent,
  LoggerLevelChangedEvent,
  MutedStatusChangedEvent,
  VolumeChangedEvent,
  ErrorEvent,
} from './playerEvents';

export interface EventTypeToEventMap {
  [Events.LoggerLevelChanged]: LoggerLevelChangedEvent;
  [Events.VolumeChanged]: VolumeChangedEvent;
  [Events.MutedStatusChanged]: MutedStatusChangedEvent;
  [Events.EnterPictureInPictureMode]: EnterPictureInPictureModeEvent;
  [Events.LeavePictureInPictureMode]: LeavePictureInPictureModeEvent;
  [Events.Error]: ErrorEvent;
}
