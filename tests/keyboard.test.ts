import { describe, expect, it } from 'vitest';
import { reduce, type Action, type AppState } from '../src/app/store';
import { exerciseStartLink, parseUrlState } from '../src/app/urlState';
import { keyAction } from '../src/ui/keyboard';

// A link without `ap` starts with the autopilot holding the heading, so `ap=off` is explicit.
const s0 = parseUrlState('?ms=30&js=30&rd=0&ap=off&sea=flat');
const press = (code: string, state: AppState = s0, shift = false, key = '') =>
  keyAction(code, key, shift, state);

describe('keyAction (M101: keys on a computer)', () => {
  it('starts from the state the spec describes', () => {
    expect(s0.autopilot.mode).toBe('off');
    expect(s0.settings.ropesMode).toBe('easy');
    expect(s0.settings.step).toBe(5);
  });

  it('the arrows turn the wheel by one step with the autopilot off', () => {
    expect(press('ArrowLeft')).toEqual({ type: 'setControls', values: { ctl_rudder: -5 } });
    expect(press('ArrowRight')).toEqual({ type: 'setControls', values: { ctl_rudder: 5 } });
  });

  it('the arrows move the autopilot course with it on; Shift makes the large step', () => {
    const on = reduce(s0, { type: 'autopilot', command: 'heading' });
    expect(press('ArrowLeft', on)).toEqual({ type: 'autopilot', command: { turnDeg: -1 } });
    expect(press('ArrowRight', on, true)).toEqual({ type: 'autopilot', command: { turnDeg: 10 } });
  });

  it('W / S work the mainsheet, R / F the jib sheet (W and R trim, S and F ease)', () => {
    expect(press('KeyW')).toEqual({ type: 'setControls', values: { ctl_mainsheet: 25 } });
    expect(press('KeyS')).toEqual({ type: 'setControls', values: { ctl_mainsheet: 35 } });
    expect(press('KeyR')).toEqual({ type: 'setControls', values: { ctl_jib_sheet: 25 } });
    expect(press('KeyF')).toEqual({ type: 'setControls', values: { ctl_jib_sheet: 35 } });
  });

  it('does nothing at the end of a sheet’s range', () => {
    const trimmed = reduce(s0, { type: 'setControls', values: { ctl_mainsheet: 0 } });
    expect(press('KeyW', trimmed)).toBeNull();
    const eased = reduce(s0, { type: 'setControls', values: { ctl_mainsheet: 100 } });
    expect(press('KeyS', eased)).toBeNull();
  });

  it('uses the step size of the settings', () => {
    const fine = reduce(s0, { type: 'setStep', step: 1 });
    expect(press('KeyW', fine)).toEqual({ type: 'setControls', values: { ctl_mainsheet: 29 } });
  });

  it('the sheet keys do nothing in Realistic ropes; the arrows still steer', () => {
    const realistic = reduce(s0, { type: 'setRopesMode', mode: 'realistic' });
    for (const code of ['KeyW', 'KeyS', 'KeyR', 'KeyF']) expect(press(code, realistic)).toBeNull();
    expect(press('ArrowLeft', realistic)).not.toBeNull();
  });

  it('P turns the autopilot on (heading) and off', () => {
    expect(press('KeyP')).toEqual({ type: 'autopilot', command: 'heading' });
    const on = reduce(s0, { type: 'autopilot', command: 'heading' });
    expect(press('KeyP', on)).toEqual({ type: 'autopilot', command: 'off' });
  });

  it('H and ? open the key list; the thruster keys and others are not ours', () => {
    expect(press('KeyH')).toBe('help');
    expect(keyAction('Slash', '?', true, s0)).toBe('help');
    for (const code of ['KeyA', 'KeyD', 'KeyJ', 'KeyL', 'KeyQ']) expect(press(code)).toBeNull();
  });

  it('in an exercise the arrows belong to the step bar; the letter keys still act', () => {
    const run = parseUrlState(exerciseStartLink('points-of-sail', s0, 'easy'));
    expect(run.exercise).not.toBeNull();
    expect(press('ArrowLeft', run)).toBeNull();
    expect(press('ArrowRight', run)).toBeNull();
    expect(press('KeyH', run)).toBe('help');
  });

  it('while the app plays an exercise, only the help key acts', () => {
    const run = parseUrlState(exerciseStartLink('points-of-sail', s0, 'easy'));
    let watched = reduce(run, { type: 'exercise', command: { demo: 'watch' } } as Action);
    expect(watched.exercise?.demo).toBe('watch');
    for (const code of ['ArrowLeft', 'KeyW', 'KeyP']) expect(press(code, watched)).toBeNull();
    expect(press('KeyH', watched)).toBe('help');
    watched = reduce(watched, { type: 'exercise', command: 'start' } as Action);
    for (const code of ['ArrowLeft', 'KeyW', 'KeyP']) expect(press(code, watched)).toBeNull();
    expect(press('KeyH', watched)).toBe('help');
  });

  it('every action it returns changes the state', () => {
    const on = reduce(s0, { type: 'autopilot', command: 'heading' });
    const cases: [string, AppState, boolean][] = [
      ['ArrowLeft', s0, false],
      ['ArrowRight', s0, false],
      ['ArrowLeft', on, false],
      ['ArrowRight', on, true],
      ['KeyW', s0, false],
      ['KeyS', s0, false],
      ['KeyR', s0, false],
      ['KeyF', s0, false],
      ['KeyP', s0, false],
      ['KeyP', on, false],
    ];
    for (const [code, state, shift] of cases) {
      const result = press(code, state, shift);
      expect(result, code).not.toBeNull();
      expect(result, code).not.toBe('help');
      expect(reduce(state, result as Action), code).not.toBe(state);
    }
  });
});
