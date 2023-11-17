import type { Define, Encryption, MediaInitializationSection, Segment, VariantStream } from './parsedPlaylist';

export interface SharedState {
  currentBitrate?: number;
  currentEncryption?: Encryption;
  currentMap?: MediaInitializationSection;
  currentSegment: Segment;
  currentVariant: VariantStream;
  isMultivariantPlaylist: boolean;
  baseUrl?: URL;
  baseTime?: number;
  baseDefine?: Define;
}
