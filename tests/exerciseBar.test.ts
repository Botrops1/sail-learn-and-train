import { describe, expect, it } from 'vitest';
import { barRowOf, barRowsFor, barShown, isBarRowId, BAR_MAX_ROWS } from '../src/app/exerciseBar';
import { initialState, type AppState } from '../src/app/store';
import { EXERCISES, exerciseDef } from '../src/model/exercises';
import type { ExerciseDef } from '../src/model/exercises';

const def = (id: string) => exerciseDef(id) as ExerciseDef;

describe('the step bar data (PHASE10_PHONE_SPEC 6.7)', () => {
  it('every step of every exercise has 0–4 known rows, none twice', () => {
    for (const ex of EXERCISES) {
      for (const step of ex.steps) {
        expect(Array.isArray(step.bar), `${ex.id}/${step.id}`).toBe(true);
        expect(step.bar.length).toBeLessThanOrEqual(BAR_MAX_ROWS);
        for (const row of step.bar)
          expect(isBarRowId(row), `${ex.id}/${step.id}: ${row}`).toBe(true);
        expect(new Set(step.bar).size).toBe(step.bar.length);
      }
    }
  });

  it('isBarRowId knows the forms of the data and refuses the rest', () => {
    for (const id of ['control:ctl_mainsheet', 'line:ll', 'thrusters', 'engine', 'windlass'])
      expect(isBarRowId(id), id).toBe(true);
    for (const id of ['control:ctl_nope', 'line:xx', 'autopilot:left', '', 'ropes', 'stations'])
      expect(isBarRowId(id), id).toBe(false);
  });
});

describe('barRowsFor', () => {
  it('is the step bar in Easy ropes', () => {
    expect(barRowsFor(def('points-of-sail'), 2, 'easy')).toEqual([
      'autopilot:turn',
      'control:ctl_mainsheet',
      'control:ctl_jib_sheet',
    ]);
  });
  it('puts one ropes row in place of the rope controls in Realistic ropes', () => {
    expect(barRowsFor(def('points-of-sail'), 1, 'realistic')).toEqual(['autopilot:turn', 'ropes']);
    expect(barRowsFor(def('points-of-sail'), 2, 'realistic')).toEqual(['autopilot:turn', 'ropes']);
  });
  it('keeps the wheel in Realistic ropes', () => {
    expect(barRowsFor(def('tacking'), 1, 'realistic')).toEqual([
      'autopilot:mode',
      'control:ctl_rudder',
    ]);
  });
  it('is empty for a step with no rows', () => {
    expect(barRowsFor(def('set-sails'), 0, 'easy')).toEqual([]);
  });
});

describe('barRowOf', () => {
  it('maps each action to the rows it works', () => {
    expect(
      barRowOf({ type: 'setControls', values: { ctl_mainsheet: 50, ctl_jib_sheet: 40 } }),
    ).toEqual(['control:ctl_mainsheet', 'control:ctl_jib_sheet']);
    expect(barRowOf({ type: 'autopilot', command: { turnDeg: -10 } })).toEqual(['autopilot:turn']);
    expect(barRowOf({ type: 'autopilot', command: 'wind' })).toEqual(['autopilot:mode']);
    expect(barRowOf({ type: 'autopilot', command: 'tack' })).toEqual(['autopilot:tack']);
    expect(barRowOf({ type: 'engine', command: 'start' })).toEqual(['engine']);
    expect(barRowOf({ type: 'thruster', which: 'bow', dir: 1 })).toEqual(['thrusters']);
    expect(barRowOf({ type: 'line', code: 'sl', command: 'take' })).toEqual(['line:sl']);
    expect(barRowOf({ type: 'setFenders', out: true })).toEqual(['fenders']);
    expect(barRowOf({ type: 'windlass', motion: 'down' })).toEqual(['windlass']);
    expect(barRowOf({ type: 'step', dt: 0.1 })).toEqual([]);
  });
});

describe('barShown', () => {
  it('is true only while a run is running or waiting on a mistake', () => {
    const base: AppState = initialState();
    expect(barShown(base)).toBe(false);
    const run = (status: string) => ({ ...base, exercise: { status } }) as unknown as AppState;
    for (const [status, shown] of [
      ['setup', false],
      ['done', false],
      ['failed', false],
      ['running', true],
      ['mistake', true],
    ] as const)
      expect(barShown(run(status)), status).toBe(shown);
  });
});
