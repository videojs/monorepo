// mapping for types purposes
import type { PlayerEventType } from '../../consts/events';
import type {
  ConfigurationChangedEvent,
  LoggerLevelChangedEvent,
  MutedStatusChangedEvent,
  VolumeChangedEvent,
  ErrorEvent,
  RateChangedEvent,
  CurrentTimeChangedEvent,
  PlaybackStateChangedEvent,
} from '../../events/player-events';
import type {
  NetworkRequestAttemptCompletedSuccessfullyEvent,
  NetworkRequestAttemptCompletedUnsuccessfullyEvent,
  NetworkRequestAttemptFailedEvent,
  NetworkRequestAttemptStartedEvent,
} from '../../events/network-events';
import type { PlayerEvent } from '../../events/base-player-event';
import type { EncryptedEvent, WaitingForKeyEvent } from '../../events/eme-events';

export interface NetworkEventMap {
  [PlayerEventType.NetworkRequestAttemptStarted]: NetworkRequestAttemptStartedEvent;
  [PlayerEventType.NetworkRequestAttemptCompletedSuccessfully]: NetworkRequestAttemptCompletedSuccessfullyEvent;
  [PlayerEventType.NetworkRequestAttemptCompletedUnsuccessfully]: NetworkRequestAttemptCompletedUnsuccessfullyEvent;
  [PlayerEventType.NetworkRequestAttemptFailed]: NetworkRequestAttemptFailedEvent;
}

export interface PlayerEventMap {
  [PlayerEventType.All]: PlayerEvent;
  [PlayerEventType.LoggerLevelChanged]: LoggerLevelChangedEvent;
  [PlayerEventType.VolumeChanged]: VolumeChangedEvent;
  [PlayerEventType.RateChanged]: RateChangedEvent;
  [PlayerEventType.CurrentTimeChanged]: CurrentTimeChangedEvent;
  [PlayerEventType.ConfigurationChanged]: ConfigurationChangedEvent;
  [PlayerEventType.MutedStatusChanged]: MutedStatusChangedEvent;
  [PlayerEventType.PlaybackStateChanged]: PlaybackStateChangedEvent;
  [PlayerEventType.Encrypted]: EncryptedEvent;
  [PlayerEventType.WaitingForKey]: WaitingForKeyEvent;
  [PlayerEventType.Error]: ErrorEvent;
}

export type EventTypeToEventMap = NetworkEventMap & PlayerEventMap;
