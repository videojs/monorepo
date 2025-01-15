import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AttachMseHandleMessage,
  EmitEventMessage,
  LoadPipelineLoaderExecutionResultMessage,
  WorkerToMainThreadMessageChannel,
} from '../../../../src/lib/worker/messages/worker-to-main-thread-messages';
import { LoggerLevelChangedEvent } from '../../../../src/lib/events/player-events';
import { LoggerLevel } from '../../../../src/lib/consts/logger-level';
import {
  AttachMseFallbackExecutionResultMessage,
  InterceptorsExecutionResultMessage,
} from '../../../../src/lib/worker/messages/main-to-worker-thread-messages';
import { InterceptorType } from '../../../../src/lib/consts/interceptor-type';
import type { ParsedPlaylist } from '@videojs/hls-parser';

describe('worker-to-main-thread-messages', () => {
  let scope: DedicatedWorkerGlobalScope;
  let channel: WorkerToMainThreadMessageChannel;

  beforeEach(() => {
    scope = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as DedicatedWorkerGlobalScope;

    channel = new WorkerToMainThreadMessageChannel(scope);
  });

  it('sendEmitEventMessage', () => {
    const event = new LoggerLevelChangedEvent(LoggerLevel.Info);
    channel.sendEmitEventMessage(event);
    expect(scope.postMessage).toHaveBeenCalledWith(new EmitEventMessage(event));
  });

  it('sendAttachMseHandleMessage', () => {
    const handle = {} as MediaSourceHandle;
    const isManagedMediaSource = true;
    channel.sendAttachMseHandleMessage(handle, isManagedMediaSource);
    expect(scope.postMessage).toHaveBeenCalledWith(new AttachMseHandleMessage(handle, isManagedMediaSource), [handle]);
  });

  it('sendLoadPipelineLoaderExecutionResultMessage', () => {
    const isLoaded = true;
    const executionId = 'executionId';
    channel.sendLoadPipelineLoaderExecutionResultMessage(isLoaded, executionId);
    expect(scope.postMessage).toHaveBeenCalledWith(new LoadPipelineLoaderExecutionResultMessage(isLoaded, executionId));
  });

  it('sendAttachMseFallbackMessage', async () => {
    const promise = channel.sendAttachMseFallbackMessage();
    const message = (scope.postMessage as Mock).mock.calls[0][0];
    const successMessage = new AttachMseFallbackExecutionResultMessage(message.executionId, true);
    const onMessage = (scope.addEventListener as Mock).mock.calls[0][1];
    onMessage({ data: successMessage });
    expect(scope.removeEventListener).toHaveBeenCalledWith('message', onMessage);
    await expect(promise).resolves.toBe(true);
  });

  it('sendRunInterceptorsMessage', async () => {
    const payload = {} as ParsedPlaylist;
    const promise = channel.sendRunInterceptorsMessage(InterceptorType.HlsPlaylistParsed, payload);
    const message = (scope.postMessage as Mock).mock.calls[0][0];
    const updatedPayload = { updated: true } as unknown as ParsedPlaylist;
    const successMessage = new InterceptorsExecutionResultMessage(message.executionId, updatedPayload);
    const onMessage = (scope.addEventListener as Mock).mock.calls[0][1];
    onMessage({ data: successMessage });
    expect(scope.removeEventListener).toHaveBeenCalledWith('message', onMessage);
    await expect(promise).resolves.toBe(updatedPayload);
  });
});
