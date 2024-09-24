import type { InterceptorType } from '../consts/interceptorType';
import type { InterceptorTypeToInterceptorMap } from '../types/interceptorTypeToInterceptorMap.declarations';

export class InterceptorsStorage {
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
    return new Set(this.storage_.get(interceptorType) ?? []);
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
