import { describe, expect, it } from 'vitest';
import { initialState, reduce } from '../src/app/store';
import { parseUrlState } from '../src/app/urlState';
import { ALERT_KINDS } from '../src/model/alerts';
import {
  EXERCISES,
  EXERCISE_TEXTS,
  checkPasses,
  checkTargets,
  targetReading,
  twaSignedDeg,
  type CheckContext,
  type CheckSource,
  type ExerciseCheck,
} from '../src/model/exercises';
import { mpsToKn } from '../src/model/angles';
import exercisesFile from '../content/exercises/exercises.json';

const OPENS = ['ropes', 'autopilot', 'engine', 'sails'];
const GROUPS = ['sailing', 'wind', 'sails'];
// The check fields known so far (M66); later milestones add theirs and this list.
const FIELDS = [
  'twaDeg',
  'tack',
  'mainTrim',
  'jibTrim',
  'controls',
  'speedKn',
  'heelDeg',
  'boomDeg',
  'event',
  'gusts',
  'mainOutPct',
  'jibOutPct',
];
const EVENTS = ['tack', 'tackByHand', 'controlledGybe', 'accidentalGybe'];

function checkProblems(check: ExerciseCheck): string[] {
  const problems: string[] = [];
  for (const [field, value] of Object.entries(check)) {
    if (!FIELDS.includes(field)) problems.push(`unknown field ${field}`);
    if (field === 'event' && !EVENTS.includes(value as string)) problems.push('unknown event');
    const ranges: unknown[] =
      field === 'controls'
        ? Object.values(value as object)
        : ['twaDeg', 'speedKn', 'heelDeg', 'boomDeg', 'mainOutPct', 'jibOutPct'].includes(field)
          ? [value]
          : [];
    for (const range of ranges) {
      const r = range as number[];
      if (!Array.isArray(r) || r.length !== 2 || !((r[0] ?? 0) <= (r[1] ?? 0)))
        problems.push(`bad range in ${field}`);
    }
  }
  return problems;
}

describe('exercise data (PHASE10_SPEC 6.7 test 1)', () => {
  it('has valid ids, groups, ropes, checks and mistakes', () => {
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
    for (const exercise of EXERCISES) {
      expect(GROUPS).toContain(exercise.group);
      expect(['easy', 'realistic']).toContain(exercise.ropes);
      const stepIds = exercise.steps.map((s) => s.id);
      expect(new Set(stepIds).size).toBe(stepIds.length);
      for (const s of exercise.steps) {
        expect(OPENS).toContain(s.opens);
        expect(checkProblems(s.check)).toEqual([]);
      }
      for (const mistake of exercise.mistakes) {
        if ('alert' in mistake.on) expect(ALERT_KINDS).toContain(mistake.on.alert);
        else expect(checkProblems(mistake.on.condition)).toEqual([]);
        for (const id of mistake.steps ?? []) expect(stepIds).toContain(id);
      }
    }
    expect(exercisesFile.schemaVersion).toBe(1);
  });

  it('every start link parses, with the wind it names', () => {
    for (const exercise of EXERCISES) {
      const params = new URLSearchParams(exercise.start);
      const state = parseUrlState(exercise.start);
      expect(state.controls.ctl_wind_speed).toBe(Number(params.get('ws')));
      expect(state.controls.ctl_wind_dir).toBe(Number(params.get('wd')));
    }
  });
});

describe('exercise texts (test 2)', () => {
  const keysOf = (object: Record<string, unknown>, prefix = ''): string[] =>
    Object.entries(object).flatMap(([key, value]) =>
      typeof value === 'object' && value !== null
        ? keysOf(value as Record<string, unknown>, `${prefix}${key}.`)
        : [`${prefix}${key}`],
    );

  it('has every key in en and ru, in the same order, none empty', () => {
    const en = EXERCISE_TEXTS['en'] as Record<string, unknown>;
    const ru = EXERCISE_TEXTS['ru'] as Record<string, unknown>;
    expect(en['$status']).toBe('source');
    expect(ru['$status']).toBe('draft');
    expect(keysOf(ru)).toEqual(keysOf(en));
    for (const file of [en, ru]) {
      for (const exercise of EXERCISES) {
        const text = file[exercise.id] as {
          steps: Record<string, unknown>;
          mistakes: Record<string, unknown>;
        };
        expect(Object.keys(text.steps)).toEqual(exercise.steps.map((s) => s.id));
        expect(Object.keys(text.mistakes)).toEqual(exercise.mistakes.map((m) => m.id));
      }
    }
    const hasEmpty = (object: Record<string, unknown>): boolean =>
      Object.values(object).some((v) =>
        typeof v === 'object' && v !== null ? hasEmpty(v as Record<string, unknown>) : v === '',
      );
    expect(hasEmpty(en)).toBe(false);
    expect(hasEmpty(ru)).toBe(false);
  });
});

describe('twaSignedDeg (test 3)', () => {
  const at = (heading: number) => {
    const s = parseUrlState('?wd=0&ws=12');
    return twaSignedDeg({ wind: s.wind, boat: { ...s.boat, headingDeg: heading } });
  };
  it('is + for wind from starboard', () => {
    expect(at(315)).toBeCloseTo(45);
    expect(at(45)).toBeCloseTo(-45);
    expect(Math.abs(at(180))).toBeCloseTo(180);
  });
});

