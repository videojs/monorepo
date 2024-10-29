import type { IEmeManager, IEmeManagerDependencies } from '../types/eme-manager.declarations';
import type { INetworkManager } from '../types/network.declarations';
import type { ILogger } from '../types/logger.declarations';
import type { IPlayerSource } from '../types/source.declarations';

/**
 * Eme Manager should be shipped as a separate bundle and included in the player as opt-in feature
 */

export class EmeManager implements IEmeManager {
  private static areInitDataEqual_(a: ArrayBuffer, b: ArrayBuffer): boolean {
    if (a.byteLength !== b.byteLength) {
      return false;
    }

    const dataA = new Uint8Array(a);
    const dataB = new Uint8Array(b);
    const l = dataA.length;

    for (let i = 0; i < l; i++) {
      if (dataA[i] !== dataB[i]) {
        return false;
      }
    }

    return true;
  }

  protected readonly networkManager_: INetworkManager;
  protected readonly logger_: ILogger;

  protected activeVideoElement_: HTMLVideoElement | null = null;
  protected activeSource_: IPlayerSource | null = null;
  protected initDataType_: string | null = null;
  protected initData_: ArrayBuffer | null = null;

  public constructor(dependencies: IEmeManagerDependencies) {
    this.networkManager_ = dependencies.networkManager;
    this.logger_ = dependencies.logger;
  }

  public setSource(source: IPlayerSource): void {
    this.activeSource_ = source;
  }

  public setInitData(type: string, data: ArrayBuffer): void {
    // can receive from both pssh or encrypted event

    if (this.initDataType_ !== null && this.initData_ !== null) {
      if (this.initDataType_ === type && EmeManager.areInitDataEqual_(this.initData_, data)) {
        // received duplicate
        return;
      }

      // received new init data/type
      this.logger_.debug(
        `updating init data: previous(${this.initDataType_}, length: ${this.initData_.byteLength}) --> new(${type}, length: ${data.byteLength})`
      );

      // TODO: implement update
    }

    this.initDataType_ = type;
    this.initData_ = data;

    // TODO: implement handling of initData
  }

  public handleWaitingForKey(): void {
    // TODO: check if we have pending request or init one if we have init data
  }

  public stop(): void {
    this.activeSource_ = null;
  }

  public attach(videoElement: HTMLVideoElement): void {
    if (this.activeVideoElement_ !== null) {
      this.detach();
    }

    this.activeVideoElement_ = videoElement;
  }

  public detach(): void {
    this.activeVideoElement_ = null;
  }

  public dispose(): void {
    this.stop();
    this.detach();
  }
}
