import type { InterceptorType } from '../../consts/interceptor-type';
import type { INetworkRequestInfo } from '../network.declarations';
import type { ParsedPlaylist } from '@videojs/hls-parser';

export interface InterceptorTypeToInterceptorPayloadMap {
  [InterceptorType.NetworkRequest]: INetworkRequestInfo;
  [InterceptorType.HlsPlaylistParsed]: ParsedPlaylist;
}
