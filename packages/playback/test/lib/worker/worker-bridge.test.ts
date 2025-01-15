import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkerBridge } from '../../../src/lib/worker/worker-bridge';
import type { ILogger } from '../../../src/lib/types/logger.declarations';
import type { PlayerConfiguration } from '../../../src/lib/types/configuration.declarations';
import { instance, mock } from '@typestrong/ts-mockito';
import type { INetworkManager } from '../../../src/lib/types/network.declarations';
import type { IWorkerToMainThreadMessageChannel } from '../../../src/lib/types/message-channels/worker-to-main-thread-message-channel';
import type { PipelineLoaderFactoryStorage } from '../../../src/lib/utils/pipeline-loader-factory-storage';
import { LoggerLevel } from '../../../src/lib/consts/logger-level';
import { SetLoggerLevelMessage } from '../../../src/lib/worker/messages/main-to-worker-thread-messages';

describe('worker-script', () => {
  let scope: DedicatedWorkerGlobalScope;
  let logger: ILogger;
  let networkManager: INetworkManager;
  let messageChannel: IWorkerToMainThreadMessageChannel;
  let configuration: PlayerConfiguration;
  let pipelineLoaderFactoryStorage: PipelineLoaderFactoryStorage;
  let workerBridge: WorkerBridge;

  beforeEach(() => {
    logger = { setLoggerLevel: vi.fn() } as unknown as ILogger;
    networkManager = mock<INetworkManager>();
    messageChannel = mock<IWorkerToMainThreadMessageChannel>();
    pipelineLoaderFactoryStorage = mock<PipelineLoaderFactoryStorage>();
    configuration = {} as PlayerConfiguration;
    scope = { addEventListener: vi.fn() } as unknown as DedicatedWorkerGlobalScope;

    workerBridge = new WorkerBridge({
      logger,
      networkManager: instance(networkManager),
      messageChannel: instance(messageChannel),
      pipelineLoaderFactoryStorage: instance(pipelineLoaderFactoryStorage),
      globalScope: scope,
      configuration,
    });
  });

  describe('WorkerBridge', () => {
    it('should create WorkerBridge instance', () => {
      expect(workerBridge).toBeInstanceOf(WorkerBridge);
      expect(scope.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });
  });

  describe('messages', () => {
    it('should set logger level when logger level is changed', () => {
      const onMessage = (scope.addEventListener as Mock).mock.calls[0][1];
      const message = new SetLoggerLevelMessage(LoggerLevel.Error);
      onMessage({ data: message });
      expect(logger.setLoggerLevel).toHaveBeenCalledWith(LoggerLevel.Error);
    });
  });
});
