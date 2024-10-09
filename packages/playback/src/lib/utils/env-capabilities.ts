import type {
  ICapabilitiesProbeResult,
  ICodecCapabilities,
  IEnvCapabilitiesContext,
  IEnvCapabilitiesProvider,
} from '../types/env-capabilities.declarations';
import { KeySystem } from '../consts/key-system';
import { StreamingProtocol } from '../consts/streaming-protocol';
import { DashMimeType, HlsVndMpegMimeType, HlsXMpegMimeType, HssMimeType } from '../consts/mime-type';
import { Container } from '../consts/container';
import { AudioCodecs, VideoCodecs } from '../consts/codecs';

const basicEmeVideoCapabilities = [{ contentType: 'video/mp4; codecs="avc1.42E01E"' }];
const basicEmeAudioCapabilities = [{ contentType: 'audio/mp4;codecs="mp4a.40.2"' }];

const basicEmeConfig = {
  initDataTypes: ['cenc'],
  videoCapabilities: basicEmeVideoCapabilities,
  audioCapabilities: basicEmeAudioCapabilities,
};
const persistentEmeConfig = {
  videoCapabilities: basicEmeVideoCapabilities,
  audioCapabilities: basicEmeAudioCapabilities,
  persistentState: 'required',
  sessionTypes: ['persistent-license'],
};

export class EnvCapabilitiesProvider implements IEnvCapabilitiesProvider {
  private readonly context_: IEnvCapabilitiesContext;
  private readonly videoElement_: HTMLVideoElement;

  public constructor(context: IEnvCapabilitiesContext, videoElement: HTMLVideoElement) {
    this.context_ = context;
    this.videoElement_ = videoElement;
  }

  public async probe(): Promise<ICapabilitiesProbeResult> {
    const probeResult: ICapabilitiesProbeResult = {
      isSecureContext: false,
      isHttps: false,
      eme: {
        [KeySystem.Widevine]: { persistent: false, basic: false },
        [KeySystem.Playready]: { persistent: false, basic: false },
        [KeySystem.Fairplay]: { persistent: false, basic: false },
        [KeySystem.FairplayLegacy]: { persistent: false, basic: false },
      },
      streaming: {
        [StreamingProtocol.Hls]: { mse: false, native: false },
        [StreamingProtocol.Dash]: { mse: false, native: false },
        [StreamingProtocol.Hss]: { mse: false, native: false },
      },
      // TODO: update transmuxer support once transmuxers are implemented
      media: {
        [Container.Mp4]: {
          video: {
            [VideoCodecs.H264]: { mse: false, native: false, transmuxer: false },
            [VideoCodecs.H265]: { mse: false, native: false, transmuxer: false },
            [VideoCodecs.Vp9]: { mse: false, native: false, transmuxer: false },
          },
          audio: {
            [AudioCodecs.Aac]: { mse: false, native: false, transmuxer: false },
            [AudioCodecs.Ac3]: { mse: false, native: false, transmuxer: false },
            [AudioCodecs.Ec3]: { mse: false, native: false, transmuxer: false },
            [AudioCodecs.Opus]: { mse: false, native: false, transmuxer: false },
            [AudioCodecs.Flac]: { mse: false, native: false, transmuxer: false },
          },
        },
        [Container.Ogg]: {
          video: {
            [VideoCodecs.Theora]: { mse: false, native: false, transmuxer: false },
            [VideoCodecs.Vp8]: { mse: false, native: false, transmuxer: false },
            [VideoCodecs.Vp9]: { mse: false, native: false, transmuxer: false },
          },
          audio: {
            [AudioCodecs.Opus]: { mse: false, native: false, transmuxer: false },
            [AudioCodecs.Vorbis]: { mse: false, native: false, transmuxer: false },
            [AudioCodecs.Flac]: { mse: false, native: false, transmuxer: false },
          },
        },
        [Container.WebM]: {
          video: {
            [VideoCodecs.Vp8]: { mse: false, native: false, transmuxer: false },
            [VideoCodecs.Vp9]: { mse: false, native: false, transmuxer: false },
          },
          audio: {
            [AudioCodecs.Opus]: { mse: false, native: false, transmuxer: false },
            [AudioCodecs.Vorbis]: { mse: false, native: false, transmuxer: false },
          },
        },
        [Container.Mpeg2Ts]: {
          video: {
            [VideoCodecs.H264]: { mse: false, native: false, transmuxer: false },
            [VideoCodecs.H265]: { mse: false, native: false, transmuxer: false },
          },
          audio: {
            [AudioCodecs.Aac]: { mse: false, native: false, transmuxer: false },
            [AudioCodecs.Ac3]: { mse: false, native: false, transmuxer: false },
            [AudioCodecs.Ec3]: { mse: false, native: false, transmuxer: false },
          },
        },
      },
    };

    await Promise.all([
      this.probeSecureContext_(probeResult),
      this.probeIsHttps_(probeResult),
      this.probeEmeCapabilities_(probeResult),
      this.probeMediaCapabilities_(probeResult),
      this.probeStreamingProtocolsCapabilities_(probeResult),
    ]);

    return probeResult;
  }

