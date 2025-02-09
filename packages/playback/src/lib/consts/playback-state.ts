// enums can be imported as types and as values,
// since they can be used as values they should not be in the types folder
export enum PlaybackState {
  Idle = 'Idle',
  Loading = 'Loading',
  Playing = 'Playing',
  Paused = 'Paused',
  Buffering = 'Buffering',
}
