import type { DeepPartial } from '../types/utility.declarations';
import type { IStore } from '../types/store.declarations';

type StorageMix<A> = {
  [P in keyof A]: A[P] | StoreNode<A[P]>;
};

export class StoreNode<A> {
  protected storage_: StorageMix<A>;

  public constructor(storage: StorageMix<A>) {
    this.storage_ = storage;
  }

  public update(chunk: DeepPartial<A>): void {
    Object.entries(chunk as Record<string, unknown>).forEach((pair) => {
      const [key, value] = pair;

      if (value !== undefined) {
        if (this.storage_[key as keyof A] instanceof StoreNode) {
          (this.storage_[key as keyof A] as StoreNode<A>).update(value as DeepPartial<A>);
        } else {
          this.storage_[key as keyof A] = this.cloneValue_(value);
        }
      }
    });
  }
  public getSnapshot(): A {
    const result = {} as A;

    Object.entries(this.storage_).forEach((pair) => {
      const [key, value] = pair;
      result[key as keyof A] = this.cloneValue_(value);
    });

    return result;
  }

  private cloneValue_<T>(val: unknown): T {
    // we expect every object in the store to be wrapped with StoreNode
    if (val instanceof StoreNode) {
      return val.getSnapshot() as T;
    }

    // we do only shallow copy of a set, update if you need deep copy
    if (val instanceof Set) {
      return new Set(val) as T;
    }

    // we do only shallow copy of a map, update if you need deep copy
    if (val instanceof Map) {
      return new Map(val) as T;
    }

    // we do deep copy of the array, since we might expect nested objects
    if (Array.isArray(val)) {
      return val.map((v) => this.cloneValue_(v)) as T;
    }

    return val as T;
  }
}

export class Store<T> implements IStore<T> {
  private readonly init_: () => StoreNode<T>;

  protected currentSnapshot_: T;
  protected storage_: StoreNode<T>;

  public constructor(init: () => StoreNode<T>) {
    this.init_ = init;
    this.storage_ = this.init_();
    this.currentSnapshot_ = this.storage_.getSnapshot();
  }

  public getSnapshot(): T {
    return this.storage_.getSnapshot();
  }

  public update(chunk: DeepPartial<T>): void {
    this.storage_.update(chunk);
    this.currentSnapshot_ = this.storage_.getSnapshot();
  }

  public read<E>(reader: (config: T) => E): E {
    return reader(this.currentSnapshot_);
  }

  public reset(): void {
    this.storage_ = this.init_();
    this.currentSnapshot_ = this.storage_.getSnapshot();
  }
}
