import type { InterceptorType } from '../../consts/interceptor-type';

export interface InterceptorTypeToInterceptorMap {
  [InterceptorType.NetworkRequest]: (request: Request) => Promise<Request>;
  [InterceptorType.HlsPlaylistParse]: (playlist: Uint8Array) => Promise<Uint8Array>;
}
