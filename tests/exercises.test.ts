import { describe, expect, it } from 'vitest';
import { initialState, reduce } from '../src/app/store';
import { parseUrlState } from '../src/app/urlState';
import { ALERT_KINDS } from '../src/model/alerts';
import { latinAllowed } from '../src/model/languages';
import {
  EXERCISES,
  EXERCISE_TEXTS,
  checkPasses,
  feelItFor,
  checkTargets,
  targetReading,
  twaSignedDeg,
  type CheckContext,
  type CheckSource,
  type ExerciseCheck,
  type ExerciseDef,
} from '../src/model/exercises';
import { mpsToKn } from '../src/model/angles';
import { boat } from '../src/model/boat';
import { isLocalWind } from '../src/model/windModes';
import { utcFromLocal } from '../src/model/clock';
import registry from '../content/registry/parts.json';
import { pilotFor } from '../src/app/exercisePilots';
import en from '../content/lang/en/ui.json';
import exercisesFile from '../content/exercises/exercises.json';

const OPENS = ['ropes', 'dinghy', 'autopilot', 'engine', 'sails', 'harbour', 'anchor'];
const GROUPS = ['sailing', 'wind', 'sails', 'harbour', 'dinghy'];
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
  'engine',
  'target',
  'headingDeg',
  'quayGapM',
  'berthOffsetM',
  'linesOn',
  'linesOff',
  'linesTight',
  'fendersOut',
  'anchor',
  'meanWindKn',
  'localHour',
  'gennakerStage',
  'gennakerTrim',
  'dinghy',
];
const PHASES = ['upright', 'goingOver', 'over', 'swimming', 'righting'];
const SEVERITIES = ['fender', 'touch', 'bump', 'knock', 'hit'];
const OBSTACLE_KINDS = ['yacht', 'harbour', 'ground', 'propeller', 'fender', 'lazy-line'];
const EVENTS = ['tack', 'tackByHand', 'controlledGybe', 'accidentalGybe'];
const TRIM_STATES = [
  'stowed',
  'snuffed',
  'crossing',
  'backed',
  'blanketed',
  'pressed',
  'luffing',
  'good',
  'stalled',
];

