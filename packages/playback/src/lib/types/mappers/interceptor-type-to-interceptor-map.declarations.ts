import type { InterceptorType } from '../../consts/interceptor-type';
import type { INetworkRequestInfo } from '../network.declarations';

export interface InterceptorTypeToInterceptorPayloadMap {
  [InterceptorType.NetworkRequest]: INetworkRequestInfo;
  [InterceptorType.HlsPlaylistParse]: Uint8Array;
}
