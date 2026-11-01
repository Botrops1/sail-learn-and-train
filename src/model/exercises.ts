import data from '../../content/exercises/exercises.json';
import { mpsToKn, wrap180 } from './angles';
import type { AlertEntry, AlertKind } from './alerts';
import type { Controls, ControlId } from './controls';
import type { EngineState } from './engine';
import type { BoatState, MotionReport } from './motion';
import type { RealisticAction } from './realistic';
import type { RopesMode } from './settings';
import type { RigState } from './sim';
import { sailTrim, type TrimState } from './trim';
import type { WindNow } from './windModes';

/**
 * The exercises (PHASE10_SPEC 4.1, 4.4): the language-neutral data of
 * content/exercises/exercises.json, the checks that read the app's state, and the texts. Pure.
 */
export type Range = readonly [number, number];
export type ExerciseGroup = 'sailing' | 'wind' | 'sails';
/** The section "Show the controls" opens (a subset of the panel's section ids). */
export type ExerciseOpens = 'ropes' | 'autopilot' | 'engine' | 'sails';
export type ExerciseEvent = 'tack' | 'tackByHand' | 'controlledGybe' | 'accidentalGybe';

export interface ExerciseCheck {
  twaDeg?: Range;
  tack?: 'port' | 'starboard';
  mainTrim?: readonly TrimState[];
  jibTrim?: readonly TrimState[];
  controls?: Partial<Record<ControlId, Range>>;
  speedKn?: Range;
  heelDeg?: Range;
  boomDeg?: Range;
  event?: ExerciseEvent;
  gusts?: number;
  mainOutPct?: Range;
  jibOutPct?: Range;
  engine?: { running?: boolean; gear?: 'ahead' | 'neutral' | 'astern' };
}
export interface ExerciseStep {
  id: string;
  opens: ExerciseOpens;
  holdS: number;
  check: ExerciseCheck;
}
export type MistakeTrigger =
  { alert: AlertKind; accidental?: boolean } | { condition: ExerciseCheck; forS: number };
export interface ExerciseMistake {
  id: string;
  serious: boolean;
  steps?: readonly string[];
  on: MistakeTrigger;
}
/** The panel sections an exercise may keep (the Mode, Exercises and Settings sections always stay). */
export type ExerciseSection =
  | 'ropes'
  | 'helm'
  | 'sails'
  | 'autopilot'
  | 'engine'
  | 'conditions'
  | 'learn'
  | 'place'
  | 'anchor'
  | 'harbour'
  | 'status';
export interface ExerciseDef {
  id: string;
  group: ExerciseGroup;
  ropes: RopesMode;
  crew: boolean;
  /** Owner, PR 144: the sections the exercise shows; every other section is hidden while it runs. */
  sections: readonly ExerciseSection[];
  start: string;
  steps: readonly ExerciseStep[];
  mistakes: readonly ExerciseMistake[];
}
export interface ExerciseSettings {
  settleS: number;
  mistakeRepeatGapS: number;
  mistakeShowS: number;
  causeWindowS: number;
  causeMax: number;
  controlMergeS: number;
  logMax: number;
  gust: { risePct: number; rearmPct: number };
}
/** What the checks read; `AppState` has all of it. */
export interface CheckSource {
  wind: WindNow;
  boat: BoatState;
  motion: MotionReport | null;
  rig: RigState;
  controls: Controls;
  engine: EngineState;
}
export interface CheckContext {
  events: readonly ExerciseEvent[];
  gusts: number;
}
export interface ExerciseText {
  title: string;
  summary: string;
  see: string;
  happening: string;
  action: string;
  mistake: string;
  done: string;
  steps: Readonly<Record<string, { goal: string; how: string }>>;
  mistakes: Readonly<Record<string, { name: string; what: string; why: string; fix: string }>>;
}

export type LoggedAction =
  | { type: 'control'; id: ControlId; from: number; to: number }
  | { type: 'autopilot'; command: 'off' | 'heading' | 'wind' | 'tack'; turnDeg?: undefined }
  | { type: 'autopilot'; command: 'turn'; turnDeg: number }
  | { type: 'engine'; command: 'start' | 'stop' }
  | { type: 'engine'; command: 'lever'; leverPct: number }
  | { type: 'realistic'; gesture: RealisticAction['type']; target: string | null };

/** The log the debrief is made from (M66 writes start, step, finish; M67 mistake, back; M68 action, event). */
export type ExerciseLogEntry =
  | { kind: 'start'; atS: number; step: number }
  | { kind: 'step'; atS: number; step: number; stepId: string }
  | { kind: 'finish'; atS: number }
  | { kind: 'mistake'; atS: number; step: number; mistakeId: string; serious: boolean }
  | { kind: 'back'; atS: number; step: number }
  | { kind: 'event'; atS: number; entry: AlertEntry }
  | { kind: 'action'; atS: number; action: LoggedAction };

const file = data as unknown as {
  settings: ExerciseSettings;
  exercises: ExerciseDef[];
};

export const EXERCISES: readonly ExerciseDef[] = file.exercises;
export const EXERCISE_SETTINGS: ExerciseSettings = file.settings;

export function exerciseDef(id: string): ExerciseDef | undefined {
  return EXERCISES.find((exercise) => exercise.id === id);
}

