import type {
  HdcpCapabilities,
  ICapabilitiesProbeResult,
  ICodecCapabilities,
  IEmeCapabilities,
  IEnvCapabilitiesContext,
  IEnvCapabilitiesProvider,
  IMediaCapabilities,
  StreamingCapabilities,
} from './types/env-capabilities.declarations';
import { KeySystem } from './consts/key-system';
import { StreamingProtocol } from './consts/streaming-protocol';
import { Container } from './consts/container';
import { AudioCodecs, VideoCodecs } from './consts/codecs';
import { DashMimeType, HlsVndMpegMimeType, HlsXMpegMimeType, HssMimeType } from './consts/mime-type';

export class EnvCapabilitiesProvider implements IEnvCapabilitiesProvider {
  /* v8 ignore start */
  private static getDefaultHdcpCapabilities_(): HdcpCapabilities {
    return {
      hdcp1_0: 'api-not-available',
      hdcp1_1: 'api-not-available',
      hdcp1_2: 'api-not-available',
      hdcp1_3: 'api-not-available',
      hdcp1_4: 'api-not-available',
      hdcp2_0: 'api-not-available',
      hdcp2_1: 'api-not-available',
      hdcp2_2: 'api-not-available',
      hdcp2_3: 'api-not-available',
    };
  }

  private static getDefaultEmeCapabilities_(): IEmeCapabilities {
    return {
      [KeySystem.Widevine]: {
        persistent: false,
        basic: false,
        robustness: {
          audio: {
            SW_SECURE_CRYPTO: false,
            SW_SECURE_DECODE: false,
            HW_SECURE_CRYPTO: false,
            HW_SECURE_DECODE: false,
            HW_SECURE_ALL: false,
          },
          video: {
            SW_SECURE_CRYPTO: false,
            SW_SECURE_DECODE: false,
            HW_SECURE_CRYPTO: false,
            HW_SECURE_DECODE: false,
            HW_SECURE_ALL: false,
          },
        },
        hdcp: EnvCapabilitiesProvider.getDefaultHdcpCapabilities_(),
      },
      [KeySystem.Playready]: {
        persistent: false,
        basic: false,
        robustness: {
          audio: {
            3000: false,
            2000: false,
            150: false,
          },
          video: {
            3000: false,
            2000: false,
            150: false,
          },
        },
        hdcp: EnvCapabilitiesProvider.getDefaultHdcpCapabilities_(),
      },
      [KeySystem.Fairplay]: {
        persistent: false,
        basic: false,
        robustness: {
          audio: {
            default: false,
          },
          video: {
            default: false,
          },
        },
        hdcp: EnvCapabilitiesProvider.getDefaultHdcpCapabilities_(),
      },
      [KeySystem.FairplayLegacy]: {
        persistent: false,
        basic: false,
        robustness: {
          audio: {
            default: false,
          },
          video: {
            default: false,
          },
        },
        hdcp: EnvCapabilitiesProvider.getDefaultHdcpCapabilities_(),
      },
    };
  }

  private static getDefaultStreamingCapabilities_(): StreamingCapabilities {
    return {
      [StreamingProtocol.Hls]: { native: false },
      [StreamingProtocol.Dash]: { native: false },
      [StreamingProtocol.Hss]: { native: false },
    };
  }

