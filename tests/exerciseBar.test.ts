import { describe, expect, it } from 'vitest';
import {
  barRowOf,
  barRowStation,
  barRowsAt,
  barRowsFor,
  barStationsFor,
  barShown,
  isBarRowId,
  parseRealisticRow,
  rowMatches,
  BAR_MAX_ROWS,
} from '../src/app/exerciseBar';
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

describe('M82 the Realistic rows (PHASE10_PHONE_SPEC 9.2, 9.6)', () => {
  it('every barRealistic row is a known row, at most four, none twice', () => {
    let seen = 0;
    for (const ex of EXERCISES) {
      for (const step of ex.steps) {
        if (!step.barRealistic) continue;
        seen += 1;
        expect(['set-sails', 'furl-sails'], ex.id).toContain(ex.id);
        expect(step.barRealistic.length).toBeLessThanOrEqual(BAR_MAX_ROWS);
        for (const row of step.barRealistic)
          expect(isBarRowId(row), `${ex.id}/${step.id}: ${row}`).toBe(true);
        expect(new Set(step.barRealistic).size).toBe(step.barRealistic.length);
      }
    }
    expect(seen).toBe(9);
  });

  it('isBarRowId checks the station, the clutch key and the winch id in the boat data', () => {
    for (const id of [
      'clutch:starboard:a2',
      'clutch:port:r1',
      'winch:port:winch_primary_port:r1',
      'winch:starboard:winch_primary_starboard:a5',
    ])
      expect(isBarRowId(id), id).toBe(true);
    for (const id of [
      'clutch:port:a2', // a2 is at the starboard station
      'clutch:starboard:zz',
      'clutch:helm:a2',
      'winch:port:winch_primary_starboard:a3',
      'winch:starboard:winch_primary_port:a3',
      'winch:starboard:winch_primary_starboard:zz',
      'winch:starboard:winch_primary_starboard',
      'stations',
    ])
      expect(isBarRowId(id), id).toBe(false);
    expect(parseRealisticRow('clutch:starboard:a2')).toEqual({
      kind: 'clutch',
      station: 'starboard',
      key: 'a2',
    });
  });

  it('barRowsFor shows barRealistic as it is in Realistic ropes, bar in Easy', () => {
    expect(barRowsFor(def('set-sails'), 0, 'realistic')).toEqual([]);
    expect(barRowsFor(def('set-sails'), 1, 'realistic')).toEqual([
      'clutch:starboard:a2',
      'winch:starboard:winch_primary_starboard:a3',
    ]);
    expect(barRowsFor(def('furl-sails'), 3, 'realistic')).toHaveLength(4);
    expect(barRowsFor(def('set-sails'), 1, 'easy')).toEqual(['control:ctl_main_furl']);
    // Another exercise keeps the placeholder.
    expect(barRowsFor(def('points-of-sail'), 1, 'realistic')).toEqual(['autopilot:turn', 'ropes']);
  });

  it('the autopilot and engine rows stand under Helm, the ropes at their own station', () => {
    expect(barRowStation('autopilot:mode')).toBe('helm');
    expect(barRowStation('autopilot:turn')).toBe('helm');
    expect(barRowStation('autopilot:tack')).toBe('helm');
    expect(barRowStation('engine')).toBe('helm');
    expect(barRowStation('clutch:starboard:a2')).toBe('starboard');
    expect(barRowStation('winch:port:winch_primary_port:r1')).toBe('port');
    expect(barRowStation('thrusters')).toBeNull();
    expect(barRowStation('windlass')).toBeNull();
    expect(barRowStation('line:' + 'x')).toBeNull();
  });

  it('barStationsFor lists the stations of a Realistic step, none elsewhere', () => {
    // Setting the sails: start (nothing), main out (starboard), bear away (starboard + helm), jib out
    // (port + starboard), engine off (helm).
    const set = def('set-sails');
    expect(barStationsFor(set, 0, 'realistic')).toEqual([]);
    expect(barStationsFor(set, 1, 'realistic')).toEqual(['starboard']);
    expect(barStationsFor(set, 2, 'realistic')).toEqual(['starboard', 'helm']);
    expect(barStationsFor(set, 3, 'realistic')).toEqual(['port', 'starboard']);
    expect(barStationsFor(set, 4, 'realistic')).toEqual(['helm']);
    // Easy ropes, another exercise and the harbour have no stations in the bar.
    expect(barStationsFor(set, 2, 'easy')).toEqual([]);
    expect(barStationsFor(def('points-of-sail'), 1, 'realistic')).toEqual([]);
    for (const ex of EXERCISES.filter((e) => e.group === 'harbour'))
      ex.steps.forEach((_, i) => expect(barStationsFor(ex, i, 'realistic'), ex.id).toEqual([]));
  });

  it("barRowsAt shows the rows of the learner's station only, in a step with stations", () => {
    const set = def('set-sails');
    expect(barRowsAt(set, 2, 'realistic', 'starboard')).toEqual([
      'clutch:starboard:a2',
      'winch:starboard:winch_primary_starboard:a3',
    ]);
    expect(barRowsAt(set, 2, 'realistic', 'helm')).toEqual(['autopilot:mode', 'autopilot:turn']);
    expect(barRowsAt(set, 2, 'realistic', 'port')).toEqual([]);
    expect(barRowsAt(set, 4, 'realistic', 'helm')).toEqual(['engine']);
    // A step without stations shows all its rows wherever the learner stands.
    expect(barRowsAt(def('points-of-sail'), 1, 'realistic', 'helm')).toEqual(
      barRowsFor(def('points-of-sail'), 1, 'realistic'),
    );
    expect(barRowsAt(set, 2, 'easy', 'port')).toEqual(barRowsFor(set, 2, 'easy'));
  });

  it('barRowOf maps the Realistic gestures', () => {
    const real = (action: Parameters<typeof barRowOf>[0] & { type: 'realistic' }) =>
      barRowOf(action);
    expect(real({ type: 'realistic', action: { type: 'clutch', key: 'a2', open: true } })).toEqual([
      'clutch:starboard:a2',
    ]);
    expect(real({ type: 'realistic', action: { type: 'onWinch', key: 'r1' } })).toEqual([
      'winch:port:winch_primary_port:r1',
    ]);
    for (const action of [
      { type: 'turn', winch: 'winch_primary_starboard', delta: 1 },
      { type: 'selfTailer', winch: 'winch_primary_starboard', into: true },
      { type: 'button', winch: 'winch_primary_starboard', held: true },
      { type: 'offWinch', winch: 'winch_primary_starboard' },
    ] as const)
      expect(real({ type: 'realistic', action })).toEqual([
        'winch:starboard:winch_primary_starboard:*',
      ]);
    expect(real({ type: 'realistic', action: { type: 'station', station: 'port' } })).toEqual([
      'stations',
    ]);
    expect(real({ type: 'realistic', action: { type: 'clearNotice' } })).toEqual([]);
  });

  it('rowMatches lets a winch gesture name any rope on that winch', () => {
    const shown = 'winch:starboard:winch_primary_starboard:a3';
    expect(rowMatches(shown, 'winch:starboard:winch_primary_starboard:*')).toBe(true);
    expect(rowMatches(shown, shown)).toBe(true);
    expect(rowMatches(shown, 'winch:port:winch_primary_port:*')).toBe(false);
    expect(rowMatches(shown, 'clutch:starboard:a3')).toBe(false);
  });
});
