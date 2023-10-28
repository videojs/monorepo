import type { Encryption, Segment, VariantStream } from '@/hls-parser/types/parsedPlaylist';

export interface SharedState {
  // Used to persist EXT_X_BITRATE across segments
  currentBitrate?: number;
  currentEncryption?: Encryption;
  currentSegment: Segment;
  currentVariant: VariantStream;
  isMultivariantPlaylist: boolean;
}
