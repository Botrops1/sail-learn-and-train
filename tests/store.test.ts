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

  it('M3b: setDetail switches the render detail and nothing else', () => {
    const store = createStore(initialState());
    const before = store.getState();
    store.dispatch({ type: 'setDetail', detail: 'low' });
    expect(store.getState().settings.detail).toBe('low');
    expect(store.getState().controls).toBe(before.controls);
    expect(before.settings.detail).toBe('high');
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

  it('setControls clamps values; an unchanged value keeps the same state object', () => {
    const store = createStore(initialState());
    store.dispatch({ type: 'setControls', values: { ctl_mainsheet: 140, ctl_wind_dir: -180 } });
    expect(store.getState().controls.ctl_mainsheet).toBe(100);
    expect(store.getState().controls.ctl_wind_dir).toBe(180);
    const before = store.getState();
    store.dispatch({ type: 'setControls', values: { ctl_mainsheet: 100 } });
    expect(store.getState()).toBe(before);
  });

  it('step moves the rig towards the new controls; a long pause is cut to 0.1 s', () => {
    const store = createStore(initialState({ controls: { ctl_wind_dir: 90, ctl_mainsheet: 0 } }));
    store.dispatch({ type: 'setControls', values: { ctl_mainsheet: 100 } });
    store.dispatch({ type: 'step', dt: 5 });
    const applied = store.getState().rig.applied.mainsheet;
    expect(applied).toBeGreaterThan(0);
    expect(applied).toBeLessThan(50);
    expect(store.getState().rig.timeS).toBeCloseTo(0.1, 9);
  });
});
