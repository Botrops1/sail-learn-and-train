import { describe, expect, it } from 'vitest';
import { initialState } from '../src/app/store';
import { parseUrlState, serializeUrlState } from '../src/app/urlState';
import { boat } from '../src/model/boat';
import { defaultControls } from '../src/model/controls';
import { CAMERA_PRESETS, DEFAULT_CAMERA, DEFAULT_SETTINGS } from '../src/model/settings';

/** The controls part of the default URL (M2: boom and wind controls). */
const DEFAULT_CONTROLS_QUERY = 'ms=30&vg=50&tl=100&mf=100&wd=60&ws=12';

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

  it('ignores parameters it does not know yet', () => {
    const state = parseUrlState('?js=35&jf=10&rd=5&cam=bow');
    expect(state.camera.preset).toBe('bow');
    expect(state.controls).toEqual(defaultControls());
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
      `?v=1&${DEFAULT_CONTROLS_QUERY}&cam=free&step=5`,
    );
  });

  it('writes v=1 and readable parameters', () => {
    const c = DEFAULT_CONTROLS_QUERY;
    expect(serializeUrlState(initialState())).toBe(`?v=1&${c}&cam=side-port&step=5`);
    const withDebug = initialState({ settings: { step: 1, debug: true } });
    expect(serializeUrlState(withDebug)).toBe(`?v=1&${c}&cam=side-port&step=1&debug=1`);
    const withSelection = initialState({ selection: 'part_boom' });
    expect(serializeUrlState(withSelection)).toBe(`?v=1&${c}&cam=side-port&sel=part_boom&step=5`);
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
});
