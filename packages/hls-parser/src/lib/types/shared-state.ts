import type { Define, Encryption, MediaInitializationSection, Segment, VariantStream } from './parsed-playlist';

export interface SharedState {
  currentBitrate?: number;
  currentEncryption?: Encryption;
  currentMap?: MediaInitializationSection;
  currentSegment: Segment;
  currentVariant: VariantStream;
  isMultivariantPlaylist: boolean;
  baseUrl: string;
  baseTime: number;
  baseDefine?: Define;
  hasVariablesForSubstitution: boolean;
}
