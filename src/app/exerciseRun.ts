import {
  checkPasses,
  EXERCISE_SETTINGS,
  exerciseDef,
  type ExerciseDef,
  type ExerciseEvent,
  type ExerciseLogEntry,
} from '../model/exercises';
import type { RopesMode } from '../model/settings';
import type { AppState } from './store';

/**
 * The coach (PHASE10_SPEC 4.1, 4.2, 6.3): the run of one exercise and its step each frame. Pure.
 * M66 writes `start`, `step` and `finish`; the fields marked M67-M71 are created empty.
 */
export type RunStatus = 'setup' | 'running' | 'mistake' | 'failed' | 'done';
export interface ExerciseOptions {
  pauseOnMistake: boolean;
  crew: 'alone' | 'crew';
}
export const DEFAULT_OPTIONS: Readonly<ExerciseOptions> = { pauseOnMistake: true, crew: 'alone' };
export interface ExerciseWaypoint {
  step: number;
  atS: number;
  state: AppState;
}
export interface ExerciseRun {
  id: string;
  status: RunStatus;
  options: ExerciseOptions;
  /** 0-based index of the current step; = steps.length when done. */
  step: number;
  /** The step the run was set up at (0, or a waypoint link's step, M67). */
  startStep: number;
  elapsedS: number;
  /** elapsedS when the current step began, and when the run last started or went back (settle time). */
  stepStartS: number;
  settleFromS: number;
  holdS: number;
  seenAlertN: number;
  events: readonly ExerciseEvent[];
  gusts: number;
  gustArmed: boolean;
  conditionS: Readonly<Record<string, number>>;
  lastMistakeS: Readonly<Record<string, number>>;
  mistake: Extract<ExerciseLogEntry, { kind: 'mistake' }> | null;
  waypoints: readonly ExerciseWaypoint[];
  log: readonly ExerciseLogEntry[];
}

export type ExerciseCommand =
  | 'start'
  | 'stop'
  | { ropes: RopesMode }
  | 'continue'
  | { back: number }
  | { options: Partial<ExerciseOptions> };

/** A waypoint's state: the whole app state without the run, running (PHASE10_SPEC 7.3). */
function snapshot(state: AppState): AppState {
  return { ...state, exercise: null, paused: false };
}

/** The 'continue' command: only from a mistake card; time runs again. */
export function continueRun(state: AppState): AppState {
  const run = state.exercise;
  if (run === null || run.status !== 'mistake') return state;
  return { ...state, paused: false, exercise: { ...run, status: 'running', mistake: null } };
}

/** The `{ options }` command: only in setup. */
export function setRunOptions(state: AppState, options: Partial<ExerciseOptions>): AppState {
  const run = state.exercise;
  if (run === null || run.status !== 'setup') return state;
  return { ...state, exercise: { ...run, options: { ...run.options, ...options } } };
}

/**
 * Back to the start of a step (PHASE10_SPEC 7.3). The viewer's settings, camera, the alert history
 * and the run's log stay; the rig keeps today's clock so app time never runs backwards.
 */
export function restoreWaypoint(state: AppState, step: number): AppState {
  const run = state.exercise;
  const wp = run?.waypoints.find((w) => w.step === step);
  if (!run || !wp) return state;
  // Times stamped inside the waypoint's state (rig.lastGybe.atS, contact reports, track points)
  // keep their older values: accepted (they only decide what old reports still show).
  return {
    ...wp.state,
    rig: { ...wp.state.rig, timeS: state.rig.timeS },
    windMode: {
      ...wp.state.windMode,
      startS: wp.state.windMode.startS + (state.rig.timeS - wp.state.rig.timeS),
    },
    settings: state.settings,
    camera: state.camera,
    selection: null,
    learn: state.learn,
    appMode: 'exercise',
    alerts: state.alerts,
    paused: false,
    exercise: {
      ...run,
      status: 'running',
      step,
      holdS: 0,
      stepStartS: run.elapsedS,
      settleFromS: run.elapsedS,
      seenAlertN: state.alerts.written,
      events: [],
      gusts: 0,
      gustArmed: true,
      conditionS: {},
      lastMistakeS: {},
      mistake: null,
      waypoints: run.waypoints.filter((w) => w.step <= step),
      log: [...run.log, { kind: 'back', atS: run.elapsedS, step }],
    },
  };
}

/** A run in `setup` at that step. */
export function newRun(id: string, step: number, options: ExerciseOptions): ExerciseRun {
  return {
    id,
    status: 'setup',
    options,
    step,
    startStep: step,
    elapsedS: 0,
    stepStartS: 0,
    settleFromS: 0,
    holdS: 0,
    seenAlertN: 0,
    events: [],
    gusts: 0,
    gustArmed: true,
    conditionS: {},
    lastMistakeS: {},
    mistake: null,
    waypoints: [],
    log: [],
  };
}

