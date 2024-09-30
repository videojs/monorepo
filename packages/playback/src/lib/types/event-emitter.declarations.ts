export type EventListener<T> = (data: T) => void;

export interface IEventEmitter<M> {
  addEventListener<K extends keyof M>(event: K, eventListener: EventListener<M[K]>): void;
  removeEventListener<K extends keyof M>(event: K, eventListener: EventListener<M[K]>): void;
  emitEvent(event: { type: keyof M }): void;
  once<K extends keyof M>(event: K, eventListener: EventListener<M[K]>): void;
  removeAllEventListenersFor(event: keyof M): void;
  removeAllEventListeners(): void;
}
