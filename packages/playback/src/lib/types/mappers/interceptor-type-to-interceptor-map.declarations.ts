import type { InterceptorType } from '../../consts/interceptor-type';

export interface InterceptorTypeToInterceptorPayloadMap {
  [InterceptorType.NetworkRequest]: Request;
  [InterceptorType.HlsPlaylistParse]: Uint8Array;
}
