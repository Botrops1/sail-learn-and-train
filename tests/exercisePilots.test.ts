import { afterEach, describe, expect, it, vi } from 'vitest';
import { barRowOf, barRowsFor } from '../src/app/exerciseBar';
import {
  parseProgress,
  PROGRESS_KEY,
  readProgress,
  recordDone,
  recordWatched,
} from '../src/app/exerciseProgress';
import { pilotActions, pilotFor, type Pilot } from '../src/app/exercisePilots';
import { initialState, reduce, type Action, type AppState } from '../src/app/store';
import { exerciseStartLink, parseUrlState, serializeUrlState } from '../src/app/urlState';
import { exerciseDef, type ExerciseLevel } from '../src/model/exercises';
import { goodRun, runFrom } from './harbourPilot';

/** PHASE10_PHONE_SPEC 8.6, 8.7: step limits (s), `ceil(1.2 × prototype + 3)`. */
const SAILING_LIMITS: Record<string, number[]> = {
  'points-of-sail': [10, 21, 20, 22, 25],
  tacking: [72, 22, 61, 32],
  irons: [5, 67, 36],
  gybing: [8, 22, 9, 23],
  gusts: [173, 13],
  'reduce-sail': [8, 7, 15],
  'set-sails': [13, 7, 49, 11, 9],
  'furl-sails': [6, 7, 20, 7],
};

/** Show me from each step: harbour limits per level (8.7); stern-to-anchor measured in the M81 PR (57.1, 14.6, 146.5, 1.0, 17.6 s). */
const HARBOUR_SHOW_ME: Record<string, Partial<Record<ExerciseLevel, number[]>>> = {
  'leave-berth': {
    easy: [5, 5, 45, 34],
    normal: [5, 5, 45, 35],
    hard: [5, 5, 35, 35],
  },
  'enter-berth': {
    easy: [5, 103, 103, 5, 27, 35],
    normal: [5, 90, 107, 5, 28, 28],
    hard: [5, 93, 121, 5, 27, 14],
  },
  'turn-own-length': { easy: [29, 44] },
  'mooring-buoy': { easy: [142, 5, 15, 5, 50] },
  'anchor-shore': { easy: [96, 33, 88, 53, 75, 99] },
  'stern-to-anchor': { easy: [72, 21, 179, 5, 25] },
};

const startState = (id: string, level: ExerciseLevel = 'easy'): AppState =>
  parseUrlState(exerciseStartLink(id, initialState(), 'easy', { level }));
const started = (id: string, level: ExerciseLevel = 'easy'): AppState =>
  reduce(startState(id, level), { type: 'exercise', command: 'start' });
const dt = (s: AppState): AppState => reduce(s, { type: 'step', dt: 0.05 });

/** The good run frame by frame; `at[k]` is the state when step k began (the pilot's own calls). */
function goodRunStates(id: string, level: ExerciseLevel): { at: AppState[]; end: AppState } {
  const pilot = pilotFor(id, level, 'easy');
  if (pilot === null) throw new Error(`no pilot for ${id}`);
  let s = started(id, level);
  const at: AppState[] = [s];
  let t = 0;
  while (s.exercise?.status === 'running' && t < 600) {
    s = dt(pilot(s, t));
    t += 0.05;
    if (s.exercise !== null && s.exercise.step > at.length - 1 && s.exercise.status === 'running') {
      at.push(s);
    }
  }
  return { at, end: s };
}

describe('M81 good runs of the sailing exercises (Easy ropes)', () => {
  for (const [id, limits] of Object.entries(SAILING_LIMITS)) {
    it(`${id}: done, no mistake, each step within its limit`, () => {
      const pilot = pilotFor(id, 'easy', 'easy');
      expect(pilot).not.toBeNull();
      const total = limits.reduce((a, b) => a + b, 0) + 5;
      const result = goodRun(id, 'easy', pilot as Pilot, total);
      expect(result.status).toBe('done');
      expect(result.mistakes).toEqual([]);
      limits.forEach((limit, i) => {
        expect(result.durations[i] ?? Infinity, `step ${i + 1}`).toBeLessThanOrEqual(limit);
      });
    });
  }
});

