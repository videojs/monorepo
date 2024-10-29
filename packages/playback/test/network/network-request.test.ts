import { beforeEach, describe, it, vi, expect } from 'vitest';
import { capture, instance, mock } from '@typestrong/ts-mockito';

import type { Mock } from 'vitest';

import type { ILogger } from '../../src/lib/types/logger.declarations';
import type {
  INetworkHooks,
  INetworkRequestInfo,
  INetworkResponseInfo,
  IRequestPayloadWithChunkHandler,
  IRequestPayloadWithMapper,
} from '../../src/lib/types/network.declarations';
import type { NetworkRequestDependencies } from '../../src/lib/network/network-request';
import type { NetworkConfiguration } from '../../src/lib/types/configuration.declarations';

import { RequestType } from '../../src/lib/consts/request-type';
import { NetworkRequestWithMapper, NetworkRequestWithChunkHandler } from '../../src/lib/network/network-request';
import {
  FetchError,
  RequestAbortedNetworkError,
  TimeoutNetworkError,
} from '../../src/lib/network/network-manager-errors';

describe('NetworkRequest', () => {
  let logger: ILogger;
  let hooks: INetworkHooks;
  let configuration: NetworkConfiguration;
  let executor: Mock<(request: Request) => Promise<Response>>;
  let requestInterceptor: Mock<(requestInfo: INetworkRequestInfo) => Promise<INetworkRequestInfo>>;
  let dependencies: NetworkRequestDependencies;

  beforeEach(() => {
    logger = mock<ILogger>();
    hooks = mock<INetworkHooks>();
    executor = vi.fn();
    requestInterceptor = vi.fn((requestInfo) => Promise.resolve(requestInfo));
    configuration = { maxAttempts: 3, initialDelay: 10, delayFactor: 0.5, fuzzFactor: 0.1, timeout: 3 };
    dependencies = {
      logger: instance(logger),
      hooks: instance(hooks),
      configuration,
      requestInterceptor,
      executor,
    };
  });

  describe('NetworkRequestWithMapper', () => {
    let payload: IRequestPayloadWithMapper<string>;
    let mapper: Mock<(body: Uint8Array) => string>;

    beforeEach(() => {
      mapper = vi.fn((body: Uint8Array) => new TextDecoder().decode(body));

      payload = {
        url: new URL('https://example.com'),
        requestType: RequestType.HlsPlaylist,
        mapper,
      };
    });

    it('should map response data using provided mapper function when request is successful', async () => {
      executor.mockResolvedValue(new Response(new TextEncoder().encode('response data')));

      const networkRequest = new NetworkRequestWithMapper('request', payload, dependencies);

      const result = await networkRequest.done;

      expect(result).toBe('response data');
      expect(executor).toHaveBeenCalledTimes(1);
    });

    it('should retry requests according to the configuration', async () => {
      executor
        .mockRejectedValueOnce(new Error('fetch error 1'))
        .mockRejectedValueOnce(new Error('fetch error 2'))
        .mockResolvedValueOnce(new Response(new TextEncoder().encode('response data')));

      const networkRequest = new NetworkRequestWithMapper('request', payload, dependencies);

      const result = await networkRequest.done;

      expect(result).toBe('response data');
      expect(executor).toHaveBeenCalledTimes(3);
    });

    it('should call NetworkRequestAttempt* hooks', async () => {
      executor
        .mockRejectedValueOnce(new Error('fetch error 1'))
        .mockResolvedValueOnce(new Response(new TextEncoder().encode('response data failed'), { status: 404 }))
        .mockResolvedValueOnce(new Response(new TextEncoder().encode('response data')));

      const networkRequest = new NetworkRequestWithMapper('request', payload, dependencies);

      const result = await networkRequest.done;

      expect(result).toBe('response data');

      const [started1] = capture<INetworkRequestInfo>(hooks.onAttemptStarted).byCallIndex(0);
      const [failed1, failed1Error] = capture<INetworkRequestInfo, Error>(hooks.onAttemptFailed).byCallIndex(0);
      const [started2] = capture<INetworkRequestInfo>(hooks.onAttemptStarted).byCallIndex(1);
      const [unsuccessful2, unsuccessful2Response] = capture<INetworkRequestInfo, INetworkResponseInfo>(
        hooks.onAttemptCompletedUnsuccessfully
      ).byCallIndex(0);
      const [started3] = capture<INetworkRequestInfo>(hooks.onAttemptStarted).byCallIndex(2);
      const [successful3, successful3Response] = capture<INetworkRequestInfo, INetworkResponseInfo>(
        hooks.onAttemptCompletedSuccessfully
      ).byCallIndex(0);

      // First attempt started
      expect(started1.id).toBe('request');
      expect(started1.requestType).toBe(RequestType.HlsPlaylist);
      expect(started1.configuration).toEqual(configuration);
      expect(started1.url).toBe('https://example.com/');
      expect(started1.attemptInfo).toEqual({
        attemptNumber: 1,
        currentBaseDelay: 10,
        minDelay: 0.9 * 10,
        maxDelay: 1.1 * 10,
      });

      // First attempt failed
      expect(failed1.id).toBe('request');
      expect(failed1.requestType).toBe(RequestType.HlsPlaylist);
      expect(failed1.configuration).toEqual(configuration);
      expect(failed1.url).toBe('https://example.com/');
      expect(failed1.attemptInfo).toEqual({
        attemptNumber: 1,
        currentBaseDelay: 10,
        minDelay: 0.9 * 10,
        maxDelay: 1.1 * 10,
      });
      expect(failed1Error).toEqual(new FetchError(new Error('fetch error 1')));

      // Second attempt started
      expect(started2.id).toBe('request');
      expect(started2.requestType).toBe(RequestType.HlsPlaylist);
      expect(started2.configuration).toEqual(configuration);
      expect(started2.url).toBe('https://example.com/');
      expect(started2.attemptInfo).toEqual({
        attemptNumber: 2,
        currentBaseDelay: 15,
        minDelay: 0.9 * 15,
        maxDelay: 1.1 * 15,
      });

      // Second attempt completed unsuccessfully
      expect(unsuccessful2.id).toBe('request');
      expect(unsuccessful2.requestType).toBe(RequestType.HlsPlaylist);
      expect(unsuccessful2.configuration).toEqual(configuration);
      expect(unsuccessful2.url).toBe('https://example.com/');
      expect(unsuccessful2.attemptInfo).toEqual({
        attemptNumber: 2,
        currentBaseDelay: 15,
        minDelay: 0.9 * 15,
        maxDelay: 1.1 * 15,
      });
      expect(unsuccessful2Response.status).toBe(404);

      // Third attempt started
      expect(started3.id).toBe('request');
      expect(started3.requestType).toBe(RequestType.HlsPlaylist);
      expect(started3.configuration).toEqual(configuration);
      expect(started3.url).toBe('https://example.com/');
      expect(started3.attemptInfo).toEqual({
        attemptNumber: 3,
        currentBaseDelay: 22.5,
        minDelay: 0.9 * 22.5,
        maxDelay: 1.1 * 22.5,
      });

      // Third attempt completed successfully
      expect(successful3.id).toBe('request');
      expect(successful3.requestType).toBe(RequestType.HlsPlaylist);
      expect(successful3.configuration).toEqual(configuration);
      expect(successful3.url).toBe('https://example.com/');
      expect(successful3.attemptInfo).toEqual({
        attemptNumber: 3,
        currentBaseDelay: 22.5,
        minDelay: 0.9 * 22.5,
        maxDelay: 1.1 * 22.5,
      });
      expect(successful3Response.status).toBe(200);

      expect(executor).toHaveBeenCalledTimes(3);
    });

    it('should log warns when something goes wrong', async () => {
      executor
        .mockRejectedValueOnce(new Error('fetch error 1'))
        .mockResolvedValueOnce(new Response(new TextEncoder().encode('response data failed'), { status: 404 }))
        .mockResolvedValueOnce(new Response(new TextEncoder().encode('response data')));

      const networkRequest = new NetworkRequestWithMapper('request', payload, dependencies);

      const result = await networkRequest.done;

      expect(result).toBe('response data');

      const requestFailed1 = capture<string, FetchError>(logger.warn).byCallIndex(0);
      const requestUnsuccessful2 = capture<string, INetworkResponseInfo>(logger.warn).byCallIndex(1);

      // First attempt failed
      expect(requestFailed1[0]).toBe('Attempt Failed: ');
      expect(requestFailed1[1]).toEqual(new FetchError(new Error('fetch error 1')));

      // Second attempt completed unsuccessfully
      expect(requestUnsuccessful2[0]).toBe('Attempt Completed Unsuccessfully: ');
      expect(requestUnsuccessful2[1].status).toBe(404);

      expect(executor).toHaveBeenCalledTimes(3);
    });

    it('should fail with aborted error without retries when request is aborted', async () => {
      vi.useFakeTimers();

      executor.mockImplementation((request) => {
        return new Promise((resolve, reject) => {
          let timerId: unknown = -1;

          request.signal.addEventListener(
            'abort',
            (): void => {
              clearTimeout(timerId as number);
              reject(new DOMException('request aborted', 'AbortError'));
            },
            { once: true }
          );

          timerId = setTimeout(() => {
            resolve(new Response(new TextEncoder().encode('response data')));
          }, 2);
        });
      });

      const networkRequest = new NetworkRequestWithMapper('request', payload, dependencies);
      expect(networkRequest.isAborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      networkRequest.abort('obsolete');

      try {
        await networkRequest.done;
      } catch (e) {
        expect(networkRequest.isAborted).toBe(true);
        expect(e).toEqual(new RequestAbortedNetworkError());
        expect(executor).toHaveBeenCalledTimes(1);
      }
    });

    it('should fail with timeout error when request exceeds timeout', async () => {
      vi.useFakeTimers();

      const impl = (request: Request): Promise<Response> => {
        return new Promise((resolve, reject) => {
          request.signal.addEventListener(
            'abort',
            () => {
              reject(new DOMException('request aborted', 'AbortError'));
            },
            { once: true }
          );
        });
      };

      executor.mockImplementationOnce(impl).mockImplementationOnce(impl).mockImplementationOnce(impl);

      const networkRequest = new NetworkRequestWithMapper('request', payload, dependencies);

      networkRequest.done.catch((e) => {
        expect(e).toEqual(new TimeoutNetworkError());
        expect(executor).toHaveBeenCalledTimes(3);
      });

      // attempt 1: started -> 4 ms -> timeout
      // retry: [0.9 * 10, 1.1 * 10] ms wait
      await vi.advanceTimersByTimeAsync(3);
      await vi.advanceTimersByTimeAsync(1.1 * 10);
      // attempt 2: started -> 4 ms -> timeout
      // retry: [0.9 * 15, 1.1 * 15] ms wait
      await vi.advanceTimersByTimeAsync(3);
      await vi.advanceTimersByTimeAsync(1.1 * 15);
      // attempt 3: started -> 4 ms -> timeout
      await vi.advanceTimersByTimeAsync(3);
    });

    it('should use requests from interceptors', async () => {
      requestInterceptor.mockImplementationOnce((requestInfo) => {
        return Promise.resolve({
          ...requestInfo,
          url: 'https://from-interceptor-1.com/',
        });
      });

      const requests: Array<Request> = [];

      executor.mockImplementation((request) => {
        requests.push(request);
        return Promise.resolve(new Response(new TextEncoder().encode('response data')));
      });

      const networkRequest = new NetworkRequestWithMapper('request', payload, dependencies);

      const result = await networkRequest.done;

      expect(result).toBe('response data');
      expect(requests).toHaveLength(1);
      expect(requests[0].url).toBe('https://from-interceptor-1.com/');
    });
  });

  describe('NetworkRequestWithChunkHandler', () => {
    let payload: IRequestPayloadWithChunkHandler;
    let chunkHandler: Mock<(body: Uint8Array) => void>;

    beforeEach(() => {
      chunkHandler = vi.fn();

      payload = {
        url: new URL('https://example.com'),
        requestType: RequestType.HlsPlaylist,
        chunkHandler,
      };
    });

    it('should call chunk handler with response data when request is successful', async () => {
      executor.mockResolvedValue(new Response(new TextEncoder().encode('response data!')));

      let result = '';

      chunkHandler.mockImplementation((body) => {
        result += new TextDecoder().decode(body);
      });

      const networkRequest = new NetworkRequestWithChunkHandler('request', payload, dependencies);

      await networkRequest.done;

      expect(result).toBe('response data!');
      expect(executor).toHaveBeenCalledTimes(1);
    });
  });
});
