import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EnvCapabilitiesProvider } from '../../src/lib/utils/env-capabilities';
import type {
  IEmeCapabilities,
  IEnvCapabilitiesContext,
  IMediaCapabilities,
} from '../../src/lib/types/env-capabilities.declarations';
import { anyString, instance, mock, when } from '@typestrong/ts-mockito';

const createEmeStatus = ({ basic, persistent }: { basic: boolean; persistent: boolean }): IEmeCapabilities => {
  return {
    'com.apple.fps': {
      basic,
      persistent,
    },
    'com.apple.fps.1_0': {
      basic,
      persistent,
    },
    'com.microsoft.playready': {
      basic,
      persistent,
    },
    'com.widevine.alpha': {
      basic,
      persistent,
    },
  };
};

const createMediaStatus = ({
  native,
  mse,
  transmuxer,
}: {
  native: boolean;
  mse: boolean;
  transmuxer: boolean;
}): IMediaCapabilities => {
  return {
    mp4: {
      audio: {
        aac: {
          mse,
          native,
          transmuxer,
        },
        ac3: {
          mse,
          native,
          transmuxer,
        },
        ec3: {
          mse,
          native,
          transmuxer,
        },
        flac: {
          mse,
          native,
          transmuxer,
        },
        opus: {
          mse,
          native,
          transmuxer,
        },
      },
      video: {
        h264: {
          mse,
          native,
          transmuxer,
        },
        h265: {
          mse,
          native,
          transmuxer,
        },
        vp9: {
          mse,
          native,
          transmuxer,
        },
      },
    },
    mpeg2ts: {
      audio: {
        aac: {
          mse,
          native,
          transmuxer,
        },
        ac3: {
          mse,
          native,
          transmuxer,
        },
        ec3: {
          mse,
          native,
          transmuxer,
        },
      },
      video: {
        h264: {
          mse,
          native,
          transmuxer,
        },
        h265: {
          mse,
          native,
          transmuxer,
        },
      },
    },
    ogg: {
      audio: {
        flac: {
          mse,
          native,
          transmuxer,
        },
        opus: {
          mse,
          native,
          transmuxer,
        },
        vorbis: {
          mse,
          native,
          transmuxer,
        },
      },
      video: {
        theora: {
          mse,
          native,
          transmuxer,
        },
        vp8: {
          mse,
          native,
          transmuxer,
        },
        vp9: {
          mse,
          native,
          transmuxer,
        },
      },
    },
    webm: {
      audio: {
        opus: {
          mse,
          native,
          transmuxer,
        },
        vorbis: {
          mse,
          native,
          transmuxer,
        },
      },
      video: {
        vp8: {
          mse,
          native,
          transmuxer,
        },
        vp9: {
          mse,
          native,
          transmuxer,
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
    when(mockContext.transmuxer).thenReturn(undefined);
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

  it('should return valid eme status', async () => {
    const mockRequestMediaKeySystemAccess = vi.fn();

    when(mockContext.navigator).thenReturn({
      requestMediaKeySystemAccess: mockRequestMediaKeySystemAccess,
    } as unknown as Navigator);

    mockRequestMediaKeySystemAccess.mockImplementation(() => Promise.resolve());

    const result = await envCapabilitiesProvider.probe();

    expect(result.eme).toEqual(createEmeStatus({ basic: true, persistent: true }));

    mockRequestMediaKeySystemAccess.mockImplementation(() => Promise.reject());

    const result2 = await envCapabilitiesProvider.probe();

    expect(result2.eme).toEqual(createEmeStatus({ basic: false, persistent: false }));
  });

  it('should return valid media capabilities status', async () => {
    when(mockVideoElement.canPlayType(anyString())).thenReturn('probably');
    when(mockContext.MediaSource).thenReturn(undefined);
    when(mockContext.transmuxer).thenReturn(undefined);

    const result = await envCapabilitiesProvider.probe();

    expect(result.media).toEqual(createMediaStatus({ native: true, mse: false, transmuxer: false }));

    when(mockVideoElement.canPlayType(anyString())).thenReturn('');

    const result2 = await envCapabilitiesProvider.probe();

    expect(result2.media).toEqual(createMediaStatus({ native: false, mse: false, transmuxer: false }));

    when(mockContext.MediaSource).thenReturn({ isTypeSupported: () => false });
    when(mockContext.transmuxer).thenReturn({ isTypeSupported: () => false });

    const result3 = await envCapabilitiesProvider.probe();

    expect(result3.media).toEqual(createMediaStatus({ native: false, mse: false, transmuxer: false }));

    when(mockContext.MediaSource).thenReturn({ isTypeSupported: () => true });
    when(mockContext.transmuxer).thenReturn({ isTypeSupported: () => true });

    const result4 = await envCapabilitiesProvider.probe();

    expect(result4.media).toEqual(createMediaStatus({ native: false, mse: true, transmuxer: true }));
  });

  it('should return valid streaming capabilities status', async () => {
    when(mockVideoElement.canPlayType(anyString())).thenReturn('probably');

    const result = await envCapabilitiesProvider.probe();

    expect(result.streaming).toEqual({
      hls: { mse: true, native: true },
      dash: { mse: true, native: true },
      hss: { mse: false, native: true },
    });

    when(mockVideoElement.canPlayType(anyString())).thenReturn('');

    const result2 = await envCapabilitiesProvider.probe();

    expect(result2.streaming).toEqual({
      hls: { mse: true, native: false },
      dash: { mse: true, native: false },
      hss: { mse: false, native: false },
    });
  });
});
