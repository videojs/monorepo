import { beforeEach, describe, expect, it } from 'vitest';
import { InterceptorsStorage } from '../../src/lib/utils/interceptors-storage';
import { InterceptorType } from '../../src/lib/consts/interceptor-type';
import type { INetworkRequestInfo } from '../../src/lib/types/network.declarations';
import type { InterceptorTypeToInterceptorPayloadMap } from '../../src/lib/types/mappers/interceptor-type-to-interceptor-map.declarations';

describe('InterceptorsStorage', () => {
  let storage: InterceptorsStorage<InterceptorTypeToInterceptorPayloadMap>;

  beforeEach(() => {
    storage = new InterceptorsStorage();
  });

  it('should store the interceptor in the storage when added', () => {
    const interceptor = async (request: INetworkRequestInfo): Promise<INetworkRequestInfo> => request;
    storage.addInterceptor(InterceptorType.NetworkRequest, interceptor);
    expect(storage.getInterceptorsSet(InterceptorType.NetworkRequest).has(interceptor)).toBe(true);
  });

  it('should not store duplicate interceptors for a type', () => {
    const interceptor = async (request: INetworkRequestInfo): Promise<INetworkRequestInfo> => request;
    storage.addInterceptor(InterceptorType.NetworkRequest, interceptor);
    storage.addInterceptor(InterceptorType.NetworkRequest, interceptor);
    expect(storage.getInterceptorsSet(InterceptorType.NetworkRequest).size).toBe(1);
  });

  it('should return the correct set of interceptors for a given type when retrieved', () => {
    const interceptor1 = async (request: INetworkRequestInfo): Promise<INetworkRequestInfo> => request;
    const interceptor2 = async (request: INetworkRequestInfo): Promise<INetworkRequestInfo> => request;
    storage.addInterceptor(InterceptorType.NetworkRequest, interceptor1);
    storage.addInterceptor(InterceptorType.NetworkRequest, interceptor2);

    expect(storage.getInterceptorsSet(InterceptorType.NetworkRequest)).toEqual(new Set([interceptor1, interceptor2]));
  });

  it('should remove the interceptor from the storage when deleted', () => {
    const interceptor1 = async (request: INetworkRequestInfo): Promise<INetworkRequestInfo> => request;
    const interceptor2 = async (request: INetworkRequestInfo): Promise<INetworkRequestInfo> => request;

    storage.addInterceptor(InterceptorType.NetworkRequest, interceptor1);
    storage.addInterceptor(InterceptorType.NetworkRequest, interceptor2);
    storage.removeInterceptor(InterceptorType.NetworkRequest, interceptor1);

    expect(storage.getInterceptorsSet(InterceptorType.NetworkRequest).has(interceptor1)).toBe(false);
    expect(storage.getInterceptorsSet(InterceptorType.NetworkRequest).has(interceptor2)).toBe(true);
    expect(storage.getInterceptorsSet(InterceptorType.NetworkRequest).size).toBe(1);
    storage.removeInterceptor(InterceptorType.NetworkRequest, interceptor2);
    expect(storage.getInterceptorsSet(InterceptorType.NetworkRequest).has(interceptor2)).toBe(false);
    expect(storage.getInterceptorsSet(InterceptorType.NetworkRequest).size).toBe(0);
  });

  // Removing all interceptors for a type clears the set for that type
  it('should clear the set when removing all interceptors for a type', () => {
    expect(storage.getInterceptorsSet(InterceptorType.NetworkRequest).size).toBe(0);
    expect(storage.getInterceptorsSet(InterceptorType.HlsPlaylistParse).size).toBe(0);

    const interceptor1 = async (request: INetworkRequestInfo): Promise<INetworkRequestInfo> => request;
    const interceptor2 = async (request: INetworkRequestInfo): Promise<INetworkRequestInfo> => request;
    const interceptor3 = async (playlist: Uint8Array): Promise<Uint8Array> => playlist;

    storage.addInterceptor(InterceptorType.NetworkRequest, interceptor1);
    storage.addInterceptor(InterceptorType.NetworkRequest, interceptor2);
    storage.addInterceptor(InterceptorType.HlsPlaylistParse, interceptor3);
    expect(storage.getInterceptorsSet(InterceptorType.NetworkRequest).size).toBe(2);
    expect(storage.getInterceptorsSet(InterceptorType.HlsPlaylistParse).size).toBe(1);

    storage.removeAllInterceptorsForType(InterceptorType.NetworkRequest);

    expect(storage.getInterceptorsSet(InterceptorType.NetworkRequest).size).toBe(0);
    expect(storage.getInterceptorsSet(InterceptorType.HlsPlaylistParse).size).toBe(1);
  });

  // Removing all interceptors clears the entire storage
  it('should clear the entire storage when all interceptors are removed', () => {
    expect(storage.getInterceptorsSet(InterceptorType.NetworkRequest).size).toBe(0);
    expect(storage.getInterceptorsSet(InterceptorType.HlsPlaylistParse).size).toBe(0);

    const interceptor1 = async (request: INetworkRequestInfo): Promise<INetworkRequestInfo> => request;
    const interceptor2 = async (request: INetworkRequestInfo): Promise<INetworkRequestInfo> => request;
    const interceptor3 = async (playlist: Uint8Array): Promise<Uint8Array> => playlist;

    storage.addInterceptor(InterceptorType.NetworkRequest, interceptor1);
    storage.addInterceptor(InterceptorType.NetworkRequest, interceptor2);
    storage.addInterceptor(InterceptorType.HlsPlaylistParse, interceptor3);
    expect(storage.getInterceptorsSet(InterceptorType.NetworkRequest).size).toBe(2);
    expect(storage.getInterceptorsSet(InterceptorType.HlsPlaylistParse).size).toBe(1);

    storage.removeAllInterceptors();

    expect(storage.getInterceptorsSet(InterceptorType.NetworkRequest).size).toBe(0);
    expect(storage.getInterceptorsSet(InterceptorType.HlsPlaylistParse).size).toBe(0);
  });
});
