// mapping for types purposes
import type { PlayerEventType } from '../consts/events';
import type {
  ConfigurationChangedEvent,
  LoggerLevelChangedEvent,
  MutedStatusChangedEvent,
  VolumeChangedEvent,
  PlayerErrorEvent,
} from '../events/player-events';
import type {
  NetworkRequestAttemptCompletedSuccessfullyEvent,
  NetworkRequestAttemptCompletedUnsuccessfullyEvent,
  NetworkRequestAttemptFailedEvent,
  NetworkRequestAttemptStartedEvent,
} from '../events/network-events';

export interface NetworkEventMap {
  [PlayerEventType.NetworkRequestAttemptStarted]: NetworkRequestAttemptStartedEvent;
  [PlayerEventType.NetworkRequestAttemptCompletedSuccessfully]: NetworkRequestAttemptCompletedSuccessfullyEvent;
  [PlayerEventType.NetworkRequestAttemptCompletedUnsuccessfully]: NetworkRequestAttemptCompletedUnsuccessfullyEvent;
  [PlayerEventType.NetworkRequestAttemptFailed]: NetworkRequestAttemptFailedEvent;
}

export interface PlayerEventMap {
  [PlayerEventType.LoggerLevelChanged]: LoggerLevelChangedEvent;
  [PlayerEventType.VolumeChanged]: VolumeChangedEvent;
  [PlayerEventType.ConfigurationChanged]: ConfigurationChangedEvent;
  [PlayerEventType.MutedStatusChanged]: MutedStatusChangedEvent;
  [PlayerEventType.Error]: PlayerErrorEvent;
}

export type EventTypeToEventMap = NetworkEventMap & PlayerEventMap;