  private static getDefaultMediaCapabilities_(): IMediaCapabilities {
    return {
      [Container.Mp4]: {
        video: {
          [VideoCodecs.H264]: { mse: false, native: false },
          [VideoCodecs.H265]: { mse: false, native: false },
          [VideoCodecs.Vp9]: { mse: false, native: false },
        },
        audio: {
          [AudioCodecs.Aac]: { mse: false, native: false },
          [AudioCodecs.Ac3]: { mse: false, native: false },
          [AudioCodecs.Ec3]: { mse: false, native: false },
          [AudioCodecs.Opus]: { mse: false, native: false },
          [AudioCodecs.Flac]: { mse: false, native: false },
        },
      },
      [Container.Ogg]: {
        video: {
          [VideoCodecs.Theora]: { mse: false, native: false },
          [VideoCodecs.Vp8]: { mse: false, native: false },
          [VideoCodecs.Vp9]: { mse: false, native: false },
        },
        audio: {
          [AudioCodecs.Opus]: { mse: false, native: false },
          [AudioCodecs.Vorbis]: { mse: false, native: false },
          [AudioCodecs.Flac]: { mse: false, native: false },
        },
      },
      [Container.WebM]: {
        video: {
          [VideoCodecs.Vp8]: { mse: false, native: false },
          [VideoCodecs.Vp9]: { mse: false, native: false },
        },
        audio: {
          [AudioCodecs.Opus]: { mse: false, native: false },
          [AudioCodecs.Vorbis]: { mse: false, native: false },
        },
      },
      [Container.Mpeg2Ts]: {
        video: {
          [VideoCodecs.H264]: { mse: false, native: false },
          [VideoCodecs.H265]: { mse: false, native: false },
        },
        audio: {
          [AudioCodecs.Aac]: { mse: false, native: false },
          [AudioCodecs.Ac3]: { mse: false, native: false },
          [AudioCodecs.Ec3]: { mse: false, native: false },
        },
      },
    };
  }

  public static create(): EnvCapabilitiesProvider {
    return new EnvCapabilitiesProvider(window, document.createElement('video'));
  }

  /* v8 ignore stop */

  private readonly context_: IEnvCapabilitiesContext;
  private readonly videoElement_: HTMLVideoElement;

  public constructor(context: IEnvCapabilitiesContext, videoElement: HTMLVideoElement) {
    this.context_ = context;
    this.videoElement_ = videoElement;
  }

  public async probe(): Promise<ICapabilitiesProbeResult> {
    const [media, streaming, eme] = await Promise.all([
      this.probeMediaCapabilities(),
      this.probeStreamingProtocolsCapabilities(),
      this.probeEmeCapabilities(),
    ]);

    return {
      isSecureContext: this.context_.isSecureContext,
      isHttps: this.context_.location.protocol === 'https:',
      videoRange: {
        sdr: this.context_.matchMedia('(dynamic-range: standard)').matches,
        hdr: this.context_.matchMedia('(dynamic-range: high)').matches,
      },
      media,
      streaming,
      eme,
    };
  }

  public async probeStreamingProtocolsCapabilities(): Promise<StreamingCapabilities> {
    const streaming = EnvCapabilitiesProvider.getDefaultStreamingCapabilities_();

    streaming.hls.native =
      Boolean(this.videoElement_.canPlayType(HlsVndMpegMimeType)) ||
      Boolean(this.videoElement_.canPlayType(HlsXMpegMimeType));

    streaming.dash.native = Boolean(this.videoElement_.canPlayType(DashMimeType));
    streaming.hss.native = Boolean(this.videoElement_.canPlayType(HssMimeType));

    return streaming;
  }

