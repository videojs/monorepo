/**
 * This file should be entry point for worker bundle
 */
import type { WorkerToMainMessage } from './messages/worker-to-main-messages';
import type {
  MainToWorkerMessage,
  SetLoggerLevelMessage,
  UpdateConfigurationMessage,
} from './messages/main-to-worker-messages';
import { MainToWorkerMessageType } from './consts/main-to-worker-message-type';
import type { ILogger } from '../../types/logger.declarations';
import type { PlayerConfiguration } from '../../types/configuration.declarations';
// services:
import { Logger } from '../../utils/logger';
import { getPlayerConfigurationDefaults } from '../../configuration/configuration-defaults';

interface WorkerBridgeDependencies {
  readonly globalScope: Window & typeof globalThis;
  readonly logger: ILogger;
  readonly configuration: PlayerConfiguration;
}

class WorkerBridge {
  public static create(): WorkerBridge {
    return new WorkerBridge({
      globalScope: self,
      logger: new Logger({ console: console, delimiter: '>', label: 'Player' }).createSubLogger('WorkerBridge'),
      configuration: getPlayerConfigurationDefaults(),
    });
  }

  private readonly logger_: ILogger;
  private readonly globalScope_: Window & typeof globalThis;

  private configuration_: PlayerConfiguration;

  public constructor(dependencies: WorkerBridgeDependencies) {
    this.globalScope_ = dependencies.globalScope;
    this.logger_ = dependencies.logger;
    this.configuration_ = dependencies.configuration;

    // We don't care about clean-up, since terminate() call on main thread should fully destroy worker
    this.globalScope_.addEventListener('message', this.onMessageFromMainThread_);
  }

  private readonly onMessageFromMainThread_ = (event: MessageEvent<MainToWorkerMessage>): void => {
    switch (event.data.type) {
      case MainToWorkerMessageType.SetLoggerLevel:
        return this.handleSetLoggerLevelMessage_(event.data as SetLoggerLevelMessage);
      case MainToWorkerMessageType.UpdateConfiguration:
        return this.handleUpdateConfigurationMessage_(event.data as UpdateConfigurationMessage);
      default: {
        break;
      }
    }
  };

  private handleSetLoggerLevelMessage_(message: SetLoggerLevelMessage): void {
    this.logger_.setLoggerLevel(message.level);
  }

  private handleUpdateConfigurationMessage_(message: UpdateConfigurationMessage): void {
    this.configuration_ = message.configuration;
  }

  private sendMessageToMainThread_(message: WorkerToMainMessage): void {
    this.globalScope_.postMessage(message);
  }
}

WorkerBridge.create();
