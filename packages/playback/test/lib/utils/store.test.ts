import { describe, expect, it } from 'vitest';
import { Store, StoreNode } from '../../../src/lib/utils/store';

describe('Store', () => {
  it('should initialize with a snapshot matching the initial state', () => {
    const initialState = { key: 'value' };
    const init = (): StoreNode<{ key: string }> => new StoreNode(initialState);
    const store = new Store(init);

    expect(store.getSnapshot()).toEqual(initialState);
  });

  it('should return the current state accurately when called', () => {
    const initialState = { key: { inner: 'innerValue' } };

    const innerStoreNode = new StoreNode(initialState.key);
    const init = (): StoreNode<{ key: { inner: string } }> => new StoreNode({ key: innerStoreNode });
    const store = new Store(init);

    const snapshot = store.getSnapshot();

    expect(snapshot).toEqual(initialState);
    expect(snapshot === initialState).toBe(false);
    expect(snapshot.key === initialState.key).toBe(false);
  });

  it("should update store's state correctly when called", () => {
    const initialState = { key: { inner: 'innerValue', inner2: 'inner2Value' } };

    const innerStoreNode = new StoreNode(initialState.key);
    const init = (): StoreNode<{ key: { inner: string; inner2: string } }> => new StoreNode({ key: innerStoreNode });
    const store = new Store(init);

    store.update({ key: { inner2: 'inner2Value-updated' } });

    const snapshot = store.getSnapshot();
    expect(snapshot).toEqual({ key: { inner: 'innerValue', inner2: 'inner2Value-updated' } });
  });

  it('should return expected results when reading based on current state', () => {
    const initialState = { key: { inner: 'innerValue', inner2: 'inner2Value' } };

    const innerStoreNode = new StoreNode(initialState.key);
    const init = (): StoreNode<{ key: { inner: string; inner2: string } }> => new StoreNode({ key: innerStoreNode });
    const store = new Store(init);

    expect(store.read((state) => state.key.inner)).toBe('innerValue');
  });

  it('read should not affect internal store data', () => {
    const initialState = { key: { inner: 'innerValue', inner2: 'inner2Value' } };

    const innerStoreNode = new StoreNode(initialState.key);
    const init = (): StoreNode<{ key: { inner: string; inner2: string } }> => new StoreNode({ key: innerStoreNode });
    const store = new Store(init);

    expect(
      store.read((state) => {
        state.key.inner2 = 'inner2Value-updated';

        return state.key.inner;
      })
    ).toBe('innerValue');

    expect(store.getSnapshot()).toEqual(initialState);
  });

  // Reset method reverts store to initial state
  it('should reset store to initial state when reset is called', () => {
    const initialState = { key: { inner: 'innerValue', inner2: 'inner2Value' } };

    const innerStoreNode = new StoreNode(initialState.key);
    const init = (): StoreNode<{ key: { inner: string; inner2: string } }> => new StoreNode({ key: innerStoreNode });
    const store = new Store(init);

    store.update({ key: { inner: 'innerValue', inner2: 'inner2Value-updated' } });
    store.reset();

    expect(store.getSnapshot()).toEqual(initialState);
  });
});
