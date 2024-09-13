// mapping for types purposes
import type { PlayerEventType } from '../consts/events';
import type {
  ConfigurationChangedEvent,
  LoggerLevelChangedEvent,
  MutedStatusChangedEvent,
  VolumeChangedEvent,
} from '../events/player';

export interface EventTypeToEventMap {
  [PlayerEventType.LoggerLevelChanged]: LoggerLevelChangedEvent;
  [PlayerEventType.VolumeChanged]: VolumeChangedEvent;
  [PlayerEventType.ConfigurationChanged]: ConfigurationChangedEvent;
  [PlayerEventType.MutedStatusChanged]: MutedStatusChangedEvent;
}
