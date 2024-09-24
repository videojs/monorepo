import type { RequestType } from '../consts/requestType';
import type { NetworkConfiguration, PlayerNetworkConfiguration } from './configuration.declarations';
import type { InterceptorTypeToInterceptorMap } from './interceptorTypeToInterceptorMap.declarations';
import type { InterceptorType } from '../consts/interceptorType';

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
}

export interface INetworkInterceptorsProvider {
  getNetworkRequestInterceptors(): Set<InterceptorTypeToInterceptorMap[InterceptorType.NetworkRequest]>;
}

export interface NetworkRequestInfo {
  request: Request;
  requestType: RequestType;
  configuration: NetworkConfiguration;
  id: string;
}

export interface NetworkResponseInfo {
  response: Response;
}

export interface INetworkManager {
  updateConfiguration(configuration: PlayerNetworkConfiguration): void;
  get<T>(payload: IRequestPayloadWithMapper<T>): INetworkRequest<T>;
  getProgressive(payload: IRequestPayloadWithChunkHandler): INetworkRequest<void>;
  post<T>(payload: IRequestPayloadWithMapper<T>): INetworkRequest<T>;
  postProgressive(payload: IRequestPayloadWithChunkHandler): INetworkRequest<void>;
}
