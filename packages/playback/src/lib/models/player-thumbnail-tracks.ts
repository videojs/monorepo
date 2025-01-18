import { TextTrackMode } from '../consts/text-tracks';
import type { IPlayerThumbnailTrack } from '../types/thumbnail-track.declarations';
import { PlayerTextTrack } from './player-text-tracks';

export class PlayerThumbnailTrack extends PlayerTextTrack implements IPlayerThumbnailTrack {
  public readonly isActive: boolean;

  public constructor(textTrack: TextTrack) {
    super(textTrack);
    this.isActive = this.mode !== TextTrackMode.Disabled;
  }

  public static fromTextTracks(textTrackList: TextTrackList): Array<PlayerThumbnailTrack> {
    const playerThumbnailTracks = [];
    for (let i = 0; i < textTrackList.length; i++) {
      if (textTrackList[i].label.startsWith('thumbnails')) {
        playerThumbnailTracks.push(new PlayerThumbnailTrack(textTrackList[i]));
      }
    }
    return playerThumbnailTracks;
  }
}
