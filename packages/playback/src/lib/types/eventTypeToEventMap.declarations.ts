// mapping for types purposes
import type { PlayerEventType } from '../consts/events';
import type {
  ConfigurationChangedEvent,
  LoggerLevelChangedEvent,
  MutedStatusChangedEvent,
  VolumeChangedEvent,
  PlayerErrorEvent,
} from '../events/playerEvents';
import type {
  NetworkResponseCompletedSuccessfullyEvent,
  NetworkResponseCompletedUnsuccessfullyEvent,
  NetworkRequestFailedEvent,
  NetworkRequestStartedEvent,
} from '../events/networkEvents';

export interface NetworkEventMap {
  [PlayerEventType.NetworkRequestStarted]: NetworkRequestStartedEvent;
  [PlayerEventType.NetworkResponseCompletedSuccessfully]: NetworkResponseCompletedSuccessfullyEvent;
  [PlayerEventType.NetworkResponseCompletedUnsuccessfully]: NetworkResponseCompletedUnsuccessfullyEvent;
  [PlayerEventType.NetworkRequestFailed]: NetworkRequestFailedEvent;
}

export interface PlayerEventMap {
  [PlayerEventType.LoggerLevelChanged]: LoggerLevelChangedEvent;
  [PlayerEventType.VolumeChanged]: VolumeChangedEvent;
  [PlayerEventType.ConfigurationChanged]: ConfigurationChangedEvent;
  [PlayerEventType.MutedStatusChanged]: MutedStatusChangedEvent;
  [PlayerEventType.Error]: PlayerErrorEvent;
}

export type EventTypeToEventMap = NetworkEventMap & PlayerEventMap;
