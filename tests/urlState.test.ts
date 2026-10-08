import { describe, expect, it } from 'vitest';
import { initialState } from '../src/app/store';
import { parseUrlState, serializeUrlState } from '../src/app/urlState';
import { CAMERA_PRESETS, DEFAULT_CAMERA, DEFAULT_SETTINGS } from '../src/model/settings';

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
    expect(parseUrlState('?ms=35&wd=60&cam=bow').camera.preset).toBe('bow');
  });

  it('writes v=1 and readable parameters', () => {
    expect(serializeUrlState(initialState())).toBe('?v=1&cam=side-port&step=5');
    const withDebug = initialState({ settings: { step: 1, debug: true } });
    expect(serializeUrlState(withDebug)).toBe('?v=1&cam=side-port&step=1&debug=1');
  });

  it('round-trips every camera preset × step × debug', () => {
    for (const preset of CAMERA_PRESETS) {
      for (const step of [1, 5] as const) {
        for (const debug of [false, true]) {
          const state = initialState({ camera: { preset }, settings: { step, debug } });
          expect(parseUrlState(serializeUrlState(state))).toEqual(state);
        }
      }
    }
  });
});