/** The 'start' command: only from `setup`; time runs. */
export function startRun(state: AppState): AppState {
  const run = state.exercise;
  if (run === null || run.status !== 'setup') return state;
  const started: AppState = { ...state, paused: false };
  return {
    ...started,
    exercise: {
      ...run,
      status: 'running',
      stepStartS: run.elapsedS,
      settleFromS: run.elapsedS,
      holdS: 0,
      seenAlertN: state.alerts.written,
      log: [...run.log, { kind: 'start', atS: run.elapsedS, step: run.step }],
      waypoints: [{ step: run.step, atS: run.elapsedS, state: snapshot(started) }],
    },
  };
}

/** One frame of the coach (PHASE10_SPEC 4.2); paused frames (dt 0) change nothing. */
export function stepExercise(
  previous: AppState,
  next: AppState,
  def: ExerciseDef | undefined = next.exercise ? exerciseDef(next.exercise.id) : undefined,
): AppState {
  const run = next.exercise;
  if (run === null || run.status !== 'running' || def === undefined) return next;
  const dt = next.rig.timeS - previous.rig.timeS;
  if (!(dt > 0)) return next;
  const elapsedS = run.elapsedS + dt;
  const step = def.steps[run.step];
  if (step === undefined) return next;
  const settings = EXERCISE_SETTINGS;
  const context = { events: run.events, gusts: run.gusts };

  // Mistakes (PHASE10_SPEC 7.3): alerts that are new since the last frame, then conditions held.
  let log: ExerciseLogEntry[] = [...run.log];
  const lastMistakeS: Record<string, number> = { ...run.lastMistakeS };
  const conditionS: Record<string, number> = { ...run.conditionS };
  let first: Extract<ExerciseLogEntry, { kind: 'mistake' }> | null = null;
  const mayFire = (id: string) =>
    elapsedS - (lastMistakeS[id] ?? -Infinity) >= settings.mistakeRepeatGapS;
  const applies = (m: ExerciseDef['mistakes'][number]) =>
    m.steps === undefined || m.steps.includes(step.id);
  const fire = (m: ExerciseDef['mistakes'][number]) => {
    const entry = {
      kind: 'mistake' as const,
      atS: elapsedS,
      step: run.step,
      mistakeId: m.id,
      serious: m.serious,
    };
    log = [...log, entry];
    lastMistakeS[m.id] = elapsedS;
    first ??= entry;
  };
  if (elapsedS - run.settleFromS >= settings.settleS) {
    const fresh = next.alerts.entries.filter((e) => e.n > run.seenAlertN);
    for (const entry of fresh) {
      for (const m of def.mistakes) {
        if (!('alert' in m.on) || !applies(m) || m.on.alert !== entry.kind) continue;
        if (m.on.accidental !== undefined && entry.report?.accidental !== m.on.accidental) continue;
        if (mayFire(m.id)) fire(m);
      }
    }
  }
  for (const m of def.mistakes) {
    if (!('condition' in m.on)) continue;
    if (applies(m) && checkPasses(m.on.condition, next, context)) {
      const held = conditionS[m.id] ?? 0;
      if (held >= 0) {
        conditionS[m.id] = held + dt;
        if (held + dt >= m.on.forS && mayFire(m.id)) {
          fire(m);
          conditionS[m.id] = -1;
        }
      }
    } else {
      conditionS[m.id] = 0;
    }
  }
  const trigger = first as Extract<ExerciseLogEntry, { kind: 'mistake' }> | null;
  const stopped = trigger !== null && (trigger.serious || run.options.pauseOnMistake);

  const passes = checkPasses(step.check, next, context);
  const holdS = passes ? run.holdS + dt : 0;
  const base: ExerciseRun = {
    ...run,
    elapsedS,
    seenAlertN: next.alerts.written,
    holdS,
    log,
    lastMistakeS,
    conditionS,
    mistake: trigger ?? run.mistake,
  };
  if (trigger !== null && stopped) {
    return {
      ...next,
      paused: true,
      exercise: { ...base, status: trigger.serious ? 'failed' : 'mistake' },
    };
  }
  if (!(passes && holdS >= step.holdS)) return { ...next, exercise: base };
  log = [...log, { kind: 'step', atS: elapsedS, step: run.step, stepId: step.id }];
  const nextStep = run.step + 1;
  const advanced: ExerciseRun = {
    ...base,
    step: nextStep,
    holdS: 0,
    stepStartS: elapsedS,
    events: [],
    gusts: 0,
    log,
  };
  if (nextStep < def.steps.length) {
    const wp = { step: nextStep, atS: elapsedS, state: snapshot(next) };
    return { ...next, exercise: { ...advanced, waypoints: [...run.waypoints, wp] } };
  }
  return {
    ...next,
    paused: true,
    exercise: {
      ...advanced,
      status: 'done',
      log: [...log, { kind: 'finish', atS: elapsedS }],
    },
  };
}