describe('checkPasses (test 4)', () => {
  // Wind from 0, heading 315: twa +45, close-hauled; settled with the rig stepped.
  function source(heading: number, query = '?wd=0&ws=12&ms=12&js=30'): CheckSource {
    let state = parseUrlState(`${query}&hdg=${heading}`);
    for (let i = 0; i < 20; i += 1) state = reduce(state, { type: 'step', dt: 0.05 });
    return state;
  }
  const none: CheckContext = { events: [], gusts: 0 };
  const motionOf = (s: CheckSource): CheckSource => s;

  it('uses the absolute angle and the sign', () => {
    const s = motionOf(source(315));
    expect(checkPasses({ twaDeg: [38, 52] }, s, none)).toBe(true);
    expect(checkPasses({ tack: 'starboard' }, s, none)).toBe(true);
    expect(checkPasses({ tack: 'port' }, s, none)).toBe(false);
    const port = motionOf(source(45));
    expect(checkPasses({ twaDeg: [38, 52], tack: 'port' }, port, none)).toBe(true);
    expect(checkPasses({ tack: 'starboard' }, port, none)).toBe(false);
  });

  it('control ranges include both ends; an empty check passes with motion', () => {
    const s = motionOf(source(315));
    const sheet = s.controls.ctl_mainsheet;
    expect(checkPasses({ controls: { ctl_mainsheet: [sheet, sheet] } }, s, none)).toBe(true);
    expect(checkPasses({ controls: { ctl_mainsheet: [sheet + 1, 100] } }, s, none)).toBe(false);
    expect(checkPasses({}, s, none)).toBe(true);
  });

  it('reads the speed signed, and fails without motion', () => {
    const s = motionOf(source(315));
    const back = { ...s, boat: { ...s.boat, speedMps: -0.5144 } };
    expect(mpsToKn(back.boat.speedMps)).toBeCloseTo(-1, 1);
    expect(checkPasses({ speedKn: [-99, 1] }, back, none)).toBe(true);
    expect(checkPasses({ speedKn: [1.5, 99] }, back, none)).toBe(false);
    expect(checkPasses({}, { ...s, motion: null }, none)).toBe(false);
    expect(initialState().motion).toBeNull();
  });
});

describe('Russian exercise texts', () => {
  it('have no Latin letters (the boat’s own printed words would go to latin-words.json)', () => {
    const ru = EXERCISE_TEXTS['ru'] as Record<string, unknown>;
    const strings = (value: unknown): string[] =>
      typeof value === 'string'
        ? [value]
        : typeof value === 'object' && value !== null
          ? Object.entries(value).flatMap(([key, v]) => (key.startsWith('$') ? [] : strings(v)))
          : [];
    expect(strings(ru).filter((text) => /[A-Za-z]/.test(text))).toEqual([]);
  });
});

describe('sections and targets (owner, PR 144)', () => {
  const SECTIONS = [
    'ropes',
    'helm',
    'sails',
    'autopilot',
    'engine',
    'conditions',
    'learn',
    'place',
    'anchor',
    'harbour',
    'status',
  ];

  it('every exercise names the sections it keeps, from the known ones, each once', () => {
    for (const exercise of EXERCISES) {
      expect(exercise.sections.length, exercise.id).toBeGreaterThan(0);
      expect(new Set(exercise.sections).size).toBe(exercise.sections.length);
      for (const id of exercise.sections) expect(SECTIONS, `${exercise.id}: ${id}`).toContain(id);
    }
  });

  it('every step has at least one target row, in the order twa, tack, trim, controls', () => {
    const points = EXERCISES.find((e) => e.id === 'points-of-sail');
    expect(points).toBeDefined();
    for (const step of points?.steps ?? []) {
      expect(checkTargets(step.check).length, step.id).toBeGreaterThan(0);
    }
    const first = checkTargets(points?.steps[0]?.check ?? {});
    expect(first.map((row) => row.kind)).toEqual(['twa', 'tack', 'trim', 'trim']);
    const beam = checkTargets(points?.steps[2]?.check ?? {});
    expect(beam.map((row) => row.kind)).toEqual(['twa', 'tack', 'trim', 'control']);
  });

  it('reads each row from the state: the wind angle, the tack, a control', () => {
    let state = parseUrlState('?wd=0&ws=12&ms=12&js=30&hdg=315');
    for (let i = 0; i < 20; i += 1) state = reduce(state, { type: 'step', dt: 0.05 });
    const twa = targetReading({ kind: 'twa', range: [38, 52] }, state);
    expect(twa).toEqual({ ok: true, value: 45 });
    expect(targetReading({ kind: 'twa', range: [58, 72] }, state)?.ok).toBe(false);
    expect(targetReading({ kind: 'tack', side: 'starboard' }, state)).toEqual({
      ok: true,
      value: 'starboard',
    });
    expect(targetReading({ kind: 'tack', side: 'port' }, state)?.ok).toBe(false);
    expect(targetReading({ kind: 'control', id: 'ctl_mainsheet', range: [10, 14] }, state)).toEqual(
      { ok: true, value: 12 },
    );
    expect(targetReading({ kind: 'twa', range: [0, 180] }, { ...state, motion: null })).toBeNull();
  });
});
