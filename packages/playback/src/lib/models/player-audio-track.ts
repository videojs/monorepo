import type { AudioTrack, AudioTrackList, IPlayerAudioTrack } from '../types/audio-track.declarations';

export class PlayerAudioTrack implements IPlayerAudioTrack {
  public readonly id: string;
  public readonly kind: string;
  public readonly label: string;
  public readonly language: string;
  public readonly bitrate: number;
  public readonly codec: string;
  public readonly numberOfChannels: number;
  public readonly sampleRate: number;
  public readonly isActive: boolean;

  public constructor(audioTrack: AudioTrack) {
    this.id = audioTrack.id;
    this.kind = audioTrack.kind;
    this.label = audioTrack.label;
    this.language = audioTrack.language;
    this.bitrate = audioTrack.configuration?.bitrate ?? 0;
    this.codec = audioTrack.configuration?.codec ?? '';
    this.numberOfChannels = audioTrack.configuration?.numberOfChannels ?? 0;
    this.sampleRate = audioTrack.configuration?.sampleRate ?? 0;
    this.isActive = audioTrack.enabled;
  }

  public static fromAudioTracks(audioTrackList: AudioTrackList): Array<IPlayerAudioTrack> {
    const result = [];

    for (let i = 0; i < audioTrackList.length; i++) {
      result.push(new PlayerAudioTrack(audioTrackList[i]));
    }

    return result;
  }
}
