import type { Segment, VariantStream } from '@/hls-parser/types/parsedPlaylist';

export interface SharedState {
  // Used to persist EXT_X_BITRATE across segments
  currentBitrate?: number;
  currentSegment: Segment;
  currentVariant: VariantStream;
  isMultivariantPlaylist: boolean;
}
