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
          this.storage_[key as keyof A] = value as A[keyof A];
        }
      }
    });
  }
  public getSnapshot(): A {
    const result = {} as A;

    Object.entries(this.storage_).forEach((pair) => {
      const [key, value] = pair;

      if (value instanceof StoreNode) {
        result[key as keyof A] = value.getSnapshot();
      } else {
        result[key as keyof A] = value as A[keyof A];
      }
    });

    return result;
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
