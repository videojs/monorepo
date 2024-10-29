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
  url: string;
  requestInit: RequestInit;
  readonly requestType: RequestType;
  readonly configuration: Readonly<NetworkConfiguration>;
  readonly attemptInfo: Readonly<AttemptInfo>;
  readonly id: string;
}

export interface INetworkResponseInfo {
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly redirected: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly body: ArrayBuffer;
}

export type INetworkExecutor = (request: Request) => Promise<Response>;

export type INetworkRequestInterceptor = (requestInfo: INetworkRequestInfo) => Promise<INetworkRequestInfo>;

export interface INetworkHooks {
  onAttemptStarted(requestInfo: INetworkRequestInfo): void;
  onAttemptCompletedSuccessfully(requestInfo: INetworkRequestInfo, responseInfo: INetworkResponseInfo): void;
  onAttemptCompletedUnsuccessfully(requestInfo: INetworkRequestInfo, responseInfo: INetworkResponseInfo): void;
  onAttemptFailed(requestInfo: INetworkRequestInfo, error: Error): void;
}

export interface INetworkManager {
  readonly hooks: INetworkHooks;
  requestInterceptor: INetworkRequestInterceptor;
  updateConfiguration(configuration: PlayerNetworkConfiguration): void;
  get<T>(payload: IRequestPayloadWithMapper<T>): INetworkRequest<T>;
  getProgressive(payload: IRequestPayloadWithChunkHandler): INetworkRequest<void>;
  post<T>(payload: IRequestPayloadWithMapper<T>): INetworkRequest<T>;
  postProgressive(payload: IRequestPayloadWithChunkHandler): INetworkRequest<void>;
  reset(): void;
}
