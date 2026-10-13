import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import {
  fastestTimeScale,
  isTimeScale,
  pauseAvailable,
  slowestTimeScale,
  stepTimeScale,
  timeScaleText,
  timeSpeedAvailable,
} from '../src/model/timeScale';
import { initialState, reduce } from '../src/app/store';
import { parseUrlState, serializeUrlState } from '../src/app/urlState';
import { DEFAULT_SETTINGS } from '../src/model/settings';
import { act, run } from './motionHelpers';

const sailing = () =>
  initialState({ controls: { ctl_wind_dir: 60, ctl_wind_speed: 12, ctl_mainsheet: 20 } });

describe('time bar: the scales (issue #25)', () => {
  it('the list is ¼, ½, 1, 2, 4, 8, 16', () => {
    expect(boat.windModes.timeScales).toEqual([0.25, 0.5, 1, 2, 4, 8, 16]);
    expect(isTimeScale(0.25)).toBe(true);
    expect(isTimeScale(3)).toBe(false);
    expect(isTimeScale(0)).toBe(false);
  });

  it('› from ×1 gives ×2, « gives ×¼, » gives ×16, and › at ×16 stays ×16', () => {
    expect(stepTimeScale(1, 1)).toBe(2);
    expect(stepTimeScale(1, -1)).toBe(0.5);
    expect(slowestTimeScale()).toBe(0.25);
    expect(fastestTimeScale()).toBe(16);
    expect(stepTimeScale(16, 1)).toBe(16);
    expect(stepTimeScale(0.25, -1)).toBe(0.25);
    expect(stepTimeScale(4, 1)).toBe(8);
    expect(stepTimeScale(4, -1)).toBe(2);
  });

  it('the status reads ×¼, ×½, ×1 … ×16', () => {
    expect(boat.windModes.timeScales.map((scale) => `×${timeScaleText(scale)}`)).toEqual([
      '×¼',
      '×½',
      '×1',
      '×2',
      '×4',
      '×8',
      '×16',
    ]);
  });

  it('the store: steps, jumps and the tap on the status', () => {
    let state = sailing();
    state = act(state, { type: 'setTimeScale', scale: stepTimeScale(state.settings.timeScale, 1) });
    expect(state.settings.timeScale).toBe(2);
    state = act(state, { type: 'setTimeScale', scale: slowestTimeScale() });
    expect(state.settings.timeScale).toBe(0.25);
    state = act(state, { type: 'setTimeScale', scale: 1 });
    expect(state.settings.timeScale).toBe(1);
    state = act(state, { type: 'setTimeScale', scale: fastestTimeScale() });
    expect(state.settings.timeScale).toBe(16);
    state = act(state, { type: 'setTimeScale', scale: 5 });
    expect(state.settings.timeScale).toBe(16);
  });
});

describe('time bar: time runs at the chosen scale', () => {
  it('×16: 60 s of frames at 60 fps advance the clock by 960 ± 1 s', () => {
    const state = act(sailing(), { type: 'setTimeScale', scale: 16 });
    expect(Math.abs(run(state, 60, 60).rig.timeS - 960)).toBeLessThan(1);
  });

  it('×¼: 60 s of frames advance the clock by 15 ± 0.1 s', () => {
    const state = act(sailing(), { type: 'setTimeScale', scale: 0.25 });
    expect(Math.abs(run(state, 60, 60).rig.timeS - 15)).toBeLessThan(0.1);
  });

  it('×½ and ×2 and ×8 scale the same way, at 30 and 60 fps', () => {
    for (const [scale, expected] of [
      [0.5, 30],
      [2, 120],
      [8, 480],
    ] as const) {
      for (const fps of [30, 60]) {
        const state = act(sailing(), { type: 'setTimeScale', scale });
        expect(Math.abs(run(state, 60, fps).rig.timeS - expected)).toBeLessThan(1);
      }
    }
  });

  it('slow motion keeps the boat sane (finite, sailing on)', () => {
    const state = run(act(sailing(), { type: 'setTimeScale', scale: 0.25 }), 30, 60);
    expect(Number.isFinite(state.boat.speedMps)).toBe(true);
    expect(state.boat.speedMps).toBeGreaterThan(2);
  });

  it('Pause still freezes time at any scale (Phase 1 behaviour)', () => {
    let state = act(
      sailing(),
      { type: 'setTimeScale', scale: 16 },
      { type: 'setPaused', paused: true },
    );
    state = run(state, 5, 30);
    expect(state.rig.timeS).toBe(0);
    state = act(state, { type: 'setPaused', paused: false });
    expect(run(state, 1, 30).rig.timeS).toBeGreaterThan(10);
  });
});

