import { describe, expect, it } from 'vitest';
import { createStore, initialState, type AppState } from '../src/app/store';
import { jibReachedParam, parseUrlState, serializeUrlState } from '../src/app/urlState';
import { boat } from '../src/model/boat';
import { defaultControls, type Controls } from '../src/model/controls';
import {
  CAMERA_PRESETS,
  DEFAULT_CAMERA,
  DEFAULT_SETTINGS,
  defaultDetail,
} from '../src/model/settings';

/** The controls part of the default URL (M2: boom and wind; M3: jib; M4a: wheel). */
const DEFAULT_CONTROLS_QUERY = 'ms=30&js=30&vg=50&tl=100&mf=100&jf=100&rd=0&wd=60&ws=12';

describe('URL state (PHASE1_SPEC 9.2)', () => {
  it('empty query gives the defaults', () => {
    const state = parseUrlState('');
    expect(state.camera).toEqual(DEFAULT_CAMERA);
    expect(state.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('reads cam, step and debug', () => {
    const state = parseUrlState('?v=1&cam=top&step=1&debug=1');
    expect(state.camera.preset).toBe('top');
    expect(state.settings.step).toBe(1);
    expect(state.settings.debug).toBe(true);
  });

  it('unknown or out-of-range values fall back to defaults silently', () => {
    const state = parseUrlState('?cam=underwater&step=3&debug=yes');
    expect(state.camera.preset).toBe(DEFAULT_CAMERA.preset);
    expect(state.settings.step).toBe(DEFAULT_SETTINGS.step);
    expect(state.settings.debug).toBe(DEFAULT_SETTINGS.debug);
    expect(parseUrlState('?step=5.0').settings.step).toBe(DEFAULT_SETTINGS.step);
    expect(parseUrlState('?step=').settings.step).toBe(DEFAULT_SETTINGS.step);
  });

  it('M3b: reads detail=high|low; without it, the fallback (the screen-size default) is used', () => {
    expect(parseUrlState('?detail=low').settings.detail).toBe('low');
    expect(parseUrlState('?detail=high', 'low').settings.detail).toBe('high');
    expect(parseUrlState('', 'low').settings.detail).toBe('low');
    expect(parseUrlState('?detail=ultra', 'low').settings.detail).toBe('low');
    expect(parseUrlState('').settings.detail).toBe('high');
    const low = {
      ...initialState(),
      settings: { ...initialState().settings, detail: 'low' as const },
    };
    expect(parseUrlState(serializeUrlState(low), 'high').settings.detail).toBe('low');
  });

  it('M3b: the default detail is low on phone screens and high on bigger ones', () => {
    expect(defaultDetail(390, 844)).toBe('low');
    expect(defaultDetail(844, 390)).toBe('low');
    expect(defaultDetail(820, 1000)).toBe('high');
    expect(defaultDetail(1440, 900)).toBe('high');
  });

  it('ignores parameters it does not know yet', () => {
    const state = parseUrlState('?zz=5&cam=bow');
    expect(state.camera.preset).toBe('bow');
    expect(state.controls).toEqual(defaultControls());
  });

  it('reads the M3 jib controls: js, jf', () => {
    const state = parseUrlState('?js=35&jf=80');
    expect(state.controls.ctl_jib_sheet).toBe(35);
    expect(state.controls.ctl_jib_furl).toBe(80);
    expect(parseUrlState('?js=101&jf=-5').controls).toEqual(defaultControls());
  });

  it('reads the M2 controls: ms, vg, tl, mf, wd, ws', () => {
    const state = parseUrlState('?ms=35&vg=0&tl=20&mf=55&wd=-90&ws=20');
    expect(state.controls.ctl_mainsheet).toBe(35);
    expect(state.controls.ctl_vang).toBe(0);
    expect(state.controls.ctl_topping_lift).toBe(20);
    expect(state.controls.ctl_main_furl).toBe(55);
    expect(state.controls.ctl_wind_dir).toBe(-90);
    expect(state.controls.ctl_wind_speed).toBe(20);
  });

  it('control values out of range or not whole numbers fall back to the defaults', () => {
    const defaults = defaultControls();
    const state = parseUrlState('?ms=101&vg=-1&tl=abc&mf=50.5&wd=181&ws=31');
    expect(state.controls).toEqual(defaults);
    expect(parseUrlState('?wd=-180').controls.ctl_wind_dir).toBe(180);
  });

  it('a link opens with the rig already settled for its controls', () => {
    const state = parseUrlState('?wd=90&ms=100');
    expect(state.rig.solution.thetaDeg).toBeCloseTo(-boat.rig.boom.maxSwingDeg, 6);
    expect(state.rig.theta.value).toBeCloseTo(-boat.rig.boom.maxSwingDeg, 6);
  });

  it('reads sel when it is a registered id, otherwise ignores it', () => {
    expect(parseUrlState('?sel=part_mast').selection).toBe('part_mast');
    expect(parseUrlState('?sel=part_made_up').selection).toBeNull();
    expect(parseUrlState('').selection).toBeNull();
  });

  it('cam=free is kept as the preset (the free position itself is not stored)', () => {
    expect(parseUrlState('?cam=free').camera).toEqual({ preset: 'free' });
    expect(serializeUrlState(initialState({ camera: { preset: 'free' } }))).toBe(
      `?v=1&${DEFAULT_CONTROLS_QUERY}&cam=free&step=5&detail=high`,
    );
  });

  it('writes v=1 and readable parameters', () => {
    const c = DEFAULT_CONTROLS_QUERY;
    expect(serializeUrlState(initialState())).toBe(`?v=1&${c}&cam=side-port&step=5&detail=high`);
    const withDebug = initialState({ settings: { step: 1, debug: true } });
    expect(serializeUrlState(withDebug)).toBe(`?v=1&${c}&cam=side-port&step=1&detail=high&debug=1`);
    const withSelection = initialState({ selection: 'part_boom' });
    expect(serializeUrlState(withSelection)).toBe(
      `?v=1&${c}&cam=side-port&sel=part_boom&step=5&detail=high`,
    );
  });

  it('round-trips the controls', () => {
    const state = initialState({
      controls: {
        ctl_mainsheet: 45,
        ctl_vang: 5,
        ctl_topping_lift: 0,
        ctl_main_furl: 35,
        ctl_wind_dir: -135,
        ctl_wind_speed: 0,
      },
    });
    expect(parseUrlState(serializeUrlState(state))).toEqual(state);
  });

  it('round-trips every camera preset × step × debug × selection', () => {
    for (const preset of CAMERA_PRESETS) {
      for (const step of [1, 5] as const) {
        for (const debug of [false, true]) {
          for (const selection of [null, 'helm_port']) {
            const state = initialState({
              camera: { preset },
              settings: { step, debug },
              selection,
            });
            expect(parseUrlState(serializeUrlState(state))).toEqual(state);
          }
        }
      }
    }
  });

  it('reads the wheel (M4a): rd = rudder angle in degrees, + = to starboard', () => {
    expect(parseUrlState('?rd=-20').controls.ctl_rudder).toBe(-20);
    expect(parseUrlState('?rd=35').controls.ctl_rudder).toBe(35);
    expect(parseUrlState('?rd=36').controls.ctl_rudder).toBe(0);
    expect(parseUrlState('?rd=2.5').controls.ctl_rudder).toBe(0);
  });

  it('round-trips every control, the wheel included', () => {
    const controls: Controls = {
      ctl_mainsheet: 45,
      ctl_jib_sheet: 85,
      ctl_vang: 5,
      ctl_topping_lift: 0,
      ctl_main_furl: 35,
      ctl_jib_furl: 70,
      ctl_rudder: -15,
      ctl_wind_dir: -135,
      ctl_wind_speed: 0,
    };
    const state = initialState({ controls });
    const back = parseUrlState(serializeUrlState(state));
    expect(back.controls).toEqual(controls);
    expect(back).toEqual(state);
  });

  it('legend (lg) and Ropes-tab mode (mode) are written only when not the default', () => {
    expect(parseUrlState('?lg=0').settings.legend).toBe(false);
    expect(parseUrlState('?lg=1').settings.legend).toBe(true);
    expect(parseUrlState('?lg=no').settings.legend).toBe(DEFAULT_SETTINGS.legend);
    expect(parseUrlState('?mode=easy').settings.ropesMode).toBe('easy');
    // Realistic mode is not built yet (M4b): an unknown mode falls back to Easy.
    expect(parseUrlState('?mode=realistic').settings.ropesMode).toBe('easy');
    const hidden = initialState({ settings: { legend: false } });
    expect(serializeUrlState(hidden)).toBe(
      `?v=1&${DEFAULT_CONTROLS_QUERY}&cam=side-port&step=5&detail=high&lg=0`,
    );
    expect(parseUrlState(serializeUrlState(hidden))).toEqual(hidden);
  });
});

/** Runs the app's frame step for `seconds` at 60 fps. */
function settle(store: ReturnType<typeof createStore>, seconds: number): AppState {
  for (let t = 0; t < seconds; t += 1 / 60) store.dispatch({ type: 'step', dt: 1 / 60 });
  return store.getState();
}

describe('URL state: the jib sheet hauled against a partly furled jib (M3 → M4a, jr)', () => {
  /** Jib furled to 40 % with the sheet released, then the sheet hauled to 30 %. */
  function hauledAgainstFurl(): AppState {
    const store = createStore(initialState({ controls: { ctl_jib_sheet: 100 } }));
    store.dispatch({ type: 'setControls', values: { ctl_jib_furl: 40 } });
    settle(store, 6);
    store.dispatch({ type: 'setControls', values: { ctl_jib_sheet: 30 } });
    return settle(store, 4);
  }

  it('the state itself: the jib stays at 40 % and the sheet fights the furling line', () => {
    const state = hauledAgainstFurl();
    expect(state.rig.jibSolution.unfurled).toBeCloseTo(0.4, 9);
    expect(state.rig.jibSolution.sheet.state).toBe('fighting');
    expect(state.rig.jibSolution.furlBlocked).toBe(false);
  });

  it('without jr the same controls give a different jib (the furl is blocked instead)', () => {
    const fresh = parseUrlState('?js=30&jf=40');
    expect(fresh.rig.jibSolution.furlBlocked).toBe(true);
    expect(fresh.rig.jibSolution.unfurled).toBeGreaterThan(0.5);
  });

  it('the link carries jr=40 and opens exactly the same state', () => {
    const state = hauledAgainstFurl();
    const query = serializeUrlState(state);
    expect(query).toContain('&jf=40&rd=0');
    expect(query).toContain('&jr=40&');
    const opened = parseUrlState(query);
    expect(opened.controls).toEqual(state.controls);
    expect(opened.rig.jibSolution.unfurled).toBeCloseTo(state.rig.jibSolution.unfurled, 9);
    expect(opened.rig.jibSolution.sheet).toEqual(state.rig.jibSolution.sheet);
    expect(opened.rig.jibSolution.phiDeg).toBeCloseTo(state.rig.jibSolution.phiDeg, 6);
    expect(opened.rig.jibSolution.furlBlocked).toBe(false);
    // And it stays there: the opened link is already settled.
    const store = createStore(opened);
    expect(settle(store, 3).rig.jibSolution.unfurled).toBeCloseTo(0.4, 9);
    expect(serializeUrlState(store.getState())).toBe(query);
  });

  it('jr is only written when it changes something', () => {
    expect(jibReachedParam(initialState())).toBeNull();
    expect(jibReachedParam(parseUrlState('?js=30&jf=40'))).toBeNull();
    expect(jibReachedParam(parseUrlState('?js=100&jf=40'))).toBeNull();
    expect(serializeUrlState(parseUrlState('?js=0&jf=0'))).not.toContain('jr=');
  });

  it('a jr below "Jib out" or out of range is ignored', () => {
    const blocked = parseUrlState('?js=30&jf=40');
    expect(parseUrlState('?js=30&jf=40&jr=20').rig).toEqual(blocked.rig);
    expect(parseUrlState('?js=30&jf=40&jr=101').rig).toEqual(blocked.rig);
    expect(parseUrlState('?js=30&jf=40&jr=4x').rig).toEqual(blocked.rig);
  });
});
