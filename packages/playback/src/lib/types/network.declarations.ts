import type { RequestType } from '../consts/request-type';
import type { NetworkConfiguration, PlayerNetworkConfiguration } from './configuration.declarations';
import type { AttemptInfo } from './retry.declarations';

export interface IRequestPayload {
  url: URL;
  requestType: RequestType;
  requestInit?: Omit<RequestInit, 'method' | 'signal'>;
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
  configuration: NetworkConfiguration;
  done: Promise<T>;
  id: string;
  isAborted: boolean;
}

export interface INetworkRequestInfo {
  request: Request;
  requestType: RequestType;
  configuration: NetworkConfiguration;
  attemptInfo: AttemptInfo;
  id: string;
}

export interface INetworkResponseInfo {
  response: Response;
}

export interface INetworkManager {
  updateConfiguration(configuration: PlayerNetworkConfiguration): void;
  get<T>(payload: IRequestPayloadWithMapper<T>): INetworkRequest<T>;
  getProgressive(payload: IRequestPayloadWithChunkHandler): INetworkRequest<void>;
  post<T>(payload: IRequestPayloadWithMapper<T>): INetworkRequest<T>;
  postProgressive(payload: IRequestPayloadWithChunkHandler): INetworkRequest<void>;
}
