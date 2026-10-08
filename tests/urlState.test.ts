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

  it('reads sel when it is a registered id, otherwise ignores it', () => {
    expect(parseUrlState('?sel=part_mast').selection).toBe('part_mast');
    expect(parseUrlState('?sel=part_made_up').selection).toBeNull();
    expect(parseUrlState('').selection).toBeNull();
  });

  it('cam=free is kept as the preset (the free position itself is not stored)', () => {
    expect(parseUrlState('?cam=free').camera).toEqual({ preset: 'free' });
    expect(serializeUrlState(initialState({ camera: { preset: 'free' } }))).toBe(
      '?v=1&cam=free&step=5',
    );
  });

  it('writes v=1 and readable parameters', () => {
    expect(serializeUrlState(initialState())).toBe('?v=1&cam=side-port&step=5');
    const withDebug = initialState({ settings: { step: 1, debug: true } });
    expect(serializeUrlState(withDebug)).toBe('?v=1&cam=side-port&step=1&debug=1');
    const withSelection = initialState({ selection: 'part_boom' });
    expect(serializeUrlState(withSelection)).toBe('?v=1&cam=side-port&sel=part_boom&step=5');
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
