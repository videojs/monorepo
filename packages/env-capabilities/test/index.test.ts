import { describe, it, expect, beforeEach, vi } from 'vitest';
import { anyString, instance, mock, when } from '@typestrong/ts-mockito';
import type { HdcpCapabilities, IEnvCapabilitiesContext, IMediaCapabilities } from '../src';
import { EnvCapabilitiesProvider } from '../src';
import { KeySystem } from '../src/lib/consts/key-system';

const createHdcpStatus = (status: MediaKeyStatus | 'api-not-available'): HdcpCapabilities => {
  return {
    hdcp1_0: status,
    hdcp1_1: status,
    hdcp1_2: status,
    hdcp1_3: status,
    hdcp1_4: status,
    hdcp2_0: status,
    hdcp2_1: status,
    hdcp2_2: status,
    hdcp2_3: status,
  };
};

const createMediaStatus = ({ native, mse }: { native: boolean; mse: boolean }): IMediaCapabilities => {
  return {
    mp4: {
      audio: {
        aac: {
          mse,
          native,
        },
        ac3: {
          mse,
          native,
        },
        ec3: {
          mse,
          native,
        },
        flac: {
          mse,
          native,
        },
        opus: {
          mse,
          native,
        },
      },
      video: {
        h264: {
          mse,
          native,
        },
        h265: {
          mse,
          native,
        },
        vp9: {
          mse,
          native,
        },
      },
    },
    mpeg2ts: {
      audio: {
        aac: {
          mse,
          native,
        },
        ac3: {
          mse,
          native,
        },
        ec3: {
          mse,
          native,
        },
      },
      video: {
        h264: {
          mse,
          native,
        },
        h265: {
          mse,
          native,
        },
      },
    },
    ogg: {
      audio: {
        flac: {
          mse,
          native,
        },
        opus: {
          mse,
          native,
        },
        vorbis: {
          mse,
          native,
        },
      },
      video: {
        theora: {
          mse,
          native,
        },
        vp8: {
          mse,
          native,
        },
        vp9: {
          mse,
          native,
        },
      },
    },
    webm: {
      audio: {
        opus: {
          mse,
          native,
        },
        vorbis: {
          mse,
          native,
        },
      },
      video: {
        vp8: {
          mse,
          native,
        },
        vp9: {
          mse,
          native,
        },
      },
    },
  };
};

