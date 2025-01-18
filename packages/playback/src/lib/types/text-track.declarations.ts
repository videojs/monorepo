import type { TextTrackKind } from '../consts/text-tracks';

export interface IPlayerTextTrack {
  readonly id: string;
  readonly activeCues: TextTrackCueList | null;
  readonly cues: TextTrackCueList | null;
  readonly kind: TextTrackKind;
  readonly label: string;
  readonly language: string;
  readonly mode: string;
}
