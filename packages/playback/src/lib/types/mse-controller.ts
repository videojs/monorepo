import type { PlayerMseConfiguration } from './configuration.declarations';
import type { MseBufferType } from '../consts/mse-buffer-type';

export interface IMseAppendPayload {
  data: Uint8Array;
  mimeType: string;
  initData: Uint8Array | null;
  type: MseBufferType;
}

export interface IMseController {
  dispose(): void;
  updateConfiguration(configuration: PlayerMseConfiguration): void;
  append(payload: IMseAppendPayload): void;
}

export interface IMainThreadMseController extends IMseController {
  attach(videoElement: HTMLVideoElement): Promise<void>;
}

export interface IWorkerThreadMseController extends IMseController {
  attach(): Promise<void>;
}
