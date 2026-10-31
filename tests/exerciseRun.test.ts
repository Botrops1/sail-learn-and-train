import { describe, expect, it } from 'vitest';
import { exerciseStartLink, parseUrlState } from '../src/app/urlState';
import { initialState, reduce, type Action, type AppState } from '../src/app/store';

function opened(ropes: 'easy' | 'realistic' = 'easy'): AppState {
  return parseUrlState(exerciseStartLink('points-of-sail', initialState(), ropes));
}

function run(state: AppState, seconds: number): AppState {
  let next = state;
  for (let i = 0; i < Math.round(seconds / 0.05); i += 1)
    next = reduce(next, { type: 'step', dt: 0.05 });
  return next;
}

const turn = (state: AppState, times: number): AppState => {
  let next = state;
  for (let i = 0; i < times; i += 1) {
    next = reduce(next, { type: 'autopilot', command: { turnDeg: -10 } });
  }
  return next;
};

const controls = (state: AppState, values: Record<string, number>): AppState =>
  reduce(state, { type: 'setControls', values } as Action);

/** Steps until the run is on `step` (or done); returns the state and the app seconds it took. */
function until(state: AppState, step: number, limitS: number) {
  const from = state.exercise?.elapsedS ?? 0;
  let next = state;
  while ((next.exercise?.elapsedS ?? 0) - from < limitS) {
    if ((next.exercise?.step ?? 0) >= step) break;
    next = reduce(next, { type: 'step', dt: 0.05 });
  }
  return { state: next, took: (next.exercise?.elapsedS ?? 0) - from };
}

describe('the coach (PHASE10_SPEC 6.7)', () => {
  it('PT-22 bearing away eases the sails: the points-of-sail exercise passes when the sheets are eased step by step', () => {
    let state = reduce(opened(), { type: 'exercise', command: 'start' });
    const plan: [() => AppState, number][] = [
      [() => controls(state, { ctl_mainsheet: 12 }), 15],
      [() => controls(turn(state, 2), { ctl_mainsheet: 25 }), 30],
      [() => controls(turn(state, 3), { ctl_mainsheet: 50, ctl_jib_sheet: 100 }), 30],
      [() => controls(turn(state, 4), { ctl_mainsheet: 100 }), 30],
      [() => turn(state, 3), 35],
    ];
    plan.forEach(([act, limit], index) => {
      state = act();
      const result = until(state, index + 1, limit);
      expect(result.state.exercise?.step, `step ${index + 1} within ${limit} s`).toBe(index + 1);
      state = result.state;
    });
    const done = state.exercise;
    if (!done) throw new Error('no run');
    expect(done.status).toBe('done');
    expect(state.paused).toBe(true);
    expect(done.elapsedS).toBeGreaterThan(60);
    expect(done.elapsedS).toBeLessThan(100);
    expect(done.log.map((e) => e.kind)).toEqual([
      'start',
      'step',
      'step',
      'step',
      'step',
      'step',
      'finish',
    ]);
  });

  it('does not pass without trim', () => {
    const state = run(reduce(opened(), { type: 'exercise', command: 'start' }), 60);
    expect(state.exercise?.step).toBe(0);
  });

  it('stands still while paused', () => {
    const started = reduce(opened(), { type: 'exercise', command: 'start' });
    const paused = run(reduce(started, { type: 'setPaused', paused: true }), 10);
    expect(paused.exercise?.elapsedS).toBe(0);
    expect(paused.exercise?.holdS).toBe(0);
    expect(paused.exercise?.step).toBe(0);
  });

  it('locks the conditions', () => {
    const state = reduce(opened(), { type: 'exercise', command: 'start' });
    const set = controls(state, { ctl_wind_speed: 20, ctl_mainsheet: 50 });
    expect(set.controls.ctl_wind_speed).toBe(12);
    expect(set.controls.ctl_mainsheet).toBe(50);
    const locked: Action[] = [
      { type: 'setWindMode', mode: 'gusty' },
      { type: 'goToPlace', place: 'marina' },
      { type: 'setSeaSetting', setting: 'open' },
      { type: 'setClock', utcMs: 0 },
      { type: 'setBoatMode', mode: 'held' },
      { type: 'setRopesMode', mode: 'realistic' },
    ];
    for (const action of locked) expect(reduce(state, action)).toBe(state);
  });

  it('ends on a mode change, a reset or stop', () => {
    const state = reduce(opened(), { type: 'exercise', command: 'start' });
    const easy = reduce(state, { type: 'setAppMode', mode: 'easy' });
    expect(easy.exercise).toBeNull();
    expect(easy.appMode).toBe('easy');
    expect(reduce(state, { type: 'reset' }).exercise).toBeNull();
    const stopped = reduce(state, { type: 'exercise', command: 'stop' });
    expect(stopped.exercise).toBeNull();
    expect(stopped.appMode).toBe('exercise');
    expect(stopped.paused).toBe(false);
  });

  it('opens in setup, paused; ropes only in setup; start once', () => {
    const state = opened();
    expect(state.exercise?.status).toBe('setup');
    expect(state.paused).toBe(true);
    const real = reduce(state, { type: 'exercise', command: { ropes: 'realistic' } });
    expect(real.settings.ropesMode).toBe('realistic');
    expect(real.appMode).toBe('exercise');
    const started = reduce(state, { type: 'exercise', command: 'start' });
    expect(started.exercise?.status).toBe('running');
    expect(started.paused).toBe(false);
    expect(reduce(started, { type: 'exercise', command: 'start' })).toBe(started);
    expect(reduce(started, { type: 'exercise', command: { ropes: 'realistic' } })).toBe(started);
  });
});
