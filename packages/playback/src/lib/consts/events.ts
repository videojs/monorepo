// enums can be imported as types and as values,
// since they can be used as values they should not be in the types folder
export enum PlayerEventType {
  All = 'All',
  LoggerLevelChanged = 'LoggerLevelChanged',
  ConfigurationChanged = 'ConfigurationChanged',
  VolumeChanged = 'VolumeChanged',
  RateChanged = 'RateChanged',
  CurrentTimeChanged = 'CurrentTimeChanged',
  MutedStatusChanged = 'MutedStatusChanged',
  PlaybackStateChanged = 'PlaybackStateChanged',
  // EME Events
  Encrypted = 'Encrypted',
  WaitingForKey = 'WaitingForKey',
  KeySessionCreated = 'KeySessionCreated',
  KeySessionUpdated = 'KeySessionUpdated',
  KeySessionClosed = 'KeySessionClosed',
  KeySystemAccessRequested = 'KeySystemAccessRequested',
  Error = 'Error',
  // Network Events
  NetworkRequestAttemptStarted = 'NetworkRequestAttemptStarted',
  NetworkRequestAttemptCompletedSuccessfully = 'NetworkRequestAttemptCompletedSuccessfully',
  NetworkRequestAttemptCompletedUnsuccessfully = 'NetworkRequestAttemptCompletedUnsuccessfully',
  NetworkRequestAttemptFailed = 'NetworkRequestAttemptFailed',
  // Parse Events
  HlsPlaylistParsed = 'HlsPlaylistParsed',
  DashManifestParsed = 'DashManifestParsed',
}
