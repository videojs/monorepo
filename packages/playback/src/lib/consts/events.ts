// enums can be imported as types and as values,
// since they can be used as values they should not be in the types folder
export enum PlayerEventType {
  LoggerLevelChanged = 'LoggerLevelChanged',
  ConfigurationChanged = 'ConfigurationChanged',
  VolumeChanged = 'VolumeChanged',
  MutedStatusChanged = 'MutedStatusChanged',
  Error = 'Error',
  NetworkRequestAttemptStarted = 'NetworkRequestAttemptStarted',
  NetworkRequestAttemptCompletedSuccessfully = 'NetworkRequestAttemptCompletedSuccessfully',
  NetworkRequestAttemptCompletedUnsuccessfully = 'NetworkRequestAttemptCompletedUnsuccessfully',
  NetworkRequestAttemptFailed = 'NetworkRequestAttemptFailed',
}