describe('M81 Show me from every step', () => {
  for (const [id, byLevel] of Object.entries(HARBOUR_SHOW_ME)) {
    for (const [level, limits] of Object.entries(byLevel) as [ExerciseLevel, number[]][]) {
      it(`${id} (${level})`, () => {
        const { at } = goodRunStates(id, level);
        expect(at.length).toBe(exerciseDef(id)?.steps.length);
        at.forEach((base, k) => {
          const shown = reduce(base, { type: 'exercise', command: { demo: 'showMe' } });
          expect(shown.exercise?.demo).toBe('showMe');
          expect(shown.exercise?.demoStep).toBe(k);
          const fresh = pilotFor(id, level, 'easy') as Pilot;
          const result = runFrom(
            shown,
            fresh,
            (s) => (s.exercise?.step ?? 0) > k || s.exercise?.status === 'done',
            600,
          );
          const run = result.state.exercise;
          expect(
            run?.status === 'done' || run?.stepPause,
            `${id} ${level} step ${k + 1} ends`,
          ).toBe(true);
          expect(result.mistakes, `${id} ${level} step ${k + 1} mistakes`).toBe(0);
          const limit = limits[k];
          if (limit !== undefined) {
            expect(result.timeS, `${id} ${level} step ${k + 1}`).toBeLessThanOrEqual(limit);
          }
        });
      });
    }
  }
  for (const [id, limits] of Object.entries(SAILING_LIMITS)) {
    it(`${id}`, () => {
      const { at } = goodRunStates(id, 'easy');
      expect(at.length).toBe(limits.length);
      at.forEach((base, k) => {
        const shown = reduce(base, { type: 'exercise', command: { demo: 'showMe' } });
        const result = runFrom(
          shown,
          pilotFor(id, 'easy', 'easy') as Pilot,
          (s) => (s.exercise?.step ?? 0) > k || s.exercise?.status === 'done',
          600,
        );
        const run = result.state.exercise;
        expect(run?.status === 'done' || run?.stepPause, `step ${k + 1} ends`).toBe(true);
        expect(result.mistakes, `step ${k + 1} mistakes`).toBe(0);
        expect(result.timeS, `step ${k + 1}`).toBeLessThanOrEqual(limits[k] ?? 0);
      });
    });
  }
});

describe('M81 the demo commands', () => {
  it('watch is refused outside setup, showMe outside running', () => {
    const setup = startState('points-of-sail');
    const running = reduce(setup, { type: 'exercise', command: 'start' });
    expect(reduce(running, { type: 'exercise', command: { demo: 'watch' } })).toBe(running);
    expect(reduce(setup, { type: 'exercise', command: { demo: 'showMe' } })).toBe(setup);
    const watching = reduce(setup, { type: 'exercise', command: { demo: 'watch' } });
    expect(watching.exercise?.demo).toBe('watch');
  });

  it('showMe puts the boat back at the step waypoint and sets demoStep', () => {
    let s = started('points-of-sail');
    s = reduce(s, { type: 'setControls', values: { ctl_mainsheet: 40 } });
    for (let i = 0; i < 40; i += 1) s = dt(s);
    const moved = s.boat.eastM !== s.exercise?.waypoints[0]?.state.boat.eastM;
    expect(moved).toBe(true);
    const shown = reduce(s, { type: 'exercise', command: { demo: 'showMe' } });
    expect(shown.boat).toEqual(s.exercise?.waypoints[0]?.state.boat);
    expect(shown.exercise).toMatchObject({ demo: 'showMe', demoStep: 0, status: 'running' });
  });

  it('a step the app played stops time even without "pause after each step"', () => {
    let s = reduce(startState('points-of-sail'), { type: 'exercise', command: { demo: 'watch' } });
    s = reduce(s, { type: 'exercise', command: 'start' });
    const pilot = pilotFor('points-of-sail', 'easy', 'easy') as Pilot;
    for (let i = 0; i < 800 && s.exercise?.step === 0; i += 1) {
      s = dt(reduce(s, { type: 'demo', actions: pilotActions(pilot, s) }));
    }
    expect(s.exercise?.options.pauseOnStep).toBe(false);
    expect(s.exercise).toMatchObject({ step: 1, stepPause: true });
    expect(s.paused).toBe(true);
  });

  it('{ demo: null } clears both fields; a run with a demo has no new link key', () => {
    const watching = reduce(startState('points-of-sail'), {
      type: 'exercise',
      command: { demo: 'watch' },
    });
    const plain = startState('points-of-sail');
    expect(serializeUrlState(watching)).toBe(serializeUrlState(plain));
    const cleared = reduce(watching, { type: 'exercise', command: { demo: null } });
    expect(cleared.exercise).toMatchObject({ demo: null, demoStep: -1 });
  });

  it('back ends a demo, in watch and in showMe', () => {
    let s = started('points-of-sail');
    s = reduce(s, { type: 'exercise', command: { demo: 'showMe' } });
    expect(s.exercise?.demo).toBe('showMe');
    s = reduce(s, { type: 'exercise', command: { back: 0 } });
    expect(s.exercise).toMatchObject({ demo: null, demoStep: -1 });
    let w = reduce(startState('points-of-sail'), { type: 'exercise', command: { demo: 'watch' } });
    w = reduce(w, { type: 'exercise', command: 'start' });
    w = reduce(w, { type: 'exercise', command: { back: 0 } });
    expect(w.exercise?.demo).toBeNull();
  });
});

