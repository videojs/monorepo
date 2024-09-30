import type { KeySystem } from '../consts/key-system';
import type { StreamingProtocol } from '../consts/streaming-protocol';
import type { Container } from '../consts/container';
import type { AudioCodecs, VideoCodecs } from '../consts/codecs';

export interface KeySystemCapabilities {
  persistent: boolean;
  basic: boolean;
}

export interface EmeCapabilities {
  [KeySystem.Widevine]: KeySystemCapabilities;
  [KeySystem.Playready]: KeySystemCapabilities;
  [KeySystem.Fairplay]: KeySystemCapabilities;
  [KeySystem.FairplayLegacy]: KeySystemCapabilities;
}

export interface StreamingProtocolCapabilities {
  mse: boolean;
  native: boolean;
}

export interface StreamingCapabilities {
  [StreamingProtocol.Hls]: StreamingProtocolCapabilities;
  [StreamingProtocol.Dash]: StreamingProtocolCapabilities;
  [StreamingProtocol.Hss]: StreamingProtocolCapabilities;
}

export interface CodecCapabilities {
  mse: boolean;
  native: boolean;
  transmuxer: boolean;
  // we could add profiles for each mse/native support
  // but this might be overkill,
  // lets consider baseline profile support here
}

export interface Mp4VideoCodecsCapabilities {
  // 'video/mp4; codecs="avc1.42E01E"'
  [VideoCodecs.H264]: CodecCapabilities;
  // 'video/mp4; codecs="hvc1.1.6.L93.90"'
  [VideoCodecs.H265]: CodecCapabilities;
  // 'video/mp4; codecs="vp09.00.10.08"'
  [VideoCodecs.Vp9]: CodecCapabilities;
}

export interface Mp4AudioCodecsCapabilities {
  // 'audio/mp4; codecs="mp4a.40.2"'
  [AudioCodecs.Aac]: CodecCapabilities;
  // 'audio/mp4; codecs="ac-3"'
  [AudioCodecs.Ac3]: CodecCapabilities;
  // 'audio/mp4; codecs="ec-3"'
  [AudioCodecs.Ec3]: CodecCapabilities;
  // 'audio/mp4; codecs="opus"'
  [AudioCodecs.Opus]: CodecCapabilities;
  // 'audio/mp4; codecs="flac"'
  [AudioCodecs.Flac]: CodecCapabilities;
}

export interface OggVideoCodecsCapabilities {
  // 'video/ogg; codecs="theora"'
  [VideoCodecs.Theora]: CodecCapabilities;
  // 'video/ogg; codecs="vp8"'
  [VideoCodecs.Vp8]: CodecCapabilities;
  // 'video/ogg; codecs="vp9"'
  [VideoCodecs.Vp9]: CodecCapabilities;
}

export interface OggAudioCodecsCapabilities {
  // 'audio/ogg; codecs="flac"'
  [AudioCodecs.Flac]: CodecCapabilities;
  // 'audio/ogg; codecs="opus"'
  [AudioCodecs.Opus]: CodecCapabilities;
  // 'audio/ogg; codecs="vorbis"'
  [AudioCodecs.Vorbis]: CodecCapabilities;
}

export interface WebMVideoCodecsCapabilities {
  // 'video/webm; codecs="vp8"'
  [VideoCodecs.Vp8]: CodecCapabilities;
  // 'video/webm; codecs="vp9"'
  [VideoCodecs.Vp9]: CodecCapabilities;
}

export interface WebMAudioCodecsCapabilities {
  // 'audio/webm; codecs="vorbis"'
  [AudioCodecs.Vorbis]: CodecCapabilities;
  // 'audio/webm; codecs="opus"'
  [AudioCodecs.Opus]: CodecCapabilities;
}

export interface Mpeg2tsVideoCodecsCapabilities {
  // 'video/mp2t; codecs="avc1.42E01E"'
  [VideoCodecs.H264]: CodecCapabilities;
  // 'video/mp2t; codecs="hvc1.1.6.L93.90"'
  [VideoCodecs.H265]: CodecCapabilities;
}

// Should use video/mp2t for audio codecs as well,
// see: https://w3c.github.io/mse-byte-stream-format-mp2t/#mime-parameters
export interface Mpeg2tsAudioCodecsCapabilities {
  // 'video/mp2t; codecs="mp4a.40.2"'
  [AudioCodecs.Aac]: CodecCapabilities;
  // 'video/mp2t; codecs="ac-3"'
  [AudioCodecs.Ac3]: CodecCapabilities;
  // 'video/mp2t; codecs="ec-3"'
  [AudioCodecs.Ec3]: CodecCapabilities;
}

export interface ContainerCapabilities<V, A> {
  video: V;
  audio: A;
}

export interface MediaCapabilities {
  [Container.Mp4]: ContainerCapabilities<Mp4VideoCodecsCapabilities, Mp4AudioCodecsCapabilities>;
  [Container.Ogg]: ContainerCapabilities<OggVideoCodecsCapabilities, OggAudioCodecsCapabilities>;
  [Container.WebM]: ContainerCapabilities<WebMVideoCodecsCapabilities, WebMAudioCodecsCapabilities>;
  [Container.Mpeg2Ts]: ContainerCapabilities<Mpeg2tsVideoCodecsCapabilities, Mpeg2tsAudioCodecsCapabilities>;
}

export interface CapabilitiesProbeResult {
  isSecureContext: boolean;
  isHttps: boolean;
  eme: EmeCapabilities;
  streaming: StreamingCapabilities;
  media: MediaCapabilities;
}

export interface IEnvCapabilitiesProvider {
  probe(): Promise<CapabilitiesProbeResult>;
}