/** Wind direction minus heading, (−180, 180]; + = wind from starboard (PHASE10_SPEC 3.1). */
export function twaSignedDeg(source: Pick<CheckSource, 'wind' | 'boat'>): number {
  return wrap180(source.wind.dirDeg - source.boat.headingDeg);
}

function inRange(value: number, range: Range): boolean {
  return value >= range[0] && value <= range[1];
}

/** True when every field of the check holds (PHASE10_SPEC 4.4); false while there is no motion yet. */
export function checkPasses(
  check: ExerciseCheck,
  source: CheckSource,
  context: CheckContext,
): boolean {
  const { motion } = source;
  if (motion === null) return false;
  const twa = twaSignedDeg(source);
  if (check.twaDeg && !inRange(Math.abs(twa), check.twaDeg)) return false;
  if (check.tack === 'starboard' && !(twa > 0)) return false;
  if (check.tack === 'port' && !(twa < 0)) return false;
  if (
    check.mainTrim &&
    !check.mainTrim.includes(sailTrim('main', source.rig, motion.awaDeg).state)
  ) {
    return false;
  }
  if (check.jibTrim && !check.jibTrim.includes(sailTrim('jib', source.rig, motion.awaDeg).state)) {
    return false;
  }
  if (check.controls) {
    for (const [id, range] of Object.entries(check.controls) as [ControlId, Range][]) {
      if (!inRange(source.controls[id], range)) return false;
    }
  }
  if (check.speedKn && !inRange(mpsToKn(source.boat.speedMps), check.speedKn)) return false;
  if (check.heelDeg && !inRange(Math.abs(source.boat.heelDeg), check.heelDeg)) return false;
  if (check.boomDeg && !inRange(Math.abs(source.rig.solution.thetaDeg), check.boomDeg)) {
    return false;
  }
  if (check.event && !context.events.includes(check.event)) return false;
  if (check.gusts !== undefined && !(context.gusts >= check.gusts)) return false;
  if (check.mainOutPct && !inRange(source.rig.applied.mainFurl, check.mainOutPct)) return false;
  if (check.jibOutPct && !inRange(100 * source.rig.jibSolution.unfurled, check.jibOutPct)) {
    return false;
  }
  if (check.engine) {
    if (check.engine.running !== undefined && source.engine.running !== check.engine.running) {
      return false;
    }
    if (check.engine.gear !== undefined && source.engine.gear !== check.engine.gear) return false;
  }
  return true;
}

/** One line of "what to reach" for a step (owner, PR 144), made from the step's check. */
export type TargetRow =
  | { kind: 'twa'; range: Range }
  | { kind: 'tack'; side: 'port' | 'starboard' }
  | { kind: 'trim'; sail: 'main' | 'jib'; states: readonly TrimState[] }
  | { kind: 'control'; id: ControlId; range: Range };

/** The rows of a check, in the order a learner reads them (the fields of M66). */
export function checkTargets(check: ExerciseCheck): TargetRow[] {
  const rows: TargetRow[] = [];
  if (check.twaDeg) rows.push({ kind: 'twa', range: check.twaDeg });
  if (check.tack) rows.push({ kind: 'tack', side: check.tack });
  if (check.mainTrim) rows.push({ kind: 'trim', sail: 'main', states: check.mainTrim });
  if (check.jibTrim) rows.push({ kind: 'trim', sail: 'jib', states: check.jibTrim });
  for (const [id, range] of Object.entries(check.controls ?? {}) as [ControlId, Range][]) {
    rows.push({ kind: 'control', id, range });
  }
  return rows;
}

/** What a target row reads now: whether it holds, and the number or word to show beside it. */
export interface TargetReading {
  ok: boolean;
  /** The wind angle or control value, rounded; or the trim state or the tack side. */
  value: number | string;
}

export function targetReading(row: TargetRow, source: CheckSource): TargetReading | null {
  const { motion } = source;
  if (motion === null) return null;
  const twa = twaSignedDeg(source);
  switch (row.kind) {
    case 'twa':
      return { ok: inRange(Math.abs(twa), row.range), value: Math.round(Math.abs(twa)) };
    case 'tack': {
      const side = twa > 0 ? 'starboard' : 'port';
      return { ok: side === row.side, value: side };
    }
    case 'trim': {
      const state = sailTrim(row.sail, source.rig, motion.awaDeg).state;
      return { ok: row.states.includes(state), value: state };
    }
    case 'control': {
      const value = source.controls[row.id];
      return { ok: inRange(value, row.range), value: Math.round(value) };
    }
  }
}

const textFiles = import.meta.glob<Record<string, unknown>>('../../content/lang/*/exercises.json', {
  eager: true,
  import: 'default',
});

/** Every content/lang/<code>/exercises.json, by code (the folder name). */
export const EXERCISE_TEXTS: Readonly<Record<string, Record<string, unknown>>> = Object.fromEntries(
  Object.entries(textFiles).flatMap(([path, file]) => {
    const code = /lang\/([^/]+)\/exercises\.json$/.exec(path)?.[1];
    return code ? [[code, file]] : [];
  }),
);

/** The texts of one exercise in a language; English where the language has none. */
export function exerciseText(id: string, language: string): ExerciseText {
  const own = EXERCISE_TEXTS[language]?.[id];
  const source = own ?? EXERCISE_TEXTS['en']?.[id];
  return source as ExerciseText;
}
