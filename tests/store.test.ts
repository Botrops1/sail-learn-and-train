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

  it('setLegend and setRopesMode change only their setting', () => {
    const store = createStore(initialState());
    store.dispatch({ type: 'setLegend', legend: false });
    expect(store.getState().settings.legend).toBe(false);
    store.dispatch({ type: 'setRopesMode', mode: 'easy' });
    expect(store.getState().settings.ropesMode).toBe('easy');
  });

  it('M5: setLabels turns the labels in 3D on and off; Reset turns them off', () => {
    const store = createStore(initialState());
    store.dispatch({ type: 'setLabels', labels: true });
    expect(store.getState().settings).toEqual({ ...initialState().settings, labels: true });
    store.dispatch({ type: 'reset' });
    expect(store.getState().settings.labels).toBe(false);
  });

  it('reset brings controls, camera, selection and settings back to the defaults (debug and detail stay)', () => {
    const defaults = initialState();
    const store = createStore(
      initialState({
        controls: { ctl_mainsheet: 90, ctl_rudder: -20, ctl_wind_dir: -120, ctl_jib_furl: 40 },
        camera: { preset: 'top' },
        settings: { step: 1, debug: true, legend: false, detail: 'low' },
        selection: 'rope_vang',
      }),
    );
    const rigBefore = store.getState().rig;
    store.dispatch({ type: 'reset' });
    const state = store.getState();
    expect(state.controls).toEqual(defaults.controls);
    expect(state.camera).toEqual(defaults.camera);
    expect(state.selection).toBeNull();
    // Debug overlay and render detail suit the device: Reset keeps them (M3b's Detail setting).
    expect(state.settings).toEqual({ ...defaults.settings, debug: true, detail: 'low' });
    // The rig is not snapped: it moves back from where it was.
    expect(state.rig).toBe(rigBefore);
    for (let i = 0; i < 600; i += 1) store.dispatch({ type: 'step', dt: 1 / 60 });
    const settled = store.getState().rig;
    expect(settled.applied).toEqual(defaults.rig.applied);
    expect(settled.solution.thetaDeg).toBeCloseTo(defaults.rig.solution.thetaDeg, 6);
    expect(settled.jibSolution.unfurled).toBe(1);
  });
});
