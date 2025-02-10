import { TextTrackKind } from '../consts/text-tracks';
import type { IPlayerTextTrack } from '../types/text-track.declarations';

export class PlayerTextTrack implements IPlayerTextTrack {
  public readonly id: string;
  public readonly activeCues: TextTrackCueList | null;
  public readonly cues: TextTrackCueList | null;
  public readonly kind: TextTrackKind;
  public readonly label: string;
  public readonly language: string;
  public readonly mode: string;

  public constructor(textTrack: TextTrack) {
    this.id = textTrack.id;
    this.activeCues = textTrack.activeCues;
    this.cues = textTrack.cues;
    this.kind = textTrack.kind as TextTrackKind;
    this.label = textTrack.label;
    this.language = textTrack.language;
    this.mode = textTrack.mode;
  }

  public static fromTextTracks(textTrackList: TextTrackList): Array<PlayerTextTrack> {
    const playerTextTracks = [];
    for (let i = 0; i < textTrackList.length; i++) {
      if (textTrackList[i].kind !== TextTrackKind.Metadata) {
        playerTextTracks.push(new PlayerTextTrack(textTrackList[i]));
      }
    }
    return playerTextTracks;
  }
}
