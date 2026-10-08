import { describe, expect, it, vi } from 'vitest';
import { createStore, initialState } from '../src/app/store';

describe('store', () => {
  it('applies actions and notifies listeners with the previous state', () => {
    const store = createStore(initialState());
    const listener = vi.fn();
    store.subscribe(listener);
    const before = store.getState();
    store.dispatch({ type: 'setStep', step: 1 });
    expect(store.getState().settings.step).toBe(1);
    expect(listener).toHaveBeenCalledWith(store.getState(), before);
  });

  it('does not mutate the previous state', () => {
    const store = createStore(initialState());
    const before = store.getState();
    store.dispatch({ type: 'setDebug', debug: true });
    store.dispatch({ type: 'setCameraPreset', preset: 'top' });
    expect(before.settings.debug).toBe(false);
    expect(before.camera.preset).toBe('side-port');
    expect(store.getState().camera.preset).toBe('top');
  });

  it('select sets and clears the selected part', () => {
    const store = createStore(initialState());
    expect(store.getState().selection).toBeNull();
    store.dispatch({ type: 'select', partId: 'part_mast' });
    expect(store.getState().selection).toBe('part_mast');
    store.dispatch({ type: 'select', partId: null });
    expect(store.getState().selection).toBeNull();
  });

  it('unsubscribe stops notifications', () => {
    const store = createStore(initialState());
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.dispatch({ type: 'setDebug', debug: true });
    expect(listener).not.toHaveBeenCalled();
  });
});
