import { beforeEach, describe, it, vi, expect } from 'vitest';
import { capture, instance, mock, when } from '@typestrong/ts-mockito';

import type { Mock } from 'vitest';

import type { ILogger } from '../../src/lib/types/logger.declarations';
import type {
  INetworkInterceptorsProvider,
  INetworkResponseInfo,
  IRequestPayloadWithChunkHandler,
  IRequestPayloadWithMapper,
} from '../../src/lib/types/network.declarations';
import type { IEventEmitter } from '../../src/lib/types/event-emitter.declarations';
import type { NetworkEventMap } from '../../src/lib/types/mappers/event-type-to-event-map.declarations';
import type { NetworkRequestDependencies } from '../../src/lib/network/network-request';
import type { NetworkConfiguration } from '../../src/lib/types/configuration.declarations';

import { RequestType } from '../../src/lib/consts/request-type';
import { NetworkRequestWithMapper, NetworkRequestWithChunkHandler } from '../../src/lib/network/network-request';
import {
  FetchError,
  RequestAbortedNetworkError,
  TimeoutNetworkError,
} from '../../src/lib/network/network-manager-errors';
import type {
  NetworkRequestAttemptCompletedSuccessfullyEvent,
  NetworkRequestAttemptCompletedUnsuccessfullyEvent,
  NetworkRequestAttemptFailedEvent,
  NetworkRequestAttemptStartedEvent,
} from '../../src/lib/events/network-events';

