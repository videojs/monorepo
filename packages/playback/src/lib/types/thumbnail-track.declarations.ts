import type { IPlayerTextTrack } from './text-track.declarations';

export interface IPlayerThumbnailTrack extends IPlayerTextTrack {
  isActive: boolean;
}

export interface IRemoteVttThumbnailTrackOptions {
  url: URL;
}
