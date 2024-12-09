import type { InterceptorType } from '../../consts/interceptor-type';
import type { InterceptorTypeToInterceptorPayloadMap } from '../mappers/interceptor-type-to-interceptor-map.declarations';
import type { PlayerEvent } from '../../events/base-player-event';

export interface IWorkerToMainThreadMessageChannel {
  sendRunInterceptorsMessage<K extends InterceptorType>(
    interceptorType: K,
    payload: InterceptorTypeToInterceptorPayloadMap[K]
  ): Promise<InterceptorTypeToInterceptorPayloadMap[K]>;

  sendEmitEventMessage(event: PlayerEvent): void;
}