describe('M81 the demo action', () => {
  it('equals applying the action but writes no log entry; a learner action still logs', () => {
    const s = started('points-of-sail');
    const action: Action = { type: 'setControls', values: { ctl_mainsheet: 33 } };
    const demo = reduce(s, { type: 'demo', actions: [action] });
    const own = reduce(s, action);
    expect(demo.controls.ctl_mainsheet).toBe(33);
    expect(demo.exercise?.log.filter((e) => e.kind === 'action')).toEqual([]);
    expect(own.exercise?.log.filter((e) => e.kind === 'action')).toHaveLength(1);
    expect({ ...own, exercise: { ...own.exercise, log: demo.exercise?.log } }).toEqual(demo);
  });
});

describe('M81 the bar covers what the pilots do (the phone promise)', () => {
  const all: Array<[string, ExerciseLevel]> = [
    ...Object.keys(SAILING_LIMITS).map((id): [string, ExerciseLevel] => [id, 'easy']),
    ['leave-berth', 'hard'],
    ['enter-berth', 'hard'],
    ['turn-own-length', 'easy'],
    ['mooring-buoy', 'easy'],
    ['anchor-shore', 'easy'],
    ['stern-to-anchor', 'easy'],
  ];
  for (const [id, level] of all) {
    it(`${id}: every pilot action is a row of this step's bar or the next`, () => {
      const def = exerciseDef(id);
      if (!def) throw new Error(id);
      const pilot = pilotFor(id, level, 'easy') as Pilot;
      let s = reduce(startState(id, level), { type: 'exercise', command: { demo: 'watch' } });
      s = reduce(s, { type: 'exercise', command: 'start' });
      let frames = 0;
      while (s.exercise?.status === 'running' && frames < 12000) {
        const step = s.exercise.step;
        const actions = pilotActions(pilot, s);
        const allowed = new Set([
          ...barRowsFor(def, step, 'easy'),
          ...(step + 1 < def.steps.length ? barRowsFor(def, step + 1, 'easy') : []),
        ]);
        for (const action of actions) {
          for (const row of barRowOf(action)) {
            expect(allowed.has(row), `${id} step ${step + 1}: ${row}`).toBe(true);
          }
        }
        if (actions.length > 0) s = reduce(s, { type: 'demo', actions });
        s = dt(s);
        // Watch stops after each step: go on, as the Next step button does.
        if (s.paused && s.exercise?.status === 'running')
          s = reduce(s, { type: 'setPaused', paused: false });
        frames += 1;
      }
      expect(s.exercise?.status).toBe('done');
      expect(s.exercise?.log.filter((e) => e.kind === 'mistake')).toEqual([]);
    });
  }
});

describe('M81 the Watched mark', () => {
  const store: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
  });
  afterEach(() => {
    store[PROGRESS_KEY] = '';
  });

  it('recordWatched sets the mark; recordDone keeps it', () => {
    recordWatched('gybing');
    expect(readProgress().watched['gybing']?.at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    recordDone('gybing', 70);
    const after = readProgress();
    expect(after.done['gybing']?.bestS).toBe(70);
    expect(after.watched['gybing']).toBeDefined();
  });

  it('an old value without watched reads as {}; one with only watched keeps it', () => {
    expect(parseProgress('{"v":1,"done":{"a":{"bestS":5,"at":"d"}}}').watched).toEqual({});
    const only = parseProgress('{"v":1,"watched":{"a":{"at":"d"}}}');
    expect(only.watched).toEqual({ a: { at: 'd' } });
    expect(only.done).toEqual({});
  });
});

describe('M81 pilotFor', () => {
  it('has no pilot for the sailing exercises in Realistic ropes, but has one for the harbour', () => {
    expect(pilotFor('points-of-sail', 'easy', 'realistic')).toBeNull();
    expect(pilotFor('leave-berth', 'hard', 'realistic')).not.toBeNull();
    expect(pilotFor('nope', 'easy', 'easy')).toBeNull();
  });
});