describe('NetworkRequest', () => {
  let logger: ILogger;
  let networkInterceptorsProvider: INetworkInterceptorsProvider;
  let eventEmitter: IEventEmitter<NetworkEventMap>;
  let configuration: NetworkConfiguration;
  let executor: Mock<(request: Request) => Promise<Response>>;
  let dependencies: NetworkRequestDependencies;

  beforeEach(() => {
    logger = mock<ILogger>();
    networkInterceptorsProvider = mock<INetworkInterceptorsProvider>();
    eventEmitter = mock<IEventEmitter<NetworkEventMap>>();
    executor = vi.fn();
    configuration = { maxAttempts: 3, initialDelay: 10, delayFactor: 0.5, fuzzFactor: 0.1, timeout: 3 };
    dependencies = {
      logger: instance(logger),
      networkInterceptorsProvider: instance(networkInterceptorsProvider),
      eventEmitter: instance(eventEmitter),
      configuration,
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
      when(networkInterceptorsProvider.getNetworkRequestInterceptors()).thenReturn(new Set());

      executor.mockResolvedValue(new Response(new TextEncoder().encode('response data')));

      const networkRequest = new NetworkRequestWithMapper('request', payload, dependencies);

      const result = await networkRequest.done;

      expect(result).toBe('response data');
      expect(executor).toHaveBeenCalledTimes(1);
    });

    it('should retry requests according to the configuration', async () => {
      when(networkInterceptorsProvider.getNetworkRequestInterceptors()).thenReturn(new Set());

      executor
        .mockRejectedValueOnce(new Error('fetch error 1'))
        .mockRejectedValueOnce(new Error('fetch error 2'))
        .mockResolvedValueOnce(new Response(new TextEncoder().encode('response data')));

      const networkRequest = new NetworkRequestWithMapper('request', payload, dependencies);

      const result = await networkRequest.done;

      expect(result).toBe('response data');
      expect(executor).toHaveBeenCalledTimes(3);
    });

    it('should emit NetworkRequestAttempt* events', async () => {
      when(networkInterceptorsProvider.getNetworkRequestInterceptors()).thenReturn(new Set());

      executor
        .mockRejectedValueOnce(new Error('fetch error 1'))
        .mockResolvedValueOnce(new Response(new TextEncoder().encode('response data failed'), { status: 404 }))
        .mockResolvedValueOnce(new Response(new TextEncoder().encode('response data')));

      const networkRequest = new NetworkRequestWithMapper('request', payload, dependencies);

      const result = await networkRequest.done;

      expect(result).toBe('response data');

      const [started1] = capture<NetworkRequestAttemptStartedEvent>(eventEmitter.emitEvent).byCallIndex(0);
      const [failed1] = capture<NetworkRequestAttemptFailedEvent>(eventEmitter.emitEvent).byCallIndex(1);
      const [started2] = capture<NetworkRequestAttemptStartedEvent>(eventEmitter.emitEvent).byCallIndex(2);
      const [unsuccessful2] = capture<NetworkRequestAttemptCompletedUnsuccessfullyEvent>(
        eventEmitter.emitEvent
      ).byCallIndex(3);
      const [started3] = capture<NetworkRequestAttemptStartedEvent>(eventEmitter.emitEvent).byCallIndex(4);
      const [successful3] = capture<NetworkRequestAttemptCompletedSuccessfullyEvent>(
        eventEmitter.emitEvent
      ).byCallIndex(5);

      // First attempt started
      expect(started1.networkRequestInfo.id).toBe('request');
      expect(started1.networkRequestInfo.requestType).toBe(RequestType.HlsPlaylist);
      expect(started1.networkRequestInfo.configuration).toEqual(configuration);
      expect(started1.networkRequestInfo.request.url).toBe('https://example.com/');
      expect(started1.networkRequestInfo.attemptInfo).toEqual({
        attemptNumber: 1,
        currentBaseDelay: 10,
        minDelay: 0.9 * 10,
        maxDelay: 1.1 * 10,
      });

      // First attempt failed
      expect(failed1.networkRequestInfo.id).toBe('request');
      expect(failed1.networkRequestInfo.requestType).toBe(RequestType.HlsPlaylist);
      expect(failed1.networkRequestInfo.configuration).toEqual(configuration);
      expect(failed1.networkRequestInfo.request.url).toBe('https://example.com/');
      expect(failed1.networkRequestInfo.attemptInfo).toEqual({
        attemptNumber: 1,
        currentBaseDelay: 10,
        minDelay: 0.9 * 10,
        maxDelay: 1.1 * 10,
      });
      expect(failed1.error).toEqual(new FetchError(new Error('fetch error 1')));

      // Second attempt started
      expect(started2.networkRequestInfo.id).toBe('request');
      expect(started2.networkRequestInfo.requestType).toBe(RequestType.HlsPlaylist);
      expect(started2.networkRequestInfo.configuration).toEqual(configuration);
      expect(started2.networkRequestInfo.request.url).toBe('https://example.com/');
      expect(started2.networkRequestInfo.attemptInfo).toEqual({
        attemptNumber: 2,
        currentBaseDelay: 15,
        minDelay: 0.9 * 15,
        maxDelay: 1.1 * 15,
      });

      // Second attempt completed unsuccessfully
      expect(unsuccessful2.networkRequestInfo.id).toBe('request');
      expect(unsuccessful2.networkRequestInfo.requestType).toBe(RequestType.HlsPlaylist);
      expect(unsuccessful2.networkRequestInfo.configuration).toEqual(configuration);
      expect(unsuccessful2.networkRequestInfo.request.url).toBe('https://example.com/');
      expect(unsuccessful2.networkRequestInfo.attemptInfo).toEqual({
        attemptNumber: 2,
        currentBaseDelay: 15,
        minDelay: 0.9 * 15,
        maxDelay: 1.1 * 15,
      });
      expect(unsuccessful2.networkResponseInfo.response.status).toBe(404);

      // Third attempt started
      expect(started3.networkRequestInfo.id).toBe('request');
      expect(started3.networkRequestInfo.requestType).toBe(RequestType.HlsPlaylist);
      expect(started3.networkRequestInfo.configuration).toEqual(configuration);
      expect(started3.networkRequestInfo.request.url).toBe('https://example.com/');
      expect(started3.networkRequestInfo.attemptInfo).toEqual({
        attemptNumber: 3,
        currentBaseDelay: 22.5,
        minDelay: 0.9 * 22.5,
        maxDelay: 1.1 * 22.5,
      });

      // Third attempt completed successfully
      expect(successful3.networkRequestInfo.id).toBe('request');
      expect(successful3.networkRequestInfo.requestType).toBe(RequestType.HlsPlaylist);
      expect(successful3.networkRequestInfo.configuration).toEqual(configuration);
      expect(successful3.networkRequestInfo.request.url).toBe('https://example.com/');
      expect(successful3.networkRequestInfo.attemptInfo).toEqual({
        attemptNumber: 3,
        currentBaseDelay: 22.5,
        minDelay: 0.9 * 22.5,
        maxDelay: 1.1 * 22.5,
      });
      expect(successful3.networkResponseInfo.response.status).toBe(200);

      expect(executor).toHaveBeenCalledTimes(3);
    });

    it('should log warns when something goes wrong', async () => {
      const interceptors = new Set<(request: Request) => Promise<Request>>();
      interceptors.add(async () => {
        throw new Error('interceptor error');
      });

      when(networkInterceptorsProvider.getNetworkRequestInterceptors()).thenReturn(interceptors);

      executor
        .mockRejectedValueOnce(new Error('fetch error 1'))
        .mockResolvedValueOnce(new Response(new TextEncoder().encode('response data failed'), { status: 404 }))
        .mockResolvedValueOnce(new Response(new TextEncoder().encode('response data')));

      const networkRequest = new NetworkRequestWithMapper('request', payload, dependencies);

      const result = await networkRequest.done;

      expect(result).toBe('response data');

      const interceptorsFailed1 = capture<string, Error>(logger.warn).byCallIndex(0);
      const requestFailed1 = capture<string, FetchError>(logger.warn).byCallIndex(1);
      const interceptorsFailed2 = capture<string, Error>(logger.warn).byCallIndex(2);
      const requestUnsuccessful2 = capture<string, INetworkResponseInfo>(logger.warn).byCallIndex(3);
      const interceptorsFailed3 = capture<string, Error>(logger.warn).byCallIndex(4);

      // First attempt interceptors
      expect(interceptorsFailed1[0]).toBe('Got an error during request interceptor execution: ');
      expect(interceptorsFailed1[1]).toEqual(new Error('interceptor error'));

      // First attempt failed
      expect(requestFailed1[0]).toBe('Attempt Failed: ');
      expect(requestFailed1[1]).toEqual(new FetchError(new Error('fetch error 1')));

      // Second attempt interceptors
      expect(interceptorsFailed2[0]).toBe('Got an error during request interceptor execution: ');
      expect(interceptorsFailed2[1]).toEqual(new Error('interceptor error'));

      // Second attempt completed unsuccessfully
      expect(requestUnsuccessful2[0]).toBe('Attempt Completed Unsuccessfully: ');
      expect(requestUnsuccessful2[1].response.status).toBe(404);

      // Third attempt interceptors
      expect(interceptorsFailed3[0]).toBe('Got an error during request interceptor execution: ');
      expect(interceptorsFailed3[1]).toEqual(new Error('interceptor error'));

      expect(executor).toHaveBeenCalledTimes(3);
    });

    it('should fail with aborted error without retries when request is aborted', async () => {
      vi.useFakeTimers();
      when(networkInterceptorsProvider.getNetworkRequestInterceptors()).thenReturn(new Set());

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
      when(networkInterceptorsProvider.getNetworkRequestInterceptors()).thenReturn(new Set());

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
      const interceptors = new Set<(request: Request) => Promise<Request>>();
      interceptors.add(async () => new Request('https://from-interceptor-1.com'));
      interceptors.add(async () => new Request('https://from-interceptor-2.com'));

      when(networkInterceptorsProvider.getNetworkRequestInterceptors()).thenReturn(interceptors);

      const requests: Array<Request> = [];

      executor.mockImplementation((request) => {
        requests.push(request);
        return Promise.resolve(new Response(new TextEncoder().encode('response data')));
      });

      const networkRequest = new NetworkRequestWithMapper('request', payload, dependencies);

      const result = await networkRequest.done;

      expect(result).toBe('response data');
      expect(requests).toHaveLength(1);
      expect(requests[0].url).toBe('https://from-interceptor-2.com/');
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
      when(networkInterceptorsProvider.getNetworkRequestInterceptors()).thenReturn(new Set());

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
