import type { RequestType } from '../consts/requestType';
import type { NetworkConfiguration } from './configuration.declarations';

export interface IRequestPayload {
  url: URL;
  requestType: RequestType;
  configuration: NetworkConfiguration;
  requestInit: Omit<RequestInit, 'method' | 'signal'>;
}

export interface IRequestPayloadWithMapper<T> extends IRequestPayload {
  mapper: (body: Uint8Array) => T;
}

export interface IRequestPayloadWithChunkHandler extends IRequestPayload {
  chunkHandler: (chunk: Uint8Array) => void;
}

export interface INetworkRequest<T> {
  abort: (reason: string) => void;
  requestType: RequestType;
  done: Promise<T>;
}

export interface INetworkManager {
  get<T>(payload: IRequestPayloadWithMapper<T>): INetworkRequest<T>;
  getProgressive(payload: IRequestPayloadWithChunkHandler): INetworkRequest<void>;
  post<T>(payload: IRequestPayloadWithMapper<T>): INetworkRequest<T>;
  postProgressive(payload: IRequestPayloadWithChunkHandler): INetworkRequest<void>;
}
