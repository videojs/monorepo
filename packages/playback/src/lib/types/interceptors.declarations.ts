import type { InterceptorType } from '../consts/interceptor-type';
import type { InterceptorTypeToInterceptorMap } from './interceptor-type-to-interceptor-map.declarations';

export interface IInterceptorsStorage {
  addInterceptor<K extends InterceptorType>(interceptorType: K, interceptor: InterceptorTypeToInterceptorMap[K]): void;
  removeInterceptor<K extends InterceptorType>(
    interceptorType: K,
    interceptor: InterceptorTypeToInterceptorMap[K]
  ): void;
  getInterceptorsSet<K extends InterceptorType>(interceptorType: K): Set<InterceptorTypeToInterceptorMap[K]>;
  removeAllInterceptorsForType<K extends InterceptorType>(interceptorType: K): void;
  removeAllInterceptors(): void;
}
