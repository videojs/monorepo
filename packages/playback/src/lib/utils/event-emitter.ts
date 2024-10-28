import type { IEventEmitter, EventListener } from '../types/event-emitter.declarations';

export class EventEmitter<M> implements IEventEmitter<M> {
  private events_ = new Map<keyof M, Set<EventListener<unknown>>>();

  private readonly allType_: keyof M;

  public constructor(allType: keyof M) {
    this.allType_ = allType;
  }

  public addEventListener<K extends keyof M>(event: K, eventListener: EventListener<M[K]>): void {
    if (!this.events_.has(event)) {
      this.events_.set(event, new Set());
    }
    const typedSet = this.events_.get(event) as Set<EventListener<M[K]>>;

    typedSet.add(eventListener);
  }

  public removeEventListener<K extends keyof M>(event: K, eventListener: EventListener<M[K]>): void {
    const eventListeners = this.events_.get(event) as Set<EventListener<M[K]>>;

    if (eventListeners) {
      eventListeners.delete(eventListener);
      if (eventListeners.size === 0) {
        this.events_.delete(event);
      }
    }
  }

  public emitEvent(event: { type: keyof M }): void {
    const eventListeners = this.events_.get(event.type) ?? new Set();
    const all = this.events_.get(this.allType_) ?? new Set();

    eventListeners.forEach((eventListener) => eventListener(event));
    all.forEach((eventListener) => eventListener(event));
  }

  public once<K extends keyof M>(event: K, eventListener: EventListener<M[K]>): void {
    const onceEventListener = (data: M[K]): void => {
      this.removeEventListener(event, onceEventListener);
      eventListener(data);
    };

    this.addEventListener(event, onceEventListener);
  }

  public removeAllEventListenersFor(event: keyof M): void {
    this.events_.delete(event);
  }

  public removeAllEventListeners(): void {
    this.events_.clear();
  }
}
