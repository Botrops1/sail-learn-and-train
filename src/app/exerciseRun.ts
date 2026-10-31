import {
  checkPasses,
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

export type ExerciseCommand = 'start' | 'stop' | { ropes: RopesMode };

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
  return {
    ...state,
    paused: false,
    exercise: {
      ...run,
      status: 'running',
      stepStartS: run.elapsedS,
      settleFromS: run.elapsedS,
      holdS: 0,
      seenAlertN: state.alerts.written,
      log: [...run.log, { kind: 'start', atS: run.elapsedS, step: run.step }],
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
  const passes = checkPasses(step.check, next, { events: run.events, gusts: run.gusts });
  const holdS = passes ? run.holdS + dt : 0;
  const base: ExerciseRun = { ...run, elapsedS, seenAlertN: next.alerts.written, holdS };
  if (!(passes && holdS >= step.holdS)) return { ...next, exercise: base };
  const log: ExerciseLogEntry[] = [
    ...run.log,
    { kind: 'step', atS: elapsedS, step: run.step, stepId: step.id },
  ];
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
  if (nextStep < def.steps.length) return { ...next, exercise: advanced };
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
