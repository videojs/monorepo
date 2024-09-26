export interface ITextTrack {
  id: string;
}

export interface ThumbnailTrack {
  id: string;
  isActive: boolean;
}

export interface RemoteVttThumbnailTrackOptions {
  url: URL;
}
