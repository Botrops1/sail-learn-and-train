import data from '../../content/exercises/exercises.json';
import { mpsToKn, wrap180 } from './angles';
import type { AlertEntry, AlertKind } from './alerts';
import type { Controls, ControlId } from './controls';
import type { AnchorPhase, AnchorState } from './anchor';
import { scopeNeededM } from './anchor';
import { boat as hanse508, type BoatData } from './boat';
import type { EngineState } from './engine';
import type { HarbourState } from './harbour';
import { insideRect, marinaGeometry, type Rect } from './marina';
import { canTighten, type LineCode, type LinesState } from './mooringLines';
import { area, type AreaData } from './area';
import type { Severity } from './contact';
import { depthAt } from './seabed';
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
export type ExerciseGroup = 'sailing' | 'wind' | 'sails' | 'harbour';
/** The section "Show the controls" opens (a subset of the panel's section ids). */
export type ExerciseOpens = 'ropes' | 'autopilot' | 'engine' | 'sails' | 'harbour' | 'anchor';
export type ExerciseLevel = 'easy' | 'normal' | 'hard';
export type BoatPoint = 'bow' | 'stern' | 'centre';
export type ObstacleKind = 'yacht' | 'harbour' | 'ground' | 'propeller' | 'fender' | 'lazy-line';
export type ExerciseTarget =
  | { id: string; shape: 'circle'; eastM: number; northM: number; radiusM: number }
  | { id: string; shape: 'fairway' }
  | { id: string; shape: 'berth' };
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
  target?: { id: string; point: BoatPoint; inside?: boolean };
  headingDeg?: { to: number; within: number };
  quayGapM?: Range;
  berthOffsetM?: Range;
  linesOn?: readonly LineCode[];
  linesOff?: readonly LineCode[];
  linesTight?: readonly LineCode[];
  fendersOut?: boolean;
  anchor?: { phase?: readonly AnchorPhase[]; chainOutM?: Range; scopeOk?: boolean };
}
export interface ExerciseStep {
  id: string;
  opens: ExerciseOpens;
  holdS: number;
  show?: string;
  check: ExerciseCheck;
}
export type MistakeTrigger =
  | {
      alert: AlertKind;
      accidental?: boolean;
      severity?: readonly Severity[];
      obstacle?: readonly ObstacleKind[];
    }
  | { condition: ExerciseCheck; forS: number };
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
  /** Query keys that replace the start's for that level; the start is Easy. */
  levels?: Partial<Record<'normal' | 'hard', string>>;
  targets?: readonly ExerciseTarget[];
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
  /** Optional so older hand-built sources compile; AppState has all three. */
  harbour?: HarbourState;
  lines?: LinesState;
  anchor?: AnchorState;
}
export interface CheckContext {
  events: readonly ExerciseEvent[];
  gusts: number;
  targets?: readonly ExerciseTarget[];
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
  | { type: 'realistic'; gesture: RealisticAction['type']; target: string | null; on?: boolean }
  | { type: 'line'; code: LineCode; command: 'take' | 'tighten' | 'ease' | 'letGo'; times?: number }
  | { type: 'thruster'; which: 'bow' | 'stern'; dir: -1 | 1 }
  | { type: 'windlass'; motion: 'down' | 'up' }
  | { type: 'fenders'; out: boolean };

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

/** A point of the boat on the map (PHASE10_SPEC 16.3): bow = the stem end, stern = the transom's middle, centre = the origin. */
export function boatPoint(
  boat: BoatState,
  point: BoatPoint,
  data: BoatData = hanse508,
): [number, number] {
  const x =
    point === 'centre'
      ? 0
      : point === 'stern'
        ? data.hull.transomX
        : data.hull.transomX + data.dimensions.loa;
  const h = (boat.headingDeg * Math.PI) / 180;
  return [boat.eastM + x * Math.sin(h), boat.northM + x * Math.cos(h)];
}

/** The kind of thing a damage report's obstacle is. */
export function obstacleKind(obstacleId: string): ObstacleKind {
  if (obstacleId.startsWith('yacht-')) return 'yacht';
  if (obstacleId === 'bottom' || obstacleId === 'land') return 'ground';
  if (obstacleId === 'propeller') return 'propeller';
  if (obstacleId === 'fender') return 'fender';
  if (obstacleId.startsWith('lazy-line')) return 'lazy-line';
  return 'harbour';
}

export type ResolvedTarget =
  | { shape: 'circle'; eastM: number; northM: number; radiusM: number }
  | { shape: 'rect'; rect: Rect };

export function resolveTarget(
  target: ExerciseTarget,
  harbour: HarbourState,
  areaData: AreaData = area,
): ResolvedTarget {
  if (target.shape === 'circle') {
    return { shape: 'circle', eastM: target.eastM, northM: target.northM, radiusM: target.radiusM };
  }
  const geometry = marinaGeometry(harbour.layout, harbour.traffic, areaData);
  if (target.shape === 'fairway') return { shape: 'rect', rect: geometry.fairway };
  const m = areaData.marina;
  const c = geometry.ourBerth.centreEastM;
  const w = geometry.ourBerth.widthM;
  const f = m.quayFaceNorthM;
  return {
    shape: 'rect',
    rect: {
      west: c - w / 2,
      east: c + w / 2,
      south: f - m.sternGapM - m.berthZoneM,
      north: f - m.sternGapM,
    },
  };
}

export function insideTarget(target: ResolvedTarget, eastM: number, northM: number): boolean {
  if (target.shape === 'circle') {
    return Math.hypot(eastM - target.eastM, northM - target.northM) <= target.radiusM;
  }
  return insideRect(target.rect, eastM, northM);
}

function quayGap(source: CheckSource): number | null {
  const { harbour } = source;
  if (!harbour || harbour.place !== 'marina') return null;
  return area.marina.quayFaceNorthM - boatPoint(source.boat, 'stern')[1];
}

function berthOffset(source: CheckSource): number | null {
  const { harbour } = source;
  if (!harbour || harbour.place !== 'marina') return null;
  const geometry = marinaGeometry(harbour.layout, harbour.traffic);
  return Math.abs(boatPoint(source.boat, 'stern')[0] - geometry.ourBerth.centreEastM);
}

function harbourFieldsPass(
  check: ExerciseCheck,
  source: CheckSource,
  context: CheckContext,
): boolean {
  const { harbour, lines, anchor } = source;
  if (check.target) {
    const entry = context.targets?.find((t) => t.id === check.target?.id);
    if (!entry || !harbour) return false;
    const [e, n] = boatPoint(source.boat, check.target.point);
    if (insideTarget(resolveTarget(entry, harbour), e, n) !== (check.target.inside ?? true)) {
      return false;
    }
  }
  if (check.headingDeg) {
    if (Math.abs(wrap180(source.boat.headingDeg - check.headingDeg.to)) > check.headingDeg.within) {
      return false;
    }
  }
  if (check.quayGapM) {
    const gap = quayGap(source);
    if (gap === null || !inRange(gap, check.quayGapM)) return false;
  }
  if (check.berthOffsetM) {
    const off = berthOffset(source);
    if (off === null || !inRange(off, check.berthOffsetM)) return false;
  }
  if (check.linesOn) {
    if (!lines) return false;
    const have = lines.lines.map((l) => l.code);
    if (!check.linesOn.every((c) => have.includes(c))) return false;
  }
  if (check.linesOff) {
    if (!lines) return false;
    const have = lines.lines.map((l) => l.code);
    if (check.linesOff.some((c) => have.includes(c) || lines.crew?.code === c)) return false;
  }
  if (check.linesTight) {
    if (!lines || !harbour) return false;
    const have = lines.lines.map((l) => l.code);
    const inputs = {
      lines,
      boat: source.boat,
      harbour,
      geometry: marinaGeometry(harbour.layout, harbour.traffic),
      engine: source.engine,
      area,
    };
    if (!check.linesTight.every((c) => have.includes(c) && !canTighten(c, inputs))) return false;
  }
  if (check.fendersOut !== undefined) {
    if (!harbour || harbour.fendersOut !== check.fendersOut) return false;
  }
  if (check.anchor) {
    if (!anchor) return false;
    if (check.anchor.phase && !check.anchor.phase.includes(anchor.phase)) return false;
    if (check.anchor.chainOutM && !inRange(anchor.chainOutM, check.anchor.chainOutM)) return false;
    if (check.anchor.scopeOk !== undefined) {
      const held = anchor.phase === 'bottom' || anchor.phase === 'set';
      const ok =
        held &&
        anchor.chainOutM >= scopeNeededM(depthAt(anchor.eastM, anchor.northM), source.wind.twsKn);
      if (ok !== check.anchor.scopeOk) return false;
    }
  }
  return true;
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
    // An engine that is stopped drives nothing, so it counts as neutral (owner, PR 163).
    const gear = source.engine.running ? source.engine.gear : 'neutral';
    if (check.engine.gear !== undefined && gear !== check.engine.gear) return false;
  }
  return harbourFieldsPass(check, source, context);
}

/** One line of "what to reach" for a step (owner, PR 144), made from the step's check. */
export type TargetRow =
  | { kind: 'twa'; range: Range }
  | { kind: 'tack'; side: 'port' | 'starboard' }
  | { kind: 'trim'; sail: 'main' | 'jib'; states: readonly TrimState[] }
  | { kind: 'control'; id: ControlId; range: Range }
  | { kind: 'heading'; to: number; within: number }
  | { kind: 'quayGap'; range: Range };

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
  if (check.headingDeg) rows.push({ kind: 'heading', ...check.headingDeg });
  if (check.quayGapM) rows.push({ kind: 'quayGap', range: check.quayGapM });
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
    case 'heading': {
      const heading = source.boat.headingDeg;
      return {
        ok: Math.abs(wrap180(heading - row.to)) <= row.within,
        value: Math.round(((heading % 360) + 360) % 360),
      };
    }
    case 'quayGap': {
      const gap = quayGap(source);
      if (gap === null) return null;
      return { ok: inRange(gap, row.range), value: Math.round(gap * 10) / 10 };
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
