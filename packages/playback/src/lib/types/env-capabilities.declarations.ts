import type { KeySystem } from '../consts/key-system';
import type { StreamingProtocol } from '../consts/streaming-protocol';
import type { Container } from '../consts/container';
import type { AudioCodecs, VideoCodecs } from '../consts/codecs';

export interface IEnvCapabilitiesContext {
  readonly location: Location;
  readonly navigator: Navigator;
  readonly isSecureContext: boolean;
  readonly MediaSource?: { isTypeSupported: (type: string) => boolean };
  readonly transmuxer?: { isTypeSupported: (type: string) => boolean };
}

export interface IKeySystemCapabilities {
  persistent: boolean;
  basic: boolean;
}

export interface IEmeCapabilities {
  [KeySystem.Widevine]: IKeySystemCapabilities;
  [KeySystem.Playready]: IKeySystemCapabilities;
  [KeySystem.Fairplay]: IKeySystemCapabilities;
  [KeySystem.FairplayLegacy]: IKeySystemCapabilities;
}

export interface IStreamingProtocolCapabilities {
  mse: boolean;
  native: boolean;
}

export interface StreamingCapabilities {
  [StreamingProtocol.Hls]: IStreamingProtocolCapabilities;
  [StreamingProtocol.Dash]: IStreamingProtocolCapabilities;
  [StreamingProtocol.Hss]: IStreamingProtocolCapabilities;
}

export interface ICodecCapabilities {
  mse: boolean;
  native: boolean;
  transmuxer: boolean;
  // we could add profiles for each mse/native support
  // but this might be overkill,
  // lets consider baseline profile support here
}

export interface IMp4VideoCodecsCapabilities {
  // 'video/mp4; codecs="avc1.42E01E"'
  [VideoCodecs.H264]: ICodecCapabilities;
  // 'video/mp4; codecs="hvc1.1.6.L93.90"'
  [VideoCodecs.H265]: ICodecCapabilities;
  // 'video/mp4; codecs="vp09.00.10.08"'
  [VideoCodecs.Vp9]: ICodecCapabilities;
}

export interface IMp4AudioCodecsCapabilities {
  // 'audio/mp4; codecs="mp4a.40.2"'
  [AudioCodecs.Aac]: ICodecCapabilities;
  // 'audio/mp4; codecs="ac-3"'
  [AudioCodecs.Ac3]: ICodecCapabilities;
  // 'audio/mp4; codecs="ec-3"'
  [AudioCodecs.Ec3]: ICodecCapabilities;
  // 'audio/mp4; codecs="opus"'
  [AudioCodecs.Opus]: ICodecCapabilities;
  // 'audio/mp4; codecs="flac"'
  [AudioCodecs.Flac]: ICodecCapabilities;
}

export interface IOggVideoCodecsCapabilities {
  // 'video/ogg; codecs="theora"'
  [VideoCodecs.Theora]: ICodecCapabilities;
  // 'video/ogg; codecs="vp8"'
  [VideoCodecs.Vp8]: ICodecCapabilities;
  // 'video/ogg; codecs="vp9"'
  [VideoCodecs.Vp9]: ICodecCapabilities;
}

export interface IOggAudioCodecsCapabilities {
  // 'audio/ogg; codecs="flac"'
  [AudioCodecs.Flac]: ICodecCapabilities;
  // 'audio/ogg; codecs="opus"'
  [AudioCodecs.Opus]: ICodecCapabilities;
  // 'audio/ogg; codecs="vorbis"'
  [AudioCodecs.Vorbis]: ICodecCapabilities;
}

export interface IWebMVideoCodecsCapabilities {
  // 'video/webm; codecs="vp8"'
  [VideoCodecs.Vp8]: ICodecCapabilities;
  // 'video/webm; codecs="vp9"'
  [VideoCodecs.Vp9]: ICodecCapabilities;
}

export interface IWebMAudioCodecsCapabilities {
  // 'audio/webm; codecs="vorbis"'
  [AudioCodecs.Vorbis]: ICodecCapabilities;
  // 'audio/webm; codecs="opus"'
  [AudioCodecs.Opus]: ICodecCapabilities;
}

export interface IMpeg2tsVideoCodecsCapabilities {
  // 'video/mp2t; codecs="avc1.42E01E"'
  [VideoCodecs.H264]: ICodecCapabilities;
  // 'video/mp2t; codecs="hvc1.1.6.L93.90"'
  [VideoCodecs.H265]: ICodecCapabilities;
}

// Should use video/mp2t for audio codecs as well,
// see: https://w3c.github.io/mse-byte-stream-format-mp2t/#mime-parameters
export interface IMpeg2tsAudioCodecsCapabilities {
  // 'video/mp2t; codecs="mp4a.40.2"'
  [AudioCodecs.Aac]: ICodecCapabilities;
  // 'video/mp2t; codecs="ac-3"'
  [AudioCodecs.Ac3]: ICodecCapabilities;
  // 'video/mp2t; codecs="ec-3"'
  [AudioCodecs.Ec3]: ICodecCapabilities;
}

export interface IContainerCapabilities<V, A> {
  video: V;
  audio: A;
}

export interface IMediaCapabilities {
  [Container.Mp4]: IContainerCapabilities<IMp4VideoCodecsCapabilities, IMp4AudioCodecsCapabilities>;
  [Container.Ogg]: IContainerCapabilities<IOggVideoCodecsCapabilities, IOggAudioCodecsCapabilities>;
  [Container.WebM]: IContainerCapabilities<IWebMVideoCodecsCapabilities, IWebMAudioCodecsCapabilities>;
  [Container.Mpeg2Ts]: IContainerCapabilities<IMpeg2tsVideoCodecsCapabilities, IMpeg2tsAudioCodecsCapabilities>;
}

export interface ICapabilitiesProbeResult {
  isSecureContext: boolean;
  isHttps: boolean;
  eme: IEmeCapabilities;
  streaming: StreamingCapabilities;
  media: IMediaCapabilities;
}

export interface IEnvCapabilitiesProvider {
  probe(): Promise<ICapabilitiesProbeResult>;
}