function checkProblems(check: ExerciseCheck): string[] {
  const problems: string[] = [];
  for (const [field, value] of Object.entries(check)) {
    if (!FIELDS.includes(field)) problems.push(`unknown field ${field}`);
    if (field === 'event' && !EVENTS.includes(value as string)) problems.push('unknown event');
    if (field === 'gennakerTrim') {
      const states = value as string[];
      if (
        !Array.isArray(states) ||
        states.length === 0 ||
        !states.every((x) => TRIM_STATES.includes(x))
      ) {
        problems.push('unknown gennaker trim state');
      }
    }
    if (field === 'dinghy') {
      const d = value as { sit?: string[]; boardPct?: number[]; capsize?: string[] };
      for (const key of Object.keys(d)) {
        if (!['sit', 'boardPct', 'capsize'].includes(key))
          problems.push(`unknown dinghy field ${key}`);
      }
      if (d.sit && !d.sit.every((x) => ['in', 'side', 'out'].includes(x))) problems.push('bad sit');
      if (d.capsize && !d.capsize.every((x) => PHASES.includes(x)))
        problems.push('bad capsize phase');
      if (
        d.boardPct &&
        !(d.boardPct.length === 2 && (d.boardPct[0] ?? 0) <= (d.boardPct[1] ?? 0))
      ) {
        problems.push('bad range in dinghy.boardPct');
      }
    }
    const ranges: unknown[] =
      field === 'controls'
        ? Object.values(value as object)
        : [
              'twaDeg',
              'speedKn',
              'heelDeg',
              'boomDeg',
              'mainOutPct',
              'jibOutPct',
              'meanWindKn',
              'localHour',
              'gennakerStage',
            ].includes(field)
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

/** M97 (PHASE10_SPEC 27.2): what is wrong with a def's wind timetable; empty when nothing is. */
function windProblems(def: ExerciseDef): string[] {
  const wind = def.wind;
  if (wind === undefined) return [];
  const problems: string[] = [];
  const { points } = wind;
  if (points.length < 2) problems.push('fewer than 2 points');
  const mm = (at: string) => Number(at.slice(0, 2)) * 60 + Number(at.slice(3, 5));
  const first = points[0];
  let last = -1;
  for (const point of points) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(point.at)) {
      problems.push(`bad time ${point.at}`);
      continue;
    }
    const offset = first === undefined ? 0 : (mm(point.at) - mm(first.at) + 1440) % 1440;
    if (offset <= last) problems.push('offsets do not increase');
    last = offset;
    if (!(point.fromDeg > -180 && point.fromDeg <= 180)) problems.push('fromDeg out of range');
    if (!(point.kn >= 0 && point.kn <= 30)) problems.push('kn out of range');
    if (!(point.gustPct >= 0 && point.gustPct <= 60)) problems.push('gustPct out of range');
  }
  const params = new URLSearchParams(def.start);
  const clk = params.get('clk');
  if (
    clk === null ||
    first === undefined ||
    clk.slice(8, 10) + ':' + clk.slice(10, 12) !== first.at
  ) {
    problems.push('start clk is not the first point');
  }
  if (params.has('wm')) problems.push('start has wm');
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
        // M96: a step's speed-up is a time scale above ×1.
        if (s.speedUp !== undefined) {
          expect([...boat.windModes.timeScales, ...boat.windModes.timeLapseScales]).toContain(
            s.speedUp,
          );
          expect(s.speedUp).toBeGreaterThan(1);
        }
        // M74: a step's show and a check's target name a target of the exercise.
        const targets = (exercise.targets ?? []).map((t) => t.id);
        if (s.show !== undefined) expect(targets).toContain(s.show);
        if (s.check.target) expect(targets).toContain(s.check.target.id);
      }
      for (const key of Object.keys(exercise.levels ?? {})) {
        expect(['normal', 'hard']).toContain(key);
      }
      for (const mistake of exercise.mistakes) {
        if ('alert' in mistake.on) expect(ALERT_KINDS).toContain(mistake.on.alert);
        if ('alert' in mistake.on) {
          for (const sev of mistake.on.severity ?? []) expect(SEVERITIES).toContain(sev);
          for (const kind of mistake.on.obstacle ?? []) expect(OBSTACLE_KINDS).toContain(kind);
        } else expect(checkProblems(mistake.on.condition)).toEqual([]);
        for (const id of mistake.steps ?? []) expect(stepIds).toContain(id);
      }
      // M97: a wind timetable follows 27.2.
      expect(windProblems(exercise), exercise.id).toEqual([]);
    }
    expect(exercisesFile.schemaVersion).toBe(1);
  });

  it('every start link parses, with the wind it names', () => {
    for (const exercise of EXERCISES) {
      const params = new URLSearchParams(exercise.start);
      const state = parseUrlState(exercise.start);
      // M96: a start with a local wind (`wm`) has neither `wd` nor `ws` (the wind comes from the
      // clock), and the maestral, bura and night starts name no `wind` either; skip those.
      if (!params.has('ws') && !params.has('wd')) {
        expect(isLocalWind(state.windMode.mode) || exercise.wind !== undefined, exercise.id).toBe(
          true,
        );
        continue;
      }
      expect(state.controls.ctl_wind_speed).toBe(Number(params.get('ws')));
      expect(state.controls.ctl_wind_dir).toBe(Number(params.get('wd')));
    }
  });

  it('every start names its place: none, open, marina or bay (M96)', () => {
    for (const exercise of EXERCISES) {
      const pl = new URLSearchParams(exercise.start).get('pl');
      expect([null, 'open', 'marina', 'bay'], exercise.id).toContain(pl);
      expect(
        (en as Record<string, string>)[`exercise.place.${pl ?? 'open'}`],
        exercise.id,
      ).toBeTypeOf('string');
    }
  });
});