  public async probeMediaCapabilities(): Promise<IMediaCapabilities> {
    const media = EnvCapabilitiesProvider.getDefaultMediaCapabilities_();

    const getCodecsCapabilities = (probeData: { mime: string }): ICodecCapabilities => {
      const { mime } = probeData;
      const mse = Boolean(this.context_.MediaSource && this.context_.MediaSource.isTypeSupported(mime));
      const native = Boolean(this.videoElement_.canPlayType(mime));

      return { mse, native };
    };

    // MP4 -> VIDEO
    media.mp4.video.h264 = getCodecsCapabilities({
      mime: 'video/mp4; codecs="avc1.42E01E"',
    });
    media.mp4.video.h265 = getCodecsCapabilities({
      mime: 'video/mp4; codecs="hvc1.1.6.L93.90"',
    });
    media.mp4.video.vp9 = getCodecsCapabilities({
      mime: 'video/mp4; codecs="vp09.00.10.08"',
    });

    // MP4 -> AUDIO
    media.mp4.audio.aac = getCodecsCapabilities({
      mime: 'audio/mp4; codecs="mp4a.40.2"',
    });
    media.mp4.audio.ac3 = getCodecsCapabilities({
      mime: 'audio/mp4; codecs="ac-3"',
    });
    media.mp4.audio.ec3 = getCodecsCapabilities({
      mime: 'audio/mp4; codecs="ec-3"',
    });
    media.mp4.audio.opus = getCodecsCapabilities({
      mime: 'audio/mp4; codecs="opus"',
    });
    media.mp4.audio.flac = getCodecsCapabilities({
      mime: 'audio/mp4; codecs="flac"',
    });

    // OGG -> VIDEO
    media.ogg.video.theora = getCodecsCapabilities({
      mime: 'video/ogg; codecs="theora"',
    });
    media.ogg.video.vp8 = getCodecsCapabilities({
      mime: 'video/ogg; codecs="vp8"',
    });
    media.ogg.video.vp9 = getCodecsCapabilities({
      mime: 'video/ogg; codecs="vp9"',
    });

    // OGG -> AUDIO
    media.ogg.audio.flac = getCodecsCapabilities({
      mime: 'audio/ogg; codecs="flac"',
    });
    media.ogg.audio.opus = getCodecsCapabilities({
      mime: 'audio/ogg; codecs="opus"',
    });
    media.ogg.audio.vorbis = getCodecsCapabilities({
      mime: 'audio/ogg; codecs="vorbis"',
    });

    // WEBM -> VIDEO
    media.webm.video.vp8 = getCodecsCapabilities({
      mime: 'video/webm; codecs="vp8"',
    });
    media.webm.video.vp9 = getCodecsCapabilities({
      mime: 'video/webm; codecs="vp9"',
    });

    // WEBM -> AUDIO
    media.webm.audio.opus = getCodecsCapabilities({
      mime: 'audio/webm; codecs="opus"',
    });
    media.webm.audio.vorbis = getCodecsCapabilities({
      mime: 'audio/webm; codecs="vorbis"',
    });

    // MPEG2TS -> VIDEO
    media.mpeg2ts.video.h264 = getCodecsCapabilities({
      mime: 'video/mp2t; codecs="avc1.42E01E"',
    });
    media.mpeg2ts.video.h265 = getCodecsCapabilities({
      mime: 'video/mp2t; codecs="hvc1.1.6.L93.90"',
    });

    // MPEG2TS -> AUDIO
    // We should use video/mp2t for audio codecs!
    media.mpeg2ts.audio.aac = getCodecsCapabilities({
      mime: 'video/mp2t; codecs="mp4a.40.2"',
    });
    media.mpeg2ts.audio.ac3 = getCodecsCapabilities({
      mime: 'video/mp2t; codecs="ac-3"',
    });
    media.mpeg2ts.audio.ec3 = getCodecsCapabilities({
      mime: 'video/mp2t; codecs="ec-3"',
    });

    return media;
  }

