import type { InterceptorType } from '../consts/interceptorType';

export interface InterceptorTypeToInterceptorMap {
  [InterceptorType.NetworkRequest]: (request: Request) => Promise<Request>;
}
