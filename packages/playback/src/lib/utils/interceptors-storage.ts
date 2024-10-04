import type { InterceptorType } from '../consts/interceptor-type';
import type { InterceptorTypeToInterceptorMap } from '../types/mappers/interceptor-type-to-interceptor-map.declarations';
import type { IInterceptorsStorage } from '../types/interceptors.declarations';

export class InterceptorsStorage implements IInterceptorsStorage {
  private readonly storage_ = new Map<InterceptorType, Set<InterceptorTypeToInterceptorMap[InterceptorType]>>();

  public addInterceptor<K extends InterceptorType>(
    interceptorType: K,
    interceptor: InterceptorTypeToInterceptorMap[K]
  ): void {
    if (!this.storage_.has(interceptorType)) {
      this.storage_.set(interceptorType, new Set());
    }

    this.storage_.get(interceptorType)?.add(interceptor);
  }

  public getInterceptorsSet<K extends InterceptorType>(interceptorType: K): Set<InterceptorTypeToInterceptorMap[K]> {
    return new Set((this.storage_.get(interceptorType) as Set<InterceptorTypeToInterceptorMap[K]>) ?? []);
  }

  public removeInterceptor<K extends InterceptorType>(
    interceptorType: K,
    interceptor: InterceptorTypeToInterceptorMap[K]
  ): void {
    const interceptors = this.storage_.get(interceptorType);
    if (interceptors) {
      interceptors.delete(interceptor);
      if (interceptors.size === 0) {
        this.storage_.delete(interceptorType);
      }
    }
  }

  public removeAllInterceptorsForType<K extends InterceptorType>(interceptorType: K): void {
    this.storage_.delete(interceptorType);
  }

  public removeAllInterceptors(): void {
    return this.storage_.clear();
  }
}