  public async probeEmeCapabilities(): Promise<IEmeCapabilities> {
    const eme = EnvCapabilitiesProvider.getDefaultEmeCapabilities_();

    let promises: Array<Promise<void>> = [];

    Object.values(KeySystem).forEach((keySystem) => {
      // basic:
      const baseSupportPromise = this.context_.navigator
        .requestMediaKeySystemAccess(keySystem, [
          {
            initDataTypes: ['cenc'],
            videoCapabilities: [{ contentType: 'video/mp4; codecs="avc1.42E01E"' }],
            audioCapabilities: [{ contentType: 'audio/mp4;codecs="mp4a.40.2"' }],
          },
        ])
        .then(
          () => {
            eme[keySystem].basic = true;
          },
          () => {
            eme[keySystem].basic = false;
          }
        );

      promises.push(baseSupportPromise);

      //persistent:
      const persistentSupportPromise = this.context_.navigator
        .requestMediaKeySystemAccess(keySystem, [
          {
            initDataTypes: ['cenc'],
            videoCapabilities: [{ contentType: 'video/mp4; codecs="avc1.42E01E"' }],
            audioCapabilities: [{ contentType: 'audio/mp4;codecs="mp4a.40.2"' }],
            persistentState: 'required',
            sessionTypes: ['persistent-license'],
          },
        ])
        .then(
          () => {
            eme[keySystem].persistent = true;
          },
          () => {
            eme[keySystem].persistent = false;
          }
        );

      promises.push(persistentSupportPromise);

      // robustness:
      const audioRobustnessLevels = Object.keys(eme[keySystem].robustness.audio);
      const videoRobustnessLevels = Object.keys(eme[keySystem].robustness.video);

      const audioRobustnessPromises = audioRobustnessLevels.map((level) => {
        return this.context_.navigator
          .requestMediaKeySystemAccess(keySystem, [
            {
              initDataTypes: ['cenc'],
              audioCapabilities: [
                { contentType: 'audio/mp4;codecs="mp4a.40.2"', robustness: level === 'default' ? '' : level },
              ],
            },
          ])
          .then(
            () => {
              // @ts-expect-error we don't care about type here
              eme[keySystem].robustness.audio[level] = true;
            },
            () => {
              // @ts-expect-error we don't care about type here
              eme[keySystem].robustness.audio[level] = false;
            }
          );
      });

      promises = promises.concat(audioRobustnessPromises);

      const videoRobustnessPromises = videoRobustnessLevels.map((level) => {
        return this.context_.navigator
          .requestMediaKeySystemAccess(keySystem, [
            {
              initDataTypes: ['cenc'],
              videoCapabilities: [
                { contentType: 'video/mp4; codecs="avc1.42E01E"', robustness: level === 'default' ? '' : level },
              ],
            },
          ])
          .then(
            () => {
              // @ts-expect-error we don't care about type here
              eme[keySystem].robustness.video[level] = true;
            },
            () => {
              // @ts-expect-error we don't care about type here
              eme[keySystem].robustness.video[level] = false;
            }
          );
      });

      promises = promises.concat(videoRobustnessPromises);

      // hdcp:
      const hdcpPromises = Object.keys(eme[keySystem].hdcp).map((hdcpVersion) => {
        return this.context_.navigator
          .requestMediaKeySystemAccess(keySystem, [
            {
              initDataTypes: ['cenc'],
              videoCapabilities: [{ contentType: 'video/mp4; codecs="avc1.42E01E"' }],
              audioCapabilities: [{ contentType: 'audio/mp4;codecs="mp4a.40.2"' }],
            },
          ])
          .then(
            (system) => {
              return system.createMediaKeys().then(
                (keys) => {
                  if ('getStatusForPolicy' in keys) {
                    keys.getStatusForPolicy({ minHdcpVersion: hdcpVersion.replace('hdcp', '').replace('_', '.') }).then(
                      (result) => {
                        // @ts-expect-error we don't care about type here
                        eme[keySystem].hdcp[hdcpVersion] = result;
                      },
                      () => {
                        // @ts-expect-error we don't care about type here
                        eme[keySystem].hdcp[hdcpVersion] = 'api-not-available';
                      }
                    );
                  } else {
                    // @ts-expect-error we don't care about type here
                    eme[keySystem].hdcp[hdcpVersion] = 'api-not-available';
                  }
                },
                () => {
                  // @ts-expect-error we don't care about type here
                  eme[keySystem].hdcp[hdcpVersion] = 'api-not-available';
                }
              );
            },
            () => {
              // @ts-expect-error we don't care about type here
              eme[keySystem].hdcp[hdcpVersion] = 'api-not-available';
            }
          );
      });

      promises = promises.concat(hdcpPromises);
    });

    await Promise.all(promises);

    return eme;
  }
}