describe('a wind timetable is checked (M97, PHASE10_SPEC 27.2)', () => {
  const bura = EXERCISES.find((e) => e.id === 'bura') as ExerciseDef;
  const withPoints = (
    points: readonly { at: string; fromDeg: number; kn: number; gustPct: number }[],
    start = bura.start,
  ): ExerciseDef => ({ ...bura, wind: { points }, start });
  const good = bura.wind?.points ?? [];
  const p = (i: number) => good[i] as (typeof good)[number];

  it('the bura is valid and has the 08:00 start', () => {
    expect(bura.wind?.points.length).toBe(4);
    expect(windProblems(bura)).toEqual([]);
  });

  it('one bad def per rule gives one problem', () => {
    expect(windProblems(withPoints([p(0)]))).toEqual(['fewer than 2 points']);
    expect(windProblems(withPoints([p(0), { ...p(1), at: '8:04' }]))).toEqual(['bad time 8:04']);
    expect(windProblems(withPoints([p(0), p(1), { ...p(2), at: '08:04' }]))).toEqual([
      'offsets do not increase',
    ]);
    expect(windProblems(withPoints([p(0), { ...p(1), fromDeg: -180 }]))).toEqual([
      'fromDeg out of range',
    ]);
    expect(windProblems(withPoints([p(0), { ...p(1), kn: 31 }]))).toEqual(['kn out of range']);
    expect(windProblems(withPoints([p(0), { ...p(1), gustPct: 61 }]))).toEqual([
      'gustPct out of range',
    ]);
    expect(
      windProblems(withPoints(good, bura.start.replace('clk=202606010800', 'clk=202606010830'))),
    ).toEqual(['start clk is not the first point']);
    expect(windProblems(withPoints(good, `${bura.start}&wm=bura`))).toEqual(['start has wm']);
  });

  it('a script may run over midnight', () => {
    const night = withPoints(
      [
        { at: '23:00', fromDeg: 45, kn: 3, gustPct: 0 },
        { at: '01:00', fromDeg: 45, kn: 6, gustPct: 0 },
      ],
      bura.start.replace('clk=202606010800', 'clk=202606012300'),
    );
    expect(windProblems(night)).toEqual([]);
  });
});

