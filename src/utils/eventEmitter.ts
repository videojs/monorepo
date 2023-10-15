type Callback<T> = (data: T) => void;

/**
 * Usage:
 *
 * // Sample types for the events.
 * type TypeA1 = { id: number; name: string };
 * type TypeA2 = { timestamp: Date; action: string };
 *
 * type TypeB1 = { orderId: string; amount: number };
 * type TypeB2 = { status: string; message: string };
 *
 * // Define an EventMap for ClassA
 * interface ClassAEventMap {
 *   eventA1: TypeA1;
 *   eventA2: TypeA2;
 * }
 *
 * // Define an EventMap for ClassB
 * interface ClassBEventMap {
 *   eventB1: TypeB1;
 *   eventB2: TypeB2;
 * }
 *
 * const emitterA = new EventEmitter<ClassAEventMap>();
 * const emitterB = new EventEmitter<ClassBEventMap>();
 */

export default class EventEmitter<M> {
  private events: Map<keyof M, Set<Callback<unknown>>> = new Map();

  on<K extends keyof M>(event: K, callback: Callback<M[K]>): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    const typedSet = this.events.get(event) as Set<Callback<M[K]>>;
    typedSet.add(callback);
  }

  off<K extends keyof M>(event: K, callback: Callback<M[K]>): void {
    const callbacks = this.events.get(event) as Set<Callback<M[K]>>;
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.events.delete(event);
      }
    }
  }

  emit<K extends keyof M>(event: K, data: M[K]): void {
    const callbacks = this.events.get(event) as Set<Callback<M[K]>>;
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  once<K extends keyof M>(event: K, callback: Callback<M[K]>): void {
    const onceCallback = (data: M[K]) => {
      this.off(event, onceCallback);
      callback(data);
    };
    this.on(event, onceCallback);
  }

  offAllFor(event: keyof M): void {
    this.events.delete(event);
  }

  reset(): void {
    this.events.clear();
  }
}
