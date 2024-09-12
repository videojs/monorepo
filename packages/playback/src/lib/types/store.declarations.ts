import type { DeepPartial } from './utility.declarations';

export interface IStore<T> {
  getSnapshot(): T;
  update(chunk: DeepPartial<T>): void;
  read<E>(reader: (config: T) => E): E;
  reset(): void;
}
