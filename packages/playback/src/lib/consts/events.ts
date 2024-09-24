// enums can be imported as types and as values,
// since they can be used as values they should not be in the types folder
export enum PlayerEventType {
  LoggerLevelChanged = 'LoggerLevelChanged',
  ConfigurationChanged = 'ConfigurationChanged',
  VolumeChanged = 'VolumeChanged',
  MutedStatusChanged = 'MutedStatusChanged',
  Error = 'Error',
  NetworkRequestStarted = 'NetworkRequestStarted',
  NetworkResponseCompletedSuccessfully = 'NetworkResponseCompletedSuccessfully',
  NetworkResponseCompletedUnsuccessfully = 'NetworkResponseCompletedUnsuccessfully',
  NetworkRequestFailed = 'NetworkRequestFailed',
}