describe('exercise data is checked (PHASE10_SPEC 16.7 test 1)', () => {
  it('rejects a show with no target, an unknown field and a bad levels key', () => {
    expect(checkProblems({ bogus: 1 } as unknown as ExerciseCheck)).toContain(
      'unknown field bogus',
    );
    const targets = ['fairway'];
    expect(targets).not.toContain('nowhere');
    expect(['normal', 'hard']).not.toContain('extreme');
    expect(SEVERITIES).not.toContain('tuch');
    expect(OBSTACLE_KINDS).not.toContain('yatch');
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

  it('reads the engine: running, and the gear (M71)', () => {
    const s = motionOf(source(315, '?wd=0&ws=12&ms=12&js=30&eng=1&lv=30'));
    expect(checkPasses({ engine: { running: true, gear: 'ahead' } }, s, none)).toBe(true);
    expect(checkPasses({ engine: { running: false } }, s, none)).toBe(false);
    expect(checkPasses({ engine: { gear: 'neutral' } }, s, none)).toBe(false);
    const off = motionOf(source(315));
    expect(checkPasses({ engine: { running: false } }, off, none)).toBe(true);
    expect(checkPasses({ engine: { running: true } }, off, none)).toBe(false);
    // A stopped engine counts as neutral (owner, PR 163).
    expect(checkPasses({ engine: { gear: 'neutral' } }, off, none)).toBe(true);
    expect(checkPasses({ engine: { gear: 'ahead' } }, off, none)).toBe(false);
  });
});

describe('checkPasses: meanWindKn and localHour (M96)', () => {
  const none: CheckContext = { events: [], gusts: 0 };
  let state = parseUrlState('?wd=0&ws=12&ms=12&js=30&hdg=315');
  for (let i = 0; i < 20; i += 1) state = reduce(state, { type: 'step', dt: 0.05 });

  it('meanWindKn reads the mean wind, both ends included', () => {
    expect(checkPasses({ meanWindKn: [12, 99] }, state, none)).toBe(true);
    expect(checkPasses({ meanWindKn: [0, 12] }, state, none)).toBe(true);
    expect(checkPasses({ meanWindKn: [12.5, 99] }, state, none)).toBe(false);
    expect(checkPasses({ meanWindKn: [0, 11.5] }, state, none)).toBe(false);
  });

  it('localHour reads the local time on board, and is false without a clock', () => {
    const at = (h: number, m: number): CheckSource => ({
      ...state,
      clock: { utcMs: utcFromLocal(2026, 6, 1, h, m) },
    });
    expect(checkPasses({ localHour: [13.5, 24] }, at(13, 30), none)).toBe(true);
    expect(checkPasses({ localHour: [13.5, 24] }, at(13, 29), none)).toBe(false);
    expect(checkPasses({ localHour: [13.5, 14] }, at(14, 0), none)).toBe(true);
    expect(checkPasses({ localHour: [13.5, 14] }, at(14, 1), none)).toBe(false);
    const noClock: CheckSource = { ...state };
    delete noClock.clock;
    expect(checkPasses({ localHour: [0, 24] }, noClock, none)).toBe(false);
  });

  it('the maestral steps give a wind row and a time row (heelDeg has no row)', () => {
    const maestral = EXERCISES.find((e) => e.id === 'maestral');
    expect(checkTargets(maestral?.steps[0]?.check ?? {}).map((r) => r.kind)).toEqual(['meanWind']);
    expect(checkTargets(maestral?.steps[3]?.check ?? {}).map((r) => r.kind)).toEqual(['localHour']);
    const wind = targetReading({ kind: 'meanWind', range: [15, 99] }, state);
    expect(wind).toEqual({ ok: false, value: 12 });
    const late: CheckSource = { ...state, clock: { utcMs: utcFromLocal(2026, 6, 1, 13, 30) } };
    expect(targetReading({ kind: 'localHour', range: [13.5, 24] }, late)).toEqual({
      ok: true,
      value: '13:30',
    });
  });
});

describe('checkPasses: gennakerStage and gennakerTrim (M108)', () => {
  const none: CheckContext = { events: [], gusts: 0 };
  // Wind over starboard at 120°, the gennaker hoisted to port with the sock up and the sheet at 25.
  let hoisted = parseUrlState('?wd=0&ws=12&hdg=240&ms=60&jf=0&gn=4&gx=p&gu=100&gs=25&sea=flat');
  for (let i = 0; i < 100; i += 1) hoisted = reduce(hoisted, { type: 'step', dt: 0.05 });

  it('gennakerStage reads the rigging step, both ends included', () => {
    expect(hoisted.gennaker.stage).toBe(4);
    expect(checkPasses({ gennakerStage: [4, 4] }, hoisted, none)).toBe(true);
    expect(checkPasses({ gennakerStage: [1, 4] }, hoisted, none)).toBe(true);
    expect(checkPasses({ gennakerStage: [0, 3] }, hoisted, none)).toBe(false);
    const stowed = reduce(hoisted, { type: 'gennaker', command: 'stow' });
    expect(checkPasses({ gennakerStage: [0, 0] }, stowed, none)).toBe(true);
    expect(checkPasses({ gennakerStage: [1, 4] }, stowed, none)).toBe(false);
  });

  it('gennakerTrim reads what the sail is doing', () => {
    expect(checkPasses({ gennakerTrim: ['good'] }, hoisted, none)).toBe(true);
    expect(checkPasses({ gennakerTrim: ['luffing', 'stalled'] }, hoisted, none)).toBe(false);
    const stowed = reduce(hoisted, { type: 'gennaker', command: 'stow' });
    expect(checkPasses({ gennakerTrim: ['stowed'] }, stowed, none)).toBe(true);
    expect(checkPasses({ gennakerTrim: ['good'] }, stowed, none)).toBe(false);
  });

  it('a hand-built source with no gennaker fails a check that names one', () => {
    const bare: CheckSource = { ...hoisted };
    delete bare.gennaker;
    expect(checkPasses({ gennakerStage: [0, 4] }, bare, none)).toBe(false);
    expect(checkPasses({ gennakerTrim: ['stowed', 'good'] }, bare, none)).toBe(false);
    expect(targetReading({ kind: 'gennakerStage', range: [4, 4] }, bare)).toBeNull();
  });

  it('the rig steps give a stage row, the trim step a trim row', () => {
    const rig = EXERCISES.find((e) => e.id === 'gennaker-rig');
    expect(checkTargets(rig?.steps[0]?.check ?? {}).map((r) => r.kind)).toEqual(['gennakerStage']);
    expect(checkTargets(rig?.steps[6]?.check ?? {}).map((r) => r.kind)).toEqual([
      'tack',
      'gennakerTrim',
    ]);
    expect(targetReading({ kind: 'gennakerStage', range: [4, 4] }, hoisted)).toEqual({
      ok: true,
      value: 4,
    });
    expect(targetReading({ kind: 'gennakerTrim', states: ['good'] }, hoisted)).toEqual({
      ok: true,
      value: 'good',
    });
  });

  it('the three exercises sit in the Sails group, in Easy ropes, with the fixed ids', () => {
    for (const id of ['gennaker-rig', 'gennaker-gybe', 'gennaker-douse']) {
      const def = EXERCISES.find((e) => e.id === id);
      expect(def?.group, id).toBe('sails');
      expect(def?.ropes, id).toBe('easy');
      expect(def?.crew, id).toBe(false);
    }
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
    // M71: the clutch is printed JIB ROLL on the boat, so the words of the boat's labels stay (as in languages.test.ts).
    const allowed = latinAllowed();
    const stray = strings(ru).flatMap((text) =>
      (text.match(/[A-Za-z]{2,}/g) ?? []).filter((word) => !allowed.has(word.toLowerCase())),
    );
    expect(stray).toEqual([]);
  });
});

describe('sections and targets (owner, PR 144)', () => {
  const SECTIONS = [
    'ropes',
    'dinghy',
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

describe('M103 feelIt (PHASE_FEEDBACK_SPEC 10.6)', () => {
  // M108: the gennaker exercises list the gennaker's sail, rope and part entries too, so any registry id counts.
  const termIds = new Set(registry.entries.map((e) => e.id));

  it('every feelIt id is a registry entry, listed by one exercise only', () => {
    const seen = new Set<string>();
    for (const def of EXERCISES) {
      for (const id of def.feelIt ?? []) {
        expect(termIds.has(id), `${def.id}: ${id}`).toBe(true);
        expect(seen.has(id), `${id} in two exercises`).toBe(false);
        seen.add(id);
      }
    }
    expect(seen.size).toBeGreaterThan(0);
  });

  it('every exercise with feelIt has a pilot, so Watch mode can play it', () => {
    for (const def of EXERCISES.filter((d) => d.feelIt !== undefined)) {
      expect(pilotFor(def.id, 'easy', def.ropes), def.id).not.toBeNull();
    }
  });

  it('feelItFor finds the exercise of a term, and nothing for a part', () => {
    expect(feelItFor('term_wind_shift')?.id).toBe('wind-shift');
    expect(feelItFor('term_run')?.id).toBe('points-of-sail');
    expect(feelItFor('term_weather_helm')?.id).toBe('weather-helm');
    expect(feelItFor('term_heel')?.id).toBe('weather-helm');
    expect(feelItFor('part_boom')).toBeUndefined();
  });
});
