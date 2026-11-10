import { describe, expect, it, vi } from 'vitest';
import { createStore, initialState, reduce, type AppState } from '../src/app/store';
import { DEFAULT_HELM_VIEW } from '../src/model/settings';
import { parseUrlState } from '../src/app/urlState';
import { anchoredState } from './harbourPilot';

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

  it('setRopesMode changes only its setting', () => {
    const store = createStore(initialState());
    store.dispatch({ type: 'setRopesMode', mode: 'easy' });
    expect(store.getState().settings.ropesMode).toBe('easy');
  });

  it('PR 152: the labels in 3D follow the ropes mode: Realistic hides them, Easy shows them', () => {
    const store = createStore(initialState());
    store.dispatch({ type: 'setRopesMode', mode: 'realistic' });
    expect(store.getState().settings.labels).toBe(false);
    store.dispatch({ type: 'setLabels', labels: true });
    store.dispatch({ type: 'setRopesMode', mode: 'realistic' });
    expect(store.getState().settings.labels).toBe(true);
    store.dispatch({ type: 'setRopesMode', mode: 'easy' });
    expect(store.getState().settings.labels).toBe(true);
  });

  it('M5: setLabels turns the labels in 3D off and on; Reset turns them on again', () => {
    const store = createStore(initialState());
    store.dispatch({ type: 'setLabels', labels: false });
    expect(store.getState().settings).toEqual({ ...initialState().settings, labels: false });
    store.dispatch({ type: 'reset' });
    expect(store.getState().settings.labels).toBe(true);
  });

  it('reset brings controls, camera, selection and settings back to the defaults (debug and detail stay)', () => {
    const defaults = initialState();
    const store = createStore(
      initialState({
        controls: { ctl_mainsheet: 90, ctl_rudder: -20, ctl_wind_dir: -120, ctl_jib_furl: 40 },
        camera: { preset: 'top' },
        settings: { step: 1, debug: true, detail: 'low' },
        selection: 'rope_vang',
        boat: { mode: 'held' },
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
    // Reset opens Sailing (M6); this test is about the rig, so the boat is held still again.
    store.dispatch({ type: 'setBoatMode', mode: 'held' });
    for (let i = 0; i < 600; i += 1) store.dispatch({ type: 'step', dt: 1 / 60 });
    const settled = store.getState().rig;
    const held = initialState({ boat: { mode: 'held' } }).rig;
    expect(settled.applied).toEqual(defaults.rig.applied);
    expect(settled.solution.thetaDeg).toBeCloseTo(held.solution.thetaDeg, 6);
    expect(settled.jibSolution.unfurled).toBe(1);
  });
});

describe('M64: the Helm camera (PHASE9_SPEC 10.2)', () => {
  it('8: setHelmView, the map, other presets, reset and load', () => {
    const store = createStore(initialState());
    store.dispatch({ type: 'setHelmView', look: 'panel' });
    expect(store.getState().camera).toMatchObject({
      preset: 'helm',
      helm: { wheel: 'port', look: 'panel' },
    });
    store.dispatch({ type: 'setHelmView', wheel: 'starboard' });
    expect(store.getState().camera.helm).toEqual({ wheel: 'starboard', look: 'panel' });

    // The map's Close goes back to the same view: the same object.
    store.dispatch({ type: 'setCameraPreset', preset: 'map' });
    const helm = store.getState().camera.helm;
    store.dispatch({ type: 'setCameraPreset', preset: 'helm' });
    expect(store.getState().camera.helm).toBe(helm);
    expect(helm.look).toBe('panel');

    // Another preset in between: Helm opens the last wheel, looking Ahead.
    store.dispatch({ type: 'setCameraPreset', preset: 'side-port' });
    expect(store.getState().camera.helm).toBe(helm);
    store.dispatch({ type: 'setCameraPreset', preset: 'helm' });
    expect(store.getState().camera.helm).toEqual({ wheel: 'starboard', look: 'ahead' });

    store.dispatch({ type: 'setHelmView', wheel: 'starboard' });
    const again = store.getState().camera.helm;
    store.dispatch({ type: 'setHelmView', wheel: 'starboard' });
    expect(store.getState().camera.helm).not.toBe(again);

    store.dispatch({ type: 'reset' });
    expect(store.getState().camera.helm).toEqual(DEFAULT_HELM_VIEW);
    expect(store.getState().camera.helm).not.toBe(DEFAULT_HELM_VIEW);

    store.dispatch({ type: 'load', state: parseUrlState('?cam=helm&hw=s') });
    expect(store.getState().camera.helm.wheel).toBe('starboard');
  });
});

describe('M73: the marina and the bay are solid from open water (PHASE10_SPEC 15.7 test 5)', () => {
  const start = (eastM: number, northM: number, headingDeg: number, speedMps: number): AppState => {
    const s = parseUrlState('?wd=0&ws=0&mf=0&jf=0&js=100&ap=off&sea=flat&eng=0');
    return { ...s, boat: { ...s.boat, eastM, northM, headingDeg, speedMps } };
  };
  const reportIds = (s0: AppState, seconds: number): string[] => {
    let s = s0;
    for (let i = 0; i < seconds * 20 && s.contact.reports.length === 0; i += 1) {
      s = reduce(s, { type: 'step', dt: 0.05 });
    }
    expect(s.harbour.place).toBe('open');
    return s.contact.reports.map((r) => r.obstacleId);
  };

  it('sailing north into the south mole bumps it', () => {
    expect(reportIds(start(0, 1405, 0, 2.0), 30)).toContain('breakwater-south');
  });
  it('sailing west into the bay shore or bottom bumps it', () => {
    const ids = reportIds(start(-1330, 300, 270, 2.0), 30);
    expect(ids.some((id) => id === 'bottom' || id === 'land')).toBe(true);
  });
  it('far from both: no report, and contact stays the same object', () => {
    let s = start(0, 0, 0, 1.0);
    const contact = s.contact;
    for (let i = 0; i < 30 * 20; i += 1) {
      s = reduce(s, { type: 'step', dt: 0.05 });
      expect(s.contact).toBe(contact);
    }
  });
});

describe('local winds in the store (M94, PHASE10_SPEC 24.4)', () => {
  const open = (query: string) => parseUrlState(query, initialState().settings.detail);

  it('choosing the summer day at 14:00 writes the mean into the controls', () => {
    const state = reduce(open('?clk=202606011400'), { type: 'setWindMode', mode: 'summer' });
    expect(Math.abs(state.controls.ctl_wind_speed - 14)).toBeLessThanOrEqual(0.01);
    expect(state.controls.ctl_wind_dir).toBe(-45);
  });

  it('the hand-set wind is refused while a clock wind is on', () => {
    const state = reduce(open('?clk=202606011400'), { type: 'setWindMode', mode: 'summer' });
    const next = reduce(state, { type: 'setControls', values: { ctl_wind_speed: 5 } });
    expect(next).toBe(state);
  });

  it('the mean falls through the evening and never rises', () => {
    let state = reduce(open('?clk=202606011959'), { type: 'setWindMode', mode: 'summer' });
    state = reduce(state, { type: 'setTimeScale', scale: 16 });
    let last = state.controls.ctl_wind_speed;
    for (let i = 0; i < 600; i += 1) {
      state = reduce(state, { type: 'step', dt: 0.05 });
      expect(state.controls.ctl_wind_speed).toBeLessThanOrEqual(last + 1e-9);
      last = state.controls.ctl_wind_speed;
    }
  });

  it('setting the clock to 23:00 jumps the wind to the burin', () => {
    const state = reduce(open('?clk=202606011400'), { type: 'setWindMode', mode: 'summer' });
    const night = reduce(state, { type: 'setClock', utcMs: open('?clk=202606012300').clock.utcMs });
    expect(Math.abs(night.controls.ctl_wind_dir - 45)).toBeLessThanOrEqual(0.5);
  });

  it('leaving a clock wind keeps the wind that was blowing, in whole steps, and frees the dial', () => {
    let state = reduce(open('?clk=202606011300'), { type: 'setWindMode', mode: 'summer' });
    state = reduce(state, { type: 'setWindMode', mode: 'steady' });
    expect(state.controls.ctl_wind_speed).toBe(12);
    expect(state.controls.ctl_wind_dir).toBe(-45);
    state = reduce(state, { type: 'setControls', values: { ctl_wind_speed: 5 } });
    expect(state.controls.ctl_wind_speed).toBe(5);
  });

  it('leaving a clock wind wraps a wind from nearly dead astern into the dial range', () => {
    const summer = reduce(open('?clk=202606011300'), { type: 'setWindMode', mode: 'summer' });
    const astern = { ...summer, controls: { ...summer.controls, ctl_wind_dir: -179.7 } };
    const state = reduce(astern, { type: 'setWindMode', mode: 'steady' });
    expect(state.controls.ctl_wind_dir).toBe(180);
  });
});

describe('time-lapse (M95)', () => {
  const anchoredLink =
    '?pl=bay&pe=-1660.0&pn=0.0&hdg=90&bs=0&an=60&ax=-1600.0,0.0&as=1&wd=90&ws=6&sea=sheltered';
  const open = () => parseUrlState(anchoredLink, initialState().settings.detail);

  it('is refused in open water while sailing', () => {
    const state = initialState();
    expect(reduce(state, { type: 'setTimeScale', scale: 240 })).toBe(state);
  });

  it('at anchor a frame is cut into slices: the same state as three slice steps', () => {
    const state = reduce(open(), { type: 'setTimeScale', scale: 240 });
    expect(state.settings.timeScale).toBe(240);
    const frame = reduce(state, { type: 'step', dt: 1 / 60 });
    expect(frame.rig.timeS - state.rig.timeS).toBeCloseTo(4, 9);
    let sliced = state;
    for (let i = 0; i < 3; i += 1) sliced = reduce(sliced, { type: 'step', dt: 1 / 60 / 3 });
    expect(frame).toEqual(sliced);
  });

  it('lifting the anchor off the bottom drops the speed to ×1', () => {
    let state = reduce(open(), { type: 'setTimeScale', scale: 240 });
    state = reduce(state, { type: 'windlass', motion: 'up' });
    let guard = 0;
    while (state.anchor.phase !== 'hanging' && guard < 20000) {
      expect(state.settings.timeScale).toBe(240);
      state = reduce(state, { type: 'step', dt: 1 / 60 });
      guard += 1;
    }
    expect(state.anchor.phase).toBe('hanging');
    expect(state.settings.timeScale).toBe(1);
  });

  it('switching the time bar off drops it to ×1', () => {
    const state = reduce(open(), { type: 'setTimeScale', scale: 240 });
    expect(reduce(state, { type: 'setTimeBar', timeBar: false }).settings.timeScale).toBe(1);
  });

  it('choosing Sailing while held still with a gusty wind and nothing holding her drops it to ×1', () => {
    let state = parseUrlState(
      '?pl=bay&pe=-1660.0&pn=0.0&hdg=90&bs=0&wd=90&ws=6',
      initialState().settings.detail,
    );
    state = reduce(state, { type: 'setBoatMode', mode: 'held' });
    state = reduce(state, { type: 'setWindMode', mode: 'gusty' });
    state = reduce(state, { type: 'setTimeScale', scale: 240 });
    expect(state.boat.mode).toBe('held');
    expect(state.settings.timeScale).toBe(240);
    state = reduce(state, { type: 'setBoatMode', mode: 'sailing' });
    expect(state.boat.mode).toBe('sailing');
    expect(state.settings.timeScale).toBe(1);
  });

  it('letting the last mooring line go drops it to ×1', () => {
    const berth = '?pl=marina&pe=2.8&pn=1490.4&hdg=180&ln=sp:2.55';
    let state = reduce(parseUrlState(berth), { type: 'setBoatMode', mode: 'sailing' });
    expect(state.lines.lines).toHaveLength(1);
    state = reduce(state, { type: 'setTimeScale', scale: 240 });
    expect(state.settings.timeScale).toBe(240);
    state = reduce(state, { type: 'line', code: 'sp', command: 'letGo' });
    expect(state.lines.lines).toHaveLength(0);
    state = reduce(state, { type: 'step', dt: 1 / 60 });
    expect(state.settings.timeScale).toBe(1);
  });

  it('slices give the same hour as ×1 and ×16 (an hour at anchor)', { timeout: 60000 }, () => {
    const start = reduce(anchoredState(), {
      type: 'setControls',
      values: { ctl_wind_dir: 90, ctl_wind_speed: 6 },
    });
    const hour = (scale: number, dt: number): AppState => {
      let s = scale === 1 ? start : reduce(start, { type: 'setTimeScale', scale });
      expect(s.settings.timeScale).toBe(scale);
      const frames = Math.round(3600 / (dt * scale));
      for (let i = 0; i < frames; i += 1) s = reduce(s, { type: 'step', dt });
      return s;
    };
    const base = hour(1, 0.05);
    for (const [scale, dt] of [
      [16, 0.1],
      [240, 1 / 60],
    ] as const) {
      const other = hour(scale, dt);
      expect(Math.abs(other.boat.eastM - base.boat.eastM)).toBeLessThan(0.05);
      expect(Math.abs(other.boat.northM - base.boat.northM)).toBeLessThan(0.05);
      expect(Math.abs(other.boat.headingDeg - base.boat.headingDeg)).toBeLessThan(0.1);
    }
  });
});
