export interface IPlayerAudioTrack {
  readonly id: string;
  readonly kind: string;
  readonly label: string;
  readonly language: string;
  readonly bitrate: number;
  readonly codec: string;
  readonly numberOfChannels: number;
  readonly sampleRate: number;
  readonly isActive: boolean;
}

export interface AudioTrackConfiguration {
  readonly bitrate: number;
  readonly codec: string;
  readonly numberOfChannels: number;
  readonly sampleRate: number;
}

export interface AudioTrack {
  enabled: boolean;
  readonly id: string;
  readonly kind: string;
  readonly label: string;
  readonly language: string;
  readonly configuration?: AudioTrackConfiguration;
}

export interface AudioTrackEvent extends Event {
  readonly track: AudioTrack | null;
}

export interface AudioTrackListEventMap {
  addtrack: AudioTrackEvent;
  change: Event;
  removetrack: AudioTrackEvent;
}

export interface AudioTrackList extends EventTarget, Iterable<AudioTrack> {
  readonly length: number;
  getTrackById(id: string): AudioTrack | null;
  addEventListener<K extends keyof AudioTrackListEventMap>(
    type: K,
    listener: (this: AudioTrackList, ev: AudioTrackListEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener<K extends keyof AudioTrackListEventMap>(
    type: K,
    listener: (this: AudioTrackList, ev: AudioTrackListEventMap[K]) => void,
    options?: boolean | EventListenerOptions
  ): void;
  [index: number]: AudioTrack;
}

declare global {
  interface HTMLVideoElement {
    audioTracks?: AudioTrackList;
  }
}
