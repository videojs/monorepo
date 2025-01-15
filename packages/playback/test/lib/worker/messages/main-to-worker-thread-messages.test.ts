import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  InterceptorsExecutionResultMessage,
  MainToWorkerThreadMessageChannel,
  SetLoggerLevelMessage,
  StopMessage,
  UpdateConfigurationMessage,
} from '../../../../src/lib/worker/messages/main-to-worker-thread-messages';
import { LoggerLevel } from '../../../../src/lib/consts/logger-level';
import { getPlayerConfigurationDefaults } from '../../../../src/lib/configuration/configuration-defaults';
import type { INetworkRequestInfo } from '../../../../src/lib/types/network.declarations';
import { LoadPipelineLoaderExecutionResultMessage } from '../../../../src/lib/worker/messages/worker-to-main-thread-messages';

describe('main-to-worker-thread-messages', () => {
  let mockWorker: Worker;
  let channel: MainToWorkerThreadMessageChannel;

  beforeEach(() => {
    mockWorker = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Worker;
    channel = new MainToWorkerThreadMessageChannel(mockWorker);
  });

  it('sendSetLoggerLevelMessage', () => {
    channel.sendSetLoggerLevelMessage(LoggerLevel.Info);
    expect(mockWorker.postMessage).toHaveBeenCalledWith(new SetLoggerLevelMessage(LoggerLevel.Info));
  });

  it('sendUpdateConfigurationMessage', () => {
    const config = getPlayerConfigurationDefaults();

    channel.sendUpdateConfigurationMessage(config);
    expect(mockWorker.postMessage).toHaveBeenCalledWith(new UpdateConfigurationMessage(config));
  });

  it('sendStopMessage', () => {
    channel.sendStopMessage();
    expect(mockWorker.postMessage).toHaveBeenCalledWith(new StopMessage());
  });

  it('sendInterceptorsExecutionResultMessage', () => {
    const netwrokRequestInfo = {} as INetworkRequestInfo;
    channel.sendInterceptorsExecutionResultMessage('executionId', netwrokRequestInfo);
    expect(mockWorker.postMessage).toHaveBeenCalledWith(
      new InterceptorsExecutionResultMessage('executionId', netwrokRequestInfo)
    );
  });

  describe('sendLoadPipelineLoaderMessage', () => {
    it('should resolve when receiving a matching successful LoadPipelineLoaderExecutionResultMessage', async () => {
      const payload = { url: 'url', namespace: 'namespace', mimeType: 'mimeType', alias: 'alias' };
      const promise = channel.sendLoadPipelineLoaderMessage(payload);
      const message = (mockWorker.postMessage as Mock).mock.calls[0][0];
      const successMessage = new LoadPipelineLoaderExecutionResultMessage(true, message.executionId);
      const onMessage = (mockWorker.addEventListener as Mock).mock.calls[0][1];
      onMessage({ data: successMessage });
      expect(mockWorker.removeEventListener).toHaveBeenCalledWith('message', onMessage);

      await expect(promise).resolves.toBeUndefined();
    });

    it('should reject when receiving a matching unsuccessful LoadPipelineLoaderExecutionResultMessage', async () => {
      const payload = { url: 'url', namespace: 'namespace', mimeType: 'mimeType', alias: 'alias' };
      const promise = channel.sendLoadPipelineLoaderMessage(payload);
      const message = (mockWorker.postMessage as Mock).mock.calls[0][0];
      const unsuccessMessage = new LoadPipelineLoaderExecutionResultMessage(false, message.executionId);
      const onMessage = (mockWorker.addEventListener as Mock).mock.calls[0][1];
      onMessage({ data: unsuccessMessage });
      expect(mockWorker.removeEventListener).toHaveBeenCalledWith('message', onMessage);

      await expect(promise).rejects.toBeUndefined();
    });
  });
});