describe('time bar: where the speed part shows', () => {
  it('Sailing: always; Held still: only with a wind that changes; off: never', () => {
    expect(timeSpeedAvailable('sailing', 'steady', true)).toBe(true);
    expect(timeSpeedAvailable('held', 'steady', true)).toBe(false);
    expect(timeSpeedAvailable('held', 'gusty', true)).toBe(true);
    expect(timeSpeedAvailable('sailing', 'gusty', false)).toBe(false);
    expect(timeSpeedAvailable('held', 'building', false)).toBe(false);
  });

  it('Held still with a steady wind: the time scale is 1 and cannot be set', () => {
    const held = initialState({ boat: { mode: 'held' } });
    expect(held.settings.timeScale).toBe(1);
    expect(act(held, { type: 'setTimeScale', scale: 4 }).settings.timeScale).toBe(1);
    // A link with tx and held still gives ×1 too.
    expect(parseUrlState('?wd=60&held=1&tx=4').settings.timeScale).toBe(1);
  });

  it('Held still with a changing wind: the scale can be set', () => {
    const held = initialState({ boat: { mode: 'held' }, windMode: { mode: 'gusty' } });
    expect(act(held, { type: 'setTimeScale', scale: 4 }).settings.timeScale).toBe(4);
    expect(parseUrlState('?wd=60&held=1&wm=gusty&tx=4').settings.timeScale).toBe(4);
  });

  it('switching to Held still with a steady wind, or the wind to Steady, puts the scale back to ×1', () => {
    let state = act(sailing(), { type: 'setTimeScale', scale: 8 });
    state = act(state, { type: 'setBoatMode', mode: 'held' });
    expect(state.settings.timeScale).toBe(1);
    state = act(
      sailing(),
      { type: 'setWindMode', mode: 'gusty' },
      { type: 'setBoatMode', mode: 'held' },
    );
    state = act(state, { type: 'setTimeScale', scale: 8 });
    expect(state.settings.timeScale).toBe(8);
    state = act(state, { type: 'setWindMode', mode: 'steady' });
    expect(state.settings.timeScale).toBe(1);
    // Back to Sailing: it stays at ×1 (the user chooses again).
    expect(act(state, { type: 'setBoatMode', mode: 'sailing' }).settings.timeScale).toBe(1);
  });

  it('the View tab switch: off puts the scale back to ×1 and refuses the speed buttons', () => {
    let state = act(sailing(), { type: 'setTimeScale', scale: 4 });
    state = act(state, { type: 'setTimeBar', timeBar: false });
    expect(state.settings).toMatchObject({ timeBar: false, timeScale: 1 });
    expect(act(state, { type: 'setTimeScale', scale: 4 }).settings.timeScale).toBe(1);
    state = act(state, { type: 'setTimeBar', timeBar: true });
    expect(act(state, { type: 'setTimeScale', scale: 4 }).settings.timeScale).toBe(4);
  });

  it('Reset gives the bar on at ×1', () => {
    let state = act(
      sailing(),
      { type: 'setTimeScale', scale: 4 },
      { type: 'setTimeBar', timeBar: false },
    );
    state = reduce(state, { type: 'reset' });
    expect(state.settings).toMatchObject({ timeBar: true, timeScale: 1 });
  });

  it('a gust-free steady wind is the same at every scale of the same sim time (determinism)', () => {
    const fast = run(act(sailing(), { type: 'setTimeScale', scale: 4 }), 15, 60);
    const normal = run(sailing(), 60, 60);
    expect(fast.rig.timeS).toBeCloseTo(normal.rig.timeS, 0);
    expect(Math.abs(fast.boat.speedMps - normal.boat.speedMps)).toBeLessThan(0.05);
  });
});

