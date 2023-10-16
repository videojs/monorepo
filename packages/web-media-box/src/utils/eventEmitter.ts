type Callback<T> = (data: T) => void;

export default class EventEmitter<M> {
  private events: Map<keyof M, Set<Callback<unknown>>> = new Map();

  public on<K extends keyof M>(event: K, callback: Callback<M[K]>): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    const typedSet = this.events.get(event) as Set<Callback<M[K]>>;
    typedSet.add(callback);
  }

  public off<K extends keyof M>(event: K, callback: Callback<M[K]>): void {
    const callbacks = this.events.get(event) as Set<Callback<M[K]>>;
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.events.delete(event);
      }
    }
  }

  public emit<K extends keyof M>(event: K, data: M[K]): void {
    const callbacks = this.events.get(event) as Set<Callback<M[K]>>;
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  public once<K extends keyof M>(event: K, callback: Callback<M[K]>): void {
    const onceCallback = (data: M[K]) => {
      this.off(event, onceCallback);
      callback(data);
    };
    this.on(event, onceCallback);
  }

  public offAllFor(event: keyof M): void {
    this.events.delete(event);
  }

  public reset(): void {
    this.events.clear();
  }
}
