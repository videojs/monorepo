import type { IInterceptorsStorage, Interceptor } from '../types/interceptors.declarations';

export class InterceptorsStorage<M> implements IInterceptorsStorage<M> {
  private readonly storage_ = new Map<keyof M, Set<Interceptor<unknown>>>();

  public addInterceptor<K extends keyof M>(interceptorType: K, interceptor: Interceptor<M[K]>): void {
    if (!this.storage_.has(interceptorType)) {
      this.storage_.set(interceptorType, new Set());
    }

    const typedSet = this.storage_.get(interceptorType) as Set<Interceptor<M[K]>>;

    typedSet.add(interceptor);
  }

  public async executeInterceptors<K extends keyof M>(interceptorType: K, payload: M[K]): Promise<M[K]> {
    const set = this.storage_.get(interceptorType);

    if (!set) {
      return payload;
    }

    let result = payload;

    for (const i of set) {
      const interceptor = i as Interceptor<M[K]>;
      try {
        result = await interceptor(payload);
      } catch (e) {
        //ignore
      }
    }

    return result;
  }

  public getInterceptorsSet<K extends keyof M>(interceptorType: K): Set<Interceptor<M[K]>> {
    return (this.storage_.get(interceptorType) ?? new Set()) as Set<Interceptor<M[K]>>;
  }

  public removeInterceptor<K extends keyof M>(interceptorType: K, interceptor: Interceptor<M[K]>): void {
    const interceptors = this.storage_.get(interceptorType) as Set<Interceptor<M[K]>>;

    if (interceptors) {
      interceptors.delete(interceptor);
      if (interceptors.size === 0) {
        this.storage_.delete(interceptorType);
      }
    }
  }

  public removeAllInterceptorsForType<K extends keyof M>(interceptorType: K): void {
    this.storage_.delete(interceptorType);
  }

  public removeAllInterceptors(): void {
    return this.storage_.clear();
  }
}
