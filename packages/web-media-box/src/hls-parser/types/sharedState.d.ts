import type { Encryption, MediaInitializationSection, Segment, VariantStream } from '@/hls-parser/types/parsedPlaylist';

export interface SharedState {
  // Used to persist EXT_X_BITRATE across segments
  currentBitrate?: number;
  currentEncryption?: Encryption;
  currentMap?: MediaInitializationSection;
  currentSegment: Segment;
  currentVariant: VariantStream;
  isMultivariantPlaylist: boolean;
}