  protected async probeStreamingProtocolsCapabilities_(probeResult: ICapabilitiesProbeResult): Promise<void> {
    // we consider that we support hls and dash in any MSE context
    // we do not support HSS in MSE context, so it should always be false
    probeResult.streaming.hls.mse = 'MediaSource' in this.context_;
    probeResult.streaming.dash.mse = 'MediaSource' in this.context_;
    probeResult.streaming.hss.mse = false;

    probeResult.streaming.hls.native =
      Boolean(this.videoElement_.canPlayType(HlsVndMpegMimeType)) ||
      Boolean(this.videoElement_.canPlayType(HlsXMpegMimeType));

    probeResult.streaming.dash.native = Boolean(this.videoElement_.canPlayType(DashMimeType));
    probeResult.streaming.hss.native = Boolean(this.videoElement_.canPlayType(HssMimeType));
  }

  protected async probeMediaCapabilities_(probeResult: ICapabilitiesProbeResult): Promise<void> {
    const getCodecsCapabilities = (probeData: { mime: string }): ICodecCapabilities => {
      const { mime } = probeData;
      const mse = Boolean(this.context_.MediaSource && this.context_.MediaSource.isTypeSupported(mime));
      const native = Boolean(this.videoElement_.canPlayType(mime));
      const transmuxer = Boolean(this.context_.transmuxer && this.context_.transmuxer.isTypeSupported(mime));

      return { mse, native, transmuxer };
    };

    // MP4 -> VIDEO
    probeResult.media.mp4.video.h264 = getCodecsCapabilities({
      mime: 'video/mp4; codecs="avc1.42E01E"',
    });
    probeResult.media.mp4.video.h265 = getCodecsCapabilities({
      mime: 'video/mp4; codecs="hvc1.1.6.L93.90"',
    });
    probeResult.media.mp4.video.vp9 = getCodecsCapabilities({
      mime: 'video/mp4; codecs="vp09.00.10.08"',
    });

    // MP4 -> AUDIO
    probeResult.media.mp4.audio.aac = getCodecsCapabilities({
      mime: 'audio/mp4; codecs="mp4a.40.2"',
    });
    probeResult.media.mp4.audio.ac3 = getCodecsCapabilities({
      mime: 'audio/mp4; codecs="ac-3"',
    });
    probeResult.media.mp4.audio.ec3 = getCodecsCapabilities({
      mime: 'audio/mp4; codecs="ec-3"',
    });
    probeResult.media.mp4.audio.opus = getCodecsCapabilities({
      mime: 'audio/mp4; codecs="opus"',
    });
    probeResult.media.mp4.audio.flac = getCodecsCapabilities({
      mime: 'audio/mp4; codecs="flac"',
    });

    // OGG -> VIDEO
    probeResult.media.ogg.video.theora = getCodecsCapabilities({
      mime: 'video/ogg; codecs="theora"',
    });
    probeResult.media.ogg.video.vp8 = getCodecsCapabilities({
      mime: 'video/ogg; codecs="vp8"',
    });
    probeResult.media.ogg.video.vp9 = getCodecsCapabilities({
      mime: 'video/ogg; codecs="vp9"',
    });

    // OGG -> AUDIO
    probeResult.media.ogg.audio.flac = getCodecsCapabilities({
      mime: 'audio/ogg; codecs="flac"',
    });
    probeResult.media.ogg.audio.opus = getCodecsCapabilities({
      mime: 'audio/ogg; codecs="opus"',
    });
    probeResult.media.ogg.audio.vorbis = getCodecsCapabilities({
      mime: 'audio/ogg; codecs="vorbis"',
    });

    // WEBM -> VIDEO
    probeResult.media.webm.video.vp8 = getCodecsCapabilities({
      mime: 'video/webm; codecs="vp8"',
    });
    probeResult.media.webm.video.vp9 = getCodecsCapabilities({
      mime: 'video/webm; codecs="vp9"',
    });

    // WEBM -> AUDIO
    probeResult.media.webm.audio.opus = getCodecsCapabilities({
      mime: 'audio/webm; codecs="opus"',
    });
    probeResult.media.webm.audio.vorbis = getCodecsCapabilities({
      mime: 'audio/webm; codecs="vorbis"',
    });

    // MPEG2TS -> VIDEO
    probeResult.media.mpeg2ts.video.h264 = getCodecsCapabilities({
      mime: 'video/mp2t; codecs="avc1.42E01E"',
    });
    probeResult.media.mpeg2ts.video.h265 = getCodecsCapabilities({
      mime: 'video/mp2t; codecs="hvc1.1.6.L93.90"',
    });

    // MPEG2TS -> AUDIO
    // We should use video/mp2t for audio codecs!
    probeResult.media.mpeg2ts.audio.aac = getCodecsCapabilities({
      mime: 'video/mp2t; codecs="mp4a.40.2"',
    });
    probeResult.media.mpeg2ts.audio.ac3 = getCodecsCapabilities({
      mime: 'video/mp2t; codecs="ac-3"',
    });
    probeResult.media.mpeg2ts.audio.ec3 = getCodecsCapabilities({
      mime: 'video/mp2t; codecs="ec-3"',
    });
  }

