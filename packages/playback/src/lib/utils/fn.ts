export const noop = (): void => {};

export const entity = <T>(val: T): T => val;

export const asyncEntity = async <T>(val: T): Promise<T> => val;

export const t = (): boolean => true;
