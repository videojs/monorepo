import type {
  Define,
  Encryption,
  MediaInitializationSection,
  Segment,
  VariantStream,
} from '@/hls-parser/types/parsedPlaylist';

export interface SharedState {
  define?: Define;
  parentUrl?: URL;
  // Used to persist EXT_X_BITRATE across segments
  currentBitrate?: number;
  currentEncryption?: Encryption;
  currentMap?: MediaInitializationSection;
  currentSegment: Segment;
  currentVariant: VariantStream;
  isMultivariantPlaylist: boolean;
}