  protected async probeSecureContext_(probeResult: ICapabilitiesProbeResult): Promise<void> {
    probeResult.isSecureContext = this.context_.isSecureContext;
  }

  protected async probeIsHttps_(probeResult: ICapabilitiesProbeResult): Promise<void> {
    probeResult.isHttps = this.context_.location.protocol === 'https:';
  }

  private async probeEmeCapabilities_(probeResult: ICapabilitiesProbeResult): Promise<void> {
    const keySystemsValues = Object.values(KeySystem);

    const basicPromises = keySystemsValues.map(async (keySystem) => {
      probeResult.eme[keySystem].basic = await this.probeEmeConfig_(
        keySystem,
        basicEmeConfig as MediaKeySystemConfiguration
      );
    });

    const persistentPromises = keySystemsValues.map(async (keySystem) => {
      probeResult.eme[keySystem].persistent = await this.probeEmeConfig_(
        keySystem,
        persistentEmeConfig as MediaKeySystemConfiguration
      );
    });

    await Promise.all([...basicPromises, ...persistentPromises]);
  }

  private async probeEmeConfig_(keySystem: string, config: MediaKeySystemConfiguration): Promise<boolean> {
    try {
      await this.context_.navigator.requestMediaKeySystemAccess(keySystem, [config]);
      return true;
    } catch (e) {
      return false;
    }
  }
}
