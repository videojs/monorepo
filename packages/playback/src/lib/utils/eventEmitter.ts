export type Callback<T> = (data: T) => void;

export default class EventEmitter<M> {
  private events_ = new Map<keyof M, Set<Callback<unknown>>>();

  public on<K extends keyof M>(event: K, callback: Callback<M[K]>): void {
    if (!this.events_.has(event)) {
      this.events_.set(event, new Set());
    }
    const typedSet = this.events_.get(event) as Set<Callback<M[K]>>;
    typedSet.add(callback);
  }

  public off<K extends keyof M>(event: K, callback: Callback<M[K]>): void {
    const callbacks = this.events_.get(event) as Set<Callback<M[K]>>;
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.events_.delete(event);
      }
    }
  }

  public emit<K extends keyof M>(event: K, data: M[K]): void {
    const callbacks = this.events_.get(event) as Set<Callback<M[K]>>;
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  public once<K extends keyof M>(event: K, callback: Callback<M[K]>): void {
    const onceCallback = (data: M[K]): void => {
      this.off(event, onceCallback);
      callback(data);
    };
    this.on(event, onceCallback);
  }

  public offAllFor(event: keyof M): void {
    this.events_.delete(event);
  }

  public reset(): void {
    this.events_.clear();
  }
}
