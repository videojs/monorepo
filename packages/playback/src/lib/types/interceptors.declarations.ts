export type Interceptor<T> = (payload: T) => Promise<T>;

export interface IInterceptorsStorage<M> {
  addInterceptor<K extends keyof M>(interceptorType: K, interceptor: Interceptor<M[K]>): void;
  removeInterceptor<K extends keyof M>(interceptorType: K, interceptor: Interceptor<M[K]>): void;
  getInterceptorsSet<K extends keyof M>(interceptorType: K): Set<Interceptor<M[K]>>;
  executeInterceptors<K extends keyof M>(interceptorType: K, payload: M[K]): Promise<M[K]>;
  removeAllInterceptorsForType<K extends keyof M>(interceptorType: K): void;
  removeAllInterceptors(): void;
}