describe('EnvCapabilities', () => {
  let mockContext: IEnvCapabilitiesContext;
  let mockVideoElement: HTMLVideoElement;
  let envCapabilitiesProvider: EnvCapabilitiesProvider;

  beforeEach(() => {
    mockContext = mock<IEnvCapabilitiesContext>();
    mockVideoElement = mock<HTMLVideoElement>();

    envCapabilitiesProvider = new EnvCapabilitiesProvider(instance(mockContext), instance(mockVideoElement));
    when(mockContext.MediaSource).thenReturn(undefined);
    when(mockContext.matchMedia(anyString())).thenReturn({ matches: false } as MediaQueryList);
    when(mockContext.navigator).thenReturn({
      requestMediaKeySystemAccess: vi.fn().mockImplementation(() => Promise.reject()),
    } as unknown as Navigator);
  });

  // Probe returns cached result if available
  it('should return valid secure context status', async () => {
    when(mockContext.isSecureContext).thenReturn(true);

    const result = await envCapabilitiesProvider.probe();

    expect(result.isSecureContext).toBe(true);

    when(mockContext.isSecureContext).thenReturn(false);

    const result2 = await envCapabilitiesProvider.probe();

    expect(result2.isSecureContext).toBe(false);
  });

  it('should return valid https status', async () => {
    when(mockContext.location).thenReturn({ protocol: 'http:' } as Location);

    const result = await envCapabilitiesProvider.probe();

    expect(result.isHttps).toBe(false);

    when(mockContext.location).thenReturn({ protocol: 'https:' } as Location);

    const result2 = await envCapabilitiesProvider.probe();

    expect(result2.isHttps).toBe(true);
  });

  it('should return valid sdr/hdr status', async () => {
    when(mockContext.matchMedia(anyString())).thenReturn({ matches: false } as MediaQueryList);

    const result = await envCapabilitiesProvider.probe();

    expect(result.videoRange.hdr).toBe(false);
    expect(result.videoRange.sdr).toBe(false);

    when(mockContext.matchMedia(anyString())).thenReturn({ matches: true } as MediaQueryList);

    const result2 = await envCapabilitiesProvider.probe();

    expect(result2.videoRange.hdr).toBe(true);
    expect(result2.videoRange.sdr).toBe(true);
  });

  it('should return valid eme status', async () => {
    const mockRequestMediaKeySystemAccess = vi.fn();

    when(mockContext.navigator).thenReturn({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    } as unknown as Navigator);

    mockRequestMediaKeySystemAccess.mockImplementation(() =>
      Promise.resolve({ createMediaKeys: vi.fn().mockImplementation(() => Promise.reject()) })
    );

    const result = await envCapabilitiesProvider.probe();

    expect(result.eme[KeySystem.Widevine].basic).toEqual(true);
    expect(result.eme[KeySystem.Widevine].persistent).toEqual(true);
    expect(result.eme[KeySystem.Widevine].hdcp).toEqual(createHdcpStatus('api-not-available'));
    expect(result.eme[KeySystem.Widevine].robustness.audio).toEqual({
      SW_SECURE_CRYPTO: true,
      SW_SECURE_DECODE: true,
      HW_SECURE_CRYPTO: true,
      HW_SECURE_DECODE: true,
      HW_SECURE_ALL: true,
    });
    expect(result.eme[KeySystem.Widevine].robustness.video).toEqual({
      SW_SECURE_CRYPTO: true,
      SW_SECURE_DECODE: true,
      HW_SECURE_CRYPTO: true,
      HW_SECURE_DECODE: true,
      HW_SECURE_ALL: true,
    });

    expect(result.eme[KeySystem.Playready].basic).toEqual(true);
    expect(result.eme[KeySystem.Playready].persistent).toEqual(true);
    expect(result.eme[KeySystem.Playready].hdcp).toEqual(createHdcpStatus('api-not-available'));
    expect(result.eme[KeySystem.Playready].robustness.audio).toEqual({
      150: true,
      2000: true,
      3000: true,
    });
    expect(result.eme[KeySystem.Playready].robustness.video).toEqual({
      150: true,
      2000: true,
      3000: true,
    });

    expect(result.eme[KeySystem.Fairplay].basic).toEqual(true);
    expect(result.eme[KeySystem.Fairplay].persistent).toEqual(true);
    expect(result.eme[KeySystem.Fairplay].hdcp).toEqual(createHdcpStatus('api-not-available'));
    expect(result.eme[KeySystem.Fairplay].robustness.audio).toEqual({
      default: true,
    });
    expect(result.eme[KeySystem.Fairplay].robustness.video).toEqual({
      default: true,
    });

    expect(result.eme[KeySystem.FairplayLegacy].basic).toEqual(true);
    expect(result.eme[KeySystem.FairplayLegacy].persistent).toEqual(true);
    expect(result.eme[KeySystem.FairplayLegacy].hdcp).toEqual(createHdcpStatus('api-not-available'));
    expect(result.eme[KeySystem.FairplayLegacy].robustness.audio).toEqual({
      default: true,
    });
    expect(result.eme[KeySystem.FairplayLegacy].robustness.video).toEqual({
      default: true,
    });
  });

  it('should return valid media capabilities status', async () => {
    when(mockVideoElement.canPlayType(anyString())).thenReturn('probably');
    when(mockContext.MediaSource).thenReturn(undefined);

    const result = await envCapabilitiesProvider.probe();

    expect(result.media).toEqual(createMediaStatus({ native: true, mse: false }));

    when(mockVideoElement.canPlayType(anyString())).thenReturn('');

    const result2 = await envCapabilitiesProvider.probe();

    expect(result2.media).toEqual(createMediaStatus({ native: false, mse: false }));

    when(mockContext.MediaSource).thenReturn({ isTypeSupported: () => false });

    const result3 = await envCapabilitiesProvider.probe();

    expect(result3.media).toEqual(createMediaStatus({ native: false, mse: false }));

    when(mockContext.MediaSource).thenReturn({ isTypeSupported: () => true });

    const result4 = await envCapabilitiesProvider.probe();

    expect(result4.media).toEqual(createMediaStatus({ native: false, mse: true }));
  });

  it('should return valid streaming capabilities status', async () => {
    when(mockVideoElement.canPlayType(anyString())).thenReturn('probably');

    const result = await envCapabilitiesProvider.probe();

    expect(result.streaming).toEqual({
      hls: { native: true },
      dash: { native: true },
      hss: { native: true },
    });

    when(mockVideoElement.canPlayType(anyString())).thenReturn('');

    const result2 = await envCapabilitiesProvider.probe();

    expect(result2.streaming).toEqual({
      hls: { native: false },
      dash: { native: false },
      hss: { native: false },
    });
  });
});
