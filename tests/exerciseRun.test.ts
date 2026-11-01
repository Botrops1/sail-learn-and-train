import { describe, expect, it } from 'vitest';
import { stepExercise } from '../src/app/exerciseRun';
import { tailSpec } from '../src/model/realistic';
import { debriefRows } from '../src/model/debrief';
import { exerciseDef, twaSignedDeg, type ExerciseDef } from '../src/model/exercises';
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
    // M68 adds `action` entries between these; this test is about the steps.
    expect(done.log.map((e) => e.kind).filter((kind) => kind !== 'action')).toEqual([
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

/** The good run of the first four steps (6.7 test 1), leaving the run at step 5 (index 4). */
function goodRunToStep5(): AppState {
  let state = reduce(opened(), { type: 'exercise', command: 'start' });
  const acts: (() => AppState)[] = [
    () => controls(state, { ctl_mainsheet: 12 }),
    () => controls(turn(state, 2), { ctl_mainsheet: 25 }),
    () => controls(turn(state, 3), { ctl_mainsheet: 50, ctl_jib_sheet: 100 }),
    () => controls(turn(state, 4), { ctl_mainsheet: 100 }),
  ];
  acts.forEach((act, index) => {
    state = until(act(), index + 1, 40).state;
  });
  return state;
}

describe('mistakes and waypoints (PHASE10_SPEC 7.7)', () => {
  it('PT-26 running past dead downwind gybes the boom: the exercise reports by the lee, then the gybe', () => {
    let state = turn(goodRunToStep5(), 6);
    expect(state.exercise?.step).toBe(4);
    const from = state.exercise?.elapsedS ?? 0;
    for (let i = 0; i < 25 / 0.05 && state.exercise?.status === 'running'; i += 1) {
      state = reduce(state, { type: 'step', dt: 0.05 });
    }
    expect(state.exercise?.status).toBe('mistake');
    expect(state.paused).toBe(true);
    expect(state.exercise?.mistake?.mistakeId).toBe('by-the-lee');
    const lee = (state.exercise?.elapsedS ?? 0) - from;
    expect(lee).toBeLessThan(25);
    // Paused: time stands still.
    const still = run(state, 3);
    expect(still.exercise?.elapsedS).toBe(state.exercise?.elapsedS);
    state = reduce(state, { type: 'exercise', command: 'continue' });
    expect(state.exercise?.status).toBe('running');
    expect(state.paused).toBe(false);
    for (let i = 0; i < 35 / 0.05 && state.exercise?.status === 'running'; i += 1) {
      state = reduce(state, { type: 'step', dt: 0.05 });
    }
    expect(state.exercise?.mistake?.mistakeId).toBe('accidental-gybe');
    expect((state.exercise?.elapsedS ?? 0) - from).toBeLessThan(35);
  });

  it('does not pause when the box is unticked', () => {
    let state = reduce(
      reduce(opened(), { type: 'exercise', command: { options: { pauseOnMistake: false } } }),
      { type: 'exercise', command: 'start' },
    );
    const acts: (() => AppState)[] = [
      () => controls(state, { ctl_mainsheet: 12 }),
      () => controls(turn(state, 2), { ctl_mainsheet: 25 }),
      () => controls(turn(state, 3), { ctl_mainsheet: 50, ctl_jib_sheet: 100 }),
      () => controls(turn(state, 4), { ctl_mainsheet: 100 }),
    ];
    acts.forEach((act, index) => {
      state = until(act(), index + 1, 40).state;
    });
    state = turn(state, 6);
    for (let i = 0; i < 45 / 0.05; i += 1) {
      state = reduce(state, { type: 'step', dt: 0.05 });
      expect(state.exercise?.status).not.toBe('mistake');
      expect(state.paused).toBe(false);
    }
    const ids = (state.exercise?.log ?? [])
      .filter((e) => e.kind === 'mistake')
      .map((e) => (e.kind === 'mistake' ? e.mistakeId : ''));
    expect(ids).toContain('by-the-lee');
    expect(ids).toContain('accidental-gybe');
    expect(state.exercise?.mistake?.mistakeId).toBe('accidental-gybe');
  });

  it('keeps a repeat gap between the same mistake', () => {
    const base = reduce(goodRunToStep5(), { type: 'step', dt: 0.05 });
    const feed = (gapS: number) => {
      let state: AppState = { ...base, paused: false };
      const lee = (n: number, atS: number) => ({
        n,
        kind: 'byTheLee' as const,
        atS,
        severity: 'warning' as const,
      });
      let written = state.alerts.written;
      const step = (entries: ReturnType<typeof lee>[]) => {
        const previous = state;
        written += entries.length;
        state = {
          ...previous,
          rig: { ...previous.rig, timeS: previous.rig.timeS + gapS / 2 },
          alerts: { entries: [...previous.alerts.entries, ...entries], written },
        };
        state = stepExerciseOnce(previous, state);
        if (state.exercise?.status === 'mistake') {
          state = reduce(state, { type: 'exercise', command: 'continue' });
        }
      };
      step([lee(written + 1, previousT(state))]);
      step([]);
      step([lee(written + 1, previousT(state))]);
      return (state.exercise?.log ?? []).filter((e) => e.kind === 'mistake').length;
    };
    expect(feed(5)).toBe(1);
    expect(feed(11)).toBe(2);
  });

  it('in irons: turning towards the wind stops her and the condition fires', () => {
    let state = reduce(opened(), { type: 'exercise', command: 'start' });
    state = until(controls(state, { ctl_mainsheet: 12 }), 1, 40).state;
    const from = state.exercise?.elapsedS ?? 0;
    state = reduce(state, { type: 'autopilot', command: { turnDeg: 10 } });
    for (let i = 0; i < 3; i += 1)
      state = reduce(state, { type: 'autopilot', command: { turnDeg: 10 } });
    for (let i = 0; i < 70 / 0.05 && state.exercise?.status === 'running'; i += 1) {
      state = reduce(state, { type: 'step', dt: 0.05 });
    }
    expect(state.exercise?.mistake?.mistakeId).toBe('in-irons');
    const took = (state.exercise?.elapsedS ?? 0) - from;
    expect(took).toBeGreaterThanOrEqual(30);
    expect(took).toBeLessThanOrEqual(60);
  });

  it('applies only to the steps a mistake names, and a serious one fails the run', () => {
    const def: ExerciseDef = {
      ...(exerciseDef('points-of-sail') as ExerciseDef),
      steps: [
        { id: 'a', opens: 'ropes', holdS: 0, check: { twaDeg: [300, 301] } },
        { id: 'b', opens: 'ropes', holdS: 0, check: { twaDeg: [300, 301] } },
      ],
      mistakes: [{ id: 'x', serious: true, steps: ['b'], on: { alert: 'tack' } }],
    };
    const started = reduce(opened(), { type: 'exercise', command: 'start' });
    const withTack = (state: AppState): [AppState, AppState] => {
      const written = state.alerts.written + 1;
      const next: AppState = {
        ...state,
        rig: { ...state.rig, timeS: state.rig.timeS + 5 },
        alerts: {
          entries: [
            ...state.alerts.entries,
            { n: written, kind: 'tack', atS: state.rig.timeS, severity: 'info' },
          ],
          written,
        },
      };
      return [state, next];
    };
    const [p1, n1] = withTack(started);
    expect(stepExercise(p1, n1, def).exercise?.status).toBe('running');
    const atB: AppState = {
      ...started,
      exercise: started.exercise ? { ...started.exercise, step: 1 } : null,
    };
    const [p2, n2] = withTack(atB);
    const failed = stepExercise(p2, n2, def);
    expect(failed.exercise?.status).toBe('failed');
    expect(failed.paused).toBe(true);
    expect(reduce(failed, { type: 'exercise', command: 'continue' })).toBe(failed);
  });

  it('skips alerts in the first second after Start', () => {
    const def = exerciseDef('points-of-sail') as ExerciseDef;
    const started = reduce(opened(), { type: 'exercise', command: 'start' });
    const lee = (state: AppState, dt: number): [AppState, AppState] => {
      const written = state.alerts.written + 1;
      return [
        state,
        {
          ...state,
          rig: { ...state.rig, timeS: state.rig.timeS + dt },
          alerts: {
            entries: [{ n: written, kind: 'byTheLee', atS: 0, severity: 'warning' }],
            written,
          },
        },
      ];
    };
    const [p1, n1] = lee(started, 0.5);
    expect(stepExercise(p1, n1, def).exercise?.mistake).toBeNull();
    const [p2, n2] = lee(started, 1.5);
    expect(stepExercise(p2, n2, def).exercise?.mistake?.mistakeId).toBe('by-the-lee');
  });

  it('makes a waypoint at Start and at every step passed, and goes back to one', () => {
    let state = reduce(opened(), { type: 'exercise', command: 'start' });
    expect(state.exercise?.waypoints.map((w) => w.step)).toEqual([0]);
    state = until(controls(state, { ctl_mainsheet: 12 }), 1, 40).state;
    expect(state.exercise?.waypoints.map((w) => w.step)).toEqual([0, 1]);
    const wp1 = state.exercise?.waypoints[1]?.state;
    expect(wp1?.controls.ctl_mainsheet).toBe(12);
    state = until(controls(turn(state, 2), { ctl_mainsheet: 25 }), 2, 40).state;
    state = until(controls(turn(state, 3), { ctl_mainsheet: 50, ctl_jib_sheet: 100 }), 3, 40).state;
    expect(state.exercise?.step).toBe(3);
    const alerts = state.alerts;
    const camera = { ...state.camera, preset: 'map' as const };
    state = { ...state, camera };
    const timeBefore = state.rig.timeS;
    const back = reduce(state, { type: 'exercise', command: { back: 1 } });
    expect(back.exercise?.step).toBe(1);
    expect(back.controls.ctl_mainsheet).toBe(12);
    const twa = (s: AppState) => Math.abs(twaSignedDeg(s));
    expect(Math.abs(twa(back) - twa(wp1 as AppState))).toBeLessThan(1);
    expect(back.exercise?.waypoints.length).toBe(2);
    expect(back.exercise?.log.at(-1)?.kind).toBe('back');
    expect(back.alerts).toBe(alerts);
    expect(back.camera).toBe(camera);
    expect(back.exercise?.status).toBe('running');
    expect(back.paused).toBe(false);
    expect(back.exercise?.mistake).toBeNull();
    expect(back.rig.timeS).toBeGreaterThanOrEqual(timeBefore);
    expect(back.alerts.written).toBe(alerts.written);
  });

  it('has no waypoint to go back to: same state; Back works from done and failed', () => {
    const state = reduce(opened(), { type: 'exercise', command: 'start' });
    expect(reduce(state, { type: 'exercise', command: { back: 4 } })).toBe(state);
    const done: AppState = {
      ...state,
      paused: true,
      exercise: state.exercise ? { ...state.exercise, status: 'done', step: 5 } : null,
    };
    const failed: AppState = {
      ...done,
      exercise: done.exercise ? { ...done.exercise, status: 'failed', step: 2 } : null,
    };
    for (const from of [done, failed]) {
      const back = reduce(from, { type: 'exercise', command: { back: 0 } });
      expect(back.exercise?.status).toBe('running');
      expect(back.exercise?.step).toBe(0);
    }
  });

  it('writes a new by-the-lee alert after a Back (app time never runs backwards)', () => {
    let state = turn(goodRunToStep5(), 6);
    for (let i = 0; i < 25 / 0.05 && state.exercise?.status === 'running'; i += 1) {
      state = reduce(state, { type: 'step', dt: 0.05 });
    }
    const lastLee = state.alerts.entries.filter((e) => e.kind === 'byTheLee').at(-1);
    expect(lastLee).toBeDefined();
    const timeBefore = state.rig.timeS;
    state = reduce(state, { type: 'exercise', command: { back: 4 } });
    expect(state.rig.timeS).toBeGreaterThanOrEqual(timeBefore);
    state = turn(state, 6);
    let found = false;
    for (let i = 0; i < 40 / 0.05; i += 1) {
      state = reduce(state, { type: 'step', dt: 0.05 });
      if (state.exercise?.mistake?.mistakeId === 'by-the-lee') {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
    const lees = state.alerts.entries.filter((e) => e.kind === 'byTheLee');
    const newest = lees.at(-1);
    expect(newest && lastLee ? newest.atS - lastLee.atS : 0).toBeGreaterThanOrEqual(6);
  });

  it('does not let Pause override a mistake card', () => {
    let state = turn(goodRunToStep5(), 6);
    for (let i = 0; i < 25 / 0.05 && state.exercise?.status === 'running'; i += 1) {
      state = reduce(state, { type: 'step', dt: 0.05 });
    }
    expect(state.exercise?.status).toBe('mistake');
    expect(reduce(state, { type: 'setPaused', paused: false })).toBe(state);
  });
});

function previousT(state: AppState): number {
  return state.rig.timeS;
}
function stepExerciseOnce(previous: AppState, next: AppState): AppState {
  return stepExercise(previous, next);
}

describe('the debrief log (PHASE10_SPEC 8.6)', () => {
  const started = (): AppState => reduce(opened(), { type: 'exercise', command: 'start' });
  const actions = (state: AppState) =>
    (state.exercise?.log ?? []).flatMap((e) => (e.kind === 'action' ? [e.action] : []));

  it('merges quick changes of the same control, and never logs the wind', () => {
    let state = controls(started(), { ctl_mainsheet: 30 });
    state = run(state, 5);
    state = controls(state, { ctl_mainsheet: 25 });
    state = run(state, 1);
    state = controls(state, { ctl_mainsheet: 20 });
    expect(actions(state).at(-1)).toMatchObject({
      type: 'control',
      id: 'ctl_mainsheet',
      from: 30,
      to: 20,
    });
    const count = actions(state).length;
    state = run(state, 4);
    state = controls(state, { ctl_mainsheet: 15 });
    expect(actions(state)).toHaveLength(count + 1);
    expect(actions(state).at(-1)).toMatchObject({ from: 20, to: 15 });
    state = controls(state, { ctl_wind_dir: 123 });
    expect(actions(state)).toHaveLength(count + 1);
    const before = actions(state).length;
    state = turn(state, 6);
    expect(actions(state)).toHaveLength(before + 1);
    expect(actions(state).at(-1)).toMatchObject({ command: 'turn', turnDeg: -60 });
  });

  it('logs a Realistic clutch with its key and state', () => {
    const real = reduce(opened('realistic'), { type: 'exercise', command: 'start' });
    const station = tailSpec('a2')?.station ?? 'port';
    const there = reduce(real, { type: 'realistic', action: { type: 'station', station } });
    expect(actions(there).at(-1)).toMatchObject({ gesture: 'station', target: station });
    const state = reduce(there, {
      type: 'realistic',
      action: { type: 'clutch', key: 'a2', open: true },
    });
    const logged = actions(state);
    expect(logged.length).toBeGreaterThan(0);
    expect(logged.at(-1)).toMatchObject({
      type: 'realistic',
      gesture: 'clutch',
      target: 'a2',
      on: true,
    });
  });

  it('does not log in setup, done or failed, nor camera or a change of nothing', () => {
    const setup = controls(opened(), { ctl_mainsheet: 20 });
    expect(setup.exercise?.log).toEqual([]);
    const state = started();
    const length = state.exercise?.log.length ?? 0;
    const same = controls(state, { ctl_mainsheet: state.controls.ctl_mainsheet });
    expect(same.exercise?.log).toHaveLength(length);
    const camera = reduce(state, { type: 'setCameraPreset', preset: 'top' } as Action);
    expect(camera.exercise?.log).toHaveLength(length);
    const paused = reduce(state, { type: 'setPaused', paused: true });
    expect(paused.exercise?.log).toHaveLength(length);
    const failed: AppState = {
      ...state,
      exercise: state.exercise ? { ...state.exercise, status: 'failed' } : null,
    };
    expect(controls(failed, { ctl_mainsheet: 11 }).exercise?.log).toHaveLength(length);
  });

  it('PT-26 puts the events before their mistakes, and the turn among both causes', () => {
    let state = reduce(
      reduce(opened(), { type: 'exercise', command: { options: { pauseOnMistake: false } } }),
      { type: 'exercise', command: 'start' },
    );
    const acts: (() => AppState)[] = [
      () => controls(state, { ctl_mainsheet: 12 }),
      () => controls(turn(state, 2), { ctl_mainsheet: 25 }),
      () => controls(turn(state, 3), { ctl_mainsheet: 50, ctl_jib_sheet: 100 }),
      () => controls(turn(state, 4), { ctl_mainsheet: 100 }),
    ];
    acts.forEach((act, index) => {
      state = until(act(), index + 1, 40).state;
    });
    state = turn(state, 6);
    for (let i = 0; i < 45 / 0.05; i += 1) state = reduce(state, { type: 'step', dt: 0.05 });
    const log = state.exercise?.log ?? [];
    const lee = log.findIndex((e) => e.kind === 'mistake' && e.mistakeId === 'by-the-lee');
    const gybe = log.findIndex((e) => e.kind === 'mistake' && e.mistakeId === 'accidental-gybe');
    expect(lee).toBeGreaterThan(0);
    expect(gybe).toBeGreaterThan(lee);
    expect(log[lee - 1]).toMatchObject({ kind: 'event', entry: { kind: 'byTheLee' } });
    const before = log[gybe - 1];
    expect(before?.kind).toBe('event');
    expect(before?.kind === 'event' && before.entry.kind).toBe('gybe');
    const rows = debriefRows(log);
    for (const index of [lee, gybe]) {
      const last = rows[index]?.causes.at(-1)?.action;
      expect(last).toMatchObject({ type: 'autopilot', command: 'turn', turnDeg: -60 });
    }
  });

  it('keeps at most logMax entries and the start', () => {
    let state = started();
    for (let i = 0; i < 450; i += 1) {
      state = run(state, 4);
      state = controls(state, { ctl_vang: i % 2 === 0 ? 10 : 60 });
    }
    const log = state.exercise?.log ?? [];
    expect(log).toHaveLength(400);
    expect(log[0]?.kind).toBe('start');
  });
});