describe('time bar: the link', () => {
  it('round-trips tx (decimals too) and tb', () => {
    for (const scale of [0.25, 0.5, 2, 4, 8, 16]) {
      const state = parseUrlState(`?wd=60&ws=12&tx=${scale}`);
      expect(state.settings.timeScale).toBe(scale);
      expect(parseUrlState(serializeUrlState(state)).settings.timeScale).toBe(scale);
    }
    const off = parseUrlState('?wd=60&tb=0');
    expect(off.settings.timeBar).toBe(false);
    expect(serializeUrlState(off)).toContain('tb=0');
    expect(parseUrlState(serializeUrlState(off)).settings.timeBar).toBe(false);
  });

  it('writes nothing for the defaults', () => {
    const text = serializeUrlState(parseUrlState('?wd=60'));
    expect(text).not.toMatch(/tx=|tb=/);
    expect(DEFAULT_SETTINGS).toMatchObject({ timeScale: 1, timeBar: true });
  });

  it('tb=0 and tx together: the bar is off, so the scale is 1', () => {
    const state = parseUrlState('?wd=60&tb=0&tx=4');
    expect(state.settings).toMatchObject({ timeBar: false, timeScale: 1 });
  });

  it('bad values fall back', () => {
    for (const bad of ['3', '0', '-1', 'x', '1e1', '0.3', '17']) {
      expect(parseUrlState(`?wd=60&tx=${bad}`).settings.timeScale, bad).toBe(1);
    }
    expect(parseUrlState('?wd=60&tb=1').settings.timeBar).toBe(true);
    expect(parseUrlState('?wd=60&tb=no').settings.timeBar).toBe(true);
  });
});

describe('time bar: Held still has nothing to pause (issue #34)', () => {
  it('Pause is replaced only in Held still, steady wind, Easy ropes', () => {
    expect(pauseAvailable('held', 'steady', 'easy')).toBe(false);
    expect(pauseAvailable('held', 'steady', 'realistic')).toBe(true);
    expect(pauseAvailable('held', 'gusty', 'easy')).toBe(true);
    expect(pauseAvailable('sailing', 'steady', 'easy')).toBe(true);
  });

  it("time cannot stay frozen when the chip takes Pause's place", () => {
    let state = act(sailing(), { type: 'setPaused', paused: true });
    expect(state.paused).toBe(true);
    state = act(state, { type: 'setBoatMode', mode: 'held' });
    expect(state.paused).toBe(false);
    // Realistic mode keeps Pause, so a pause there survives, and ends if Easy comes back.
    state = act(state, { type: 'setRopesMode', mode: 'realistic' });
    state = act(state, { type: 'setPaused', paused: true });
    expect(state.paused).toBe(true);
    state = act(state, { type: 'setRopesMode', mode: 'easy' });
    expect(state.paused).toBe(false);
    // A changing wind keeps Pause too.
    state = act(state, { type: 'setWindMode', mode: 'building' });
    state = act(state, { type: 'setPaused', paused: true });
    state = act(state, { type: 'setWindMode', mode: 'steady' });
    expect(state.paused).toBe(false);
  });
});

describe('wind modes: what the speed slider shows (issue #33)', () => {
  it('in a building wind the wind now leaves the set average, so the slider must follow it', () => {
    let state = initialState({
      boat: { mode: 'held' },
      controls: { ctl_wind_dir: 60, ctl_wind_speed: 8 },
      windMode: { mode: 'building' },
    });
    state = run(state, 120, 10);
    expect(state.controls.ctl_wind_speed).toBe(8);
    expect(state.wind.twsKn).toBeGreaterThan(9);
  });
});
