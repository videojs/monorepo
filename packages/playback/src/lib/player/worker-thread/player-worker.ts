// base
import { BasePlayer } from '../base/base-player';
import type { PlayerDependencies } from '../base/base-player';
//enums
import type { LoggerLevel } from '../../consts/logger-level';
// types
import type { DeepPartial } from '../../types/utility.declarations';
import type { PlayerConfiguration } from '../../types/configuration.declarations';

declare const __WORKER_CODE: string;

export class Player extends BasePlayer {
  private readonly worker_: Worker;

  public constructor(dependencies: PlayerDependencies) {
    super(dependencies);

    const workerCodeBlob = new Blob([__WORKER_CODE], { type: 'application/javascript' });
    // TODO dispose worker blob url
    const workerCodeBlobUrl = URL.createObjectURL(workerCodeBlob);
    // TODO: I would assume worker should be injected in the constructor for testing purposes
    this.worker_ = new Worker(workerCodeBlobUrl);
    // TODO, worker terminate + cleanup
    this.worker_.addEventListener('message', this.onWorkerMessage_);
  }

  private readonly onWorkerMessage_ = (event: MessageEvent): void => {
    this.logger_.debug('received message from worker', event.data);
    // TODO: EMIT_EVENT --> eventEmitter.emit(event)
    // TODO: RUN_INTERCEPTORS --> execute interceptors and post message (INTERCEPTORS_EXECUTED) with result
  };

  public setLoggerLevel(loggerLevel: LoggerLevel): void {
    super.setLoggerLevel(loggerLevel);
    // TODO: post message
    this.worker_.postMessage({});
  }

  public updateConfiguration(configurationChunk: DeepPartial<PlayerConfiguration>): void {
    super.updateConfiguration(configurationChunk);
    // TODO: post message
    this.worker_.postMessage({});
  }

  public resetConfiguration(): void {
    super.resetConfiguration();
    // TODO: post message
    this.worker_.postMessage({});
  }

  public stop(reason: string): void {
    super.stop(reason);
    // TODO: post message
    this.worker_.postMessage({});
  }

  public dispose(): void {
    super.dispose();
    this.worker_.terminate();
  }
}
