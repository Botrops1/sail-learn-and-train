import {
  checkPasses,
  EXERCISE_SETTINGS,
  exerciseDef,
  obstacleKind,
  resolveTarget,
  type ExerciseDef,
  type ExerciseEvent,
  type ExerciseLevel,
  type ExerciseLogEntry,
  type LoggedAction,
  type ResolvedTarget,
} from '../model/exercises';
import type { ControlId } from '../model/controls';
import type { RealisticAction } from '../model/realistic';
import type { RopesMode } from '../model/settings';
import { isTimeLapseScale, timeLapseAvailable, timeSpeedAvailable } from '../model/timeScale';
import type { Action, AppState } from './store';

/**
 * The coach (PHASE10_SPEC 4.1, 4.2, 6.3): the run of one exercise and its step each frame. Pure.
 * M66 writes `start`, `step` and `finish`; the fields marked M67-M71 are created empty.
 */
/** M81: a demo plays at ×4 at most, in parts of at most 0.05 app seconds (PHASE10_PHONE_SPEC 4.2). */
export const DEMO_MAX_SCALE = 4;
export const DEMO_PART_S = 0.05;

export type RunStatus = 'setup' | 'running' | 'mistake' | 'failed' | 'done';
export interface ExerciseOptions {
  pauseOnMistake: boolean;
  /** Owner, PR 148: stop time when a step is done, until the learner presses Resume. */
  pauseOnStep: boolean;
  crew: 'alone' | 'crew';
  /** PHASE10_SPEC 16.3: chosen by loading the start link again; the run keeps its level. */
  level: ExerciseLevel;
}
export const DEFAULT_OPTIONS: Readonly<ExerciseOptions> = {
  pauseOnMistake: true,
  pauseOnStep: false,
  crew: 'alone',
  level: 'easy',
};
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
  /** True while time is stopped after a finished step (the `pauseOnStep` option). */
  stepPause: boolean;
  /** M81: what the app is playing: null (the learner), 'watch' (the whole run) or 'showMe' (one step). */
  demo: 'watch' | 'showMe' | null;
  /** M81, showMe: the step being shown; else -1. */
  demoStep: number;
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
  | { demo: 'watch' | 'showMe' | null }
  | { options: Partial<ExerciseOptions> };

/**
 * The `{ demo }` command (PHASE10_PHONE_SPEC 4.2). 'watch': only in setup. 'showMe': only while
 * running, back to the current step's start. null: any status.
 */
export function setDemo(state: AppState, demo: 'watch' | 'showMe' | null): AppState {
  const run = state.exercise;
  if (run === null) return state;
  if (demo === null) {
    if (run.demo === null && run.demoStep === -1) return state;
    return { ...state, exercise: { ...run, demo: null, demoStep: -1 } };
  }
  if (demo === 'watch') {
    if (run.status !== 'setup') return state;
    return { ...state, exercise: { ...run, demo: 'watch', demoStep: -1 } };
  }
  if (run.status !== 'running') return state;
  const back = restoreWaypoint(state, run.step);
  if (back === state || back.exercise === null) return state;
  return { ...back, exercise: { ...back.exercise, demo: 'showMe', demoStep: run.step } };
}

/** A waypoint's state: the whole app state without the run, running (PHASE10_SPEC 7.3). */
function snapshot(state: AppState): AppState {
  return { ...state, exercise: null, paused: false };
}

/** Is a gust not blowing now? A gust already blowing at a start or a new step is not counted. */
function gustArmedAt(state: AppState): boolean {
  const { rearmPct } = EXERCISE_SETTINGS.gust;
  return state.wind.twsKn <= state.controls.ctl_wind_speed * (1 + rearmPct / 100);
}

/** The gust counter (PHASE10_SPEC 10.3): a gust is a rise to `risePct` above the mean wind. */
export function countGusts(
  gusts: number,
  armed: boolean,
  twsKn: number,
  meanKn: number,
): { gusts: number; gustArmed: boolean } {
  const { risePct, rearmPct } = EXERCISE_SETTINGS.gust;
  if (armed && twsKn >= meanKn * (1 + risePct / 100)) return { gusts: gusts + 1, gustArmed: false };
  if (!armed && twsKn <= meanKn * (1 + rearmPct / 100)) return { gusts, gustArmed: true };
  return { gusts, gustArmed: armed };
}

/** The current step's speed-up while the run is `running` (also while "pause after each step" holds it), else null (M96). */
export function stepSpeedUp(state: AppState): number | null {
  const run = state.exercise;
  if (run === null || run.status !== 'running') return null;
  const def = exerciseDef(run.id);
  return def?.steps[run.step]?.speedUp ?? null;
}

/**
 * When the speed-up differs between two states: set the new one (if allowed), or ×1 when the new
 * state has none (M96, PHASE10_SPEC 26.3). A scale the learner picks during a step is kept until
 * the step's speed-up changes.
 */
export function applyStepSpeed(previous: AppState, next: AppState): AppState {
  const a = stepSpeedUp(previous);
  const b = stepSpeedUp(next);
  if (a === b) return next;
  if (b === null) {
    return next.settings.timeScale === 1
      ? next
      : { ...next, settings: { ...next.settings, timeScale: 1 } };
  }
  const allowed = isTimeLapseScale(b)
    ? timeLapseAvailable(
        next.boat.mode,
        next.windMode.mode,
        next.settings.timeBar,
        next.anchor.phase,
        next.lines.lines.length,
      )
    : timeSpeedAvailable(next.boat.mode, next.windMode.mode, next.settings.timeBar);
  if (!allowed || next.settings.timeScale === b) return next;
  return { ...next, settings: { ...next.settings, timeScale: b } };
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
  // The crew choice means something only for an exercise that has one (PHASE10_SPEC 11.3).
  // The level changes the marina, so it comes only with the start link (16.3).
  const { crew, ...rest } = options;
  delete rest.level;
  const kept: Partial<ExerciseOptions> =
    crew !== undefined && exerciseDef(run.id)?.crew === true ? { ...rest, crew } : rest;
  return { ...state, exercise: { ...run, options: { ...run.options, ...kept } } };
}

/**
 * Alone (PHASE10_SPEC 11.3): while a Realistic exercise that has a crew choice runs Alone, the
 * learner cannot pause: they set the autopilot before leaving the wheel, as a single-hander does.
 * Only the running state blocks; the coach's own pauses (a mistake, a done step) still happen.
 */
export function exercisePauseBlocked(state: AppState): boolean {
  const run = state.exercise;
  return (
    run?.status === 'running' &&
    run.options.crew === 'alone' &&
    state.settings.ropesMode === 'realistic' &&
    exerciseDef(run.id)?.crew === true
  );
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
      stepPause: false,
      stepStartS: run.elapsedS,
      settleFromS: run.elapsedS,
      seenAlertN: state.alerts.written,
      events: [],
      gusts: 0,
      gustArmed: gustArmedAt(wp.state),
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
    stepPause: false,
    demo: null,
    demoStep: -1,
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
      stepPause: false,
      seenAlertN: state.alerts.written,
      gusts: 0,
      gustArmed: gustArmedAt(started),
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
  let events = run.events;

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
      // The event first, so a mistake row follows its event (PHASE10_SPEC 8.3).
      log = [...log, { kind: 'event', atS: elapsedS, entry }];
      // PHASE10_SPEC 9.3: a tack by hand is a tack with the autopilot on Standby.
      if (entry.kind === 'tack') {
        events = [
          ...events,
          'tack',
          ...(next.autopilot.mode === 'off' ? (['tackByHand'] as const) : []),
        ];
      } else if (entry.kind === 'gybe') {
        events = [...events, entry.report?.accidental ? 'accidentalGybe' : 'controlledGybe'];
      }
      for (const m of def.mistakes) {
        if (!('alert' in m.on) || !applies(m) || m.on.alert !== entry.kind) continue;
        if (m.on.accidental !== undefined && entry.report?.accidental !== m.on.accidental) continue;
        if (m.on.severity !== undefined) {
          const sev = entry.contact?.severity;
          if (sev === undefined || !m.on.severity.includes(sev)) continue;
        }
        if (m.on.obstacle !== undefined) {
          const id = entry.contact?.obstacleId;
          if (id === undefined || !m.on.obstacle.includes(obstacleKind(id))) continue;
        }
        if (mayFire(m.id)) fire(m);
      }
    }
  }
  // The gust counter (PHASE10_SPEC 10.3): before the mistakes and the step's check.
  const counted = countGusts(
    run.gusts,
    run.gustArmed,
    next.wind.twsKn,
    next.controls.ctl_wind_speed,
  );
  const context = { events, gusts: counted.gusts, targets: def.targets ?? [] };
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
    events,
    gusts: counted.gusts,
    gustArmed: counted.gustArmed,
    holdS,
    stepPause: false,
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
    gustArmed: gustArmedAt(next),
    log,
  };
  if (nextStep < def.steps.length) {
    const wp = { step: nextStep, atS: elapsedS, state: snapshot(next) };
    // M81: time stops after every step the app played (the learner's own option is untouched).
    const stopTime = run.options.pauseOnStep || run.demo !== null;
    return {
      ...next,
      paused: stopTime ? true : next.paused,
      exercise: { ...advanced, stepPause: stopTime, waypoints: [...run.waypoints, wp] },
    };
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

/** Whole-number copy of a control value, so a drag of 0.3 % is not an action. */
const whole = (value: number | undefined): number => Math.round(value ?? 0);

/** The gesture's target: the first of key, winch, station, to that the action has (PHASE10_SPEC 8.3). */
function gestureTarget(action: RealisticAction): string | null {
  if ('key' in action && action.key !== null) return action.key;
  if ('winch' in action) return action.winch;
  if ('station' in action) return action.station;
  if ('to' in action) return action.to;
  return null;
}

function gestureOn(action: RealisticAction): boolean | undefined {
  if (action.type === 'clutch') return action.open;
  if (action.type === 'selfTailer') return action.into;
  if (action.type === 'button') return action.held;
  return undefined;
}

/** The learner's action in the log (PHASE10_SPEC 8.3), or null when nothing changed. */
function loggedActions(previous: AppState, next: AppState, action: Action): LoggedAction[] {
  switch (action.type) {
    case 'setControls': {
      const out: LoggedAction[] = [];
      for (const id of Object.keys(action.values) as ControlId[]) {
        if ((id as string) === 'ctl_wind_dir' || (id as string) === 'ctl_wind_speed') continue;
        const from = whole(previous.controls[id]);
        const to = whole(next.controls[id]);
        if (from !== to) out.push({ type: 'control', id, from, to });
      }
      return out;
    }
    case 'autopilot': {
      if (next.autopilot === previous.autopilot) return [];
      const command = action.command;
      if (typeof command === 'object') {
        return [{ type: 'autopilot', command: 'turn', turnDeg: command.turnDeg }];
      }
      return [{ type: 'autopilot', command }];
    }
    case 'engine': {
      if (next.engine === previous.engine) return [];
      const command = action.command;
      if (typeof command === 'object') {
        return [{ type: 'engine', command: 'lever', leverPct: command.leverPct }];
      }
      return [{ type: 'engine', command }];
    }
    case 'line': {
      if (next.lines === previous.lines) return [];
      return [{ type: 'line', code: action.code, command: action.command }];
    }
    case 'thruster': {
      if (next.thrusters === previous.thrusters || action.dir === 0) return [];
      return [{ type: 'thruster', which: action.which, dir: action.dir }];
    }
    case 'windlass': {
      if (next.anchor.windlass === previous.anchor.windlass || action.motion === 'off') return [];
      return [{ type: 'windlass', motion: action.motion }];
    }
    case 'setFenders': {
      if (next.harbour.fendersOut === previous.harbour.fendersOut) return [];
      return [{ type: 'fenders', out: action.out }];
    }
    case 'realistic': {
      if (action.action.type === 'clearNotice') return [];
      const before = previous.realistic as unknown as Record<string, unknown>;
      const after = next.realistic as unknown as Record<string, unknown>;
      const changed =
        next.controls !== previous.controls ||
        Object.keys(after).some((key) => key !== 'notice' && after[key] !== before[key]);
      if (!changed) return [];
      const on = gestureOn(action.action);
      return [
        {
          type: 'realistic',
          gesture: action.action.type,
          target: gestureTarget(action.action),
          ...(on === undefined ? {} : { on }),
        },
      ];
    }
    default:
      return [];
  }
}

/** Does the new action continue the last log entry (same kind of change within controlMergeS)? */
function merge(last: ExerciseLogEntry | undefined, act: LoggedAction, atS: number) {
  if (last?.kind !== 'action' || atS - last.atS > EXERCISE_SETTINGS.controlMergeS) return null;
  const old = last.action;
  let merged: LoggedAction | null = null;
  if (act.type === 'control' && old.type === 'control' && old.id === act.id) {
    merged = { ...old, to: act.to };
  } else if (act.type === 'autopilot' && act.command === 'turn') {
    if (old.type === 'autopilot' && old.command === 'turn') {
      merged = { ...old, turnDeg: old.turnDeg + act.turnDeg };
    }
  } else if (act.type === 'engine' && act.command === 'lever') {
    if (old.type === 'engine' && old.command === 'lever') merged = act;
  } else if (act.type === 'line') {
    if (old.type === 'line' && old.code === act.code && old.command === act.command) {
      merged = { ...old, times: (old.times ?? 1) + 1 };
    }
  } else if (act.type === 'realistic') {
    if (
      old.type === 'realistic' &&
      old.gesture === act.gesture &&
      old.target === act.target &&
      old.on === act.on
    ) {
      merged = old;
    }
  }
  return merged;
}

/**
 * Logs what the learner just did (PHASE10_SPEC 8.3). `previous` is the state before the action
 * (for the `from` values). Only while the run is running or stopped on a mistake.
 */
export function logAction(previous: AppState, next: AppState, action: Action): AppState {
  const run = next.exercise;
  if (run === null || (run.status !== 'running' && run.status !== 'mistake')) return next;
  const acts = loggedActions(previous, next, action);
  if (acts.length === 0) return next;
  const atS = run.elapsedS;
  let log = [...run.log];
  for (const act of acts) {
    const last = log[log.length - 1];
    const merged = merge(last, act, atS);
    if (merged === null) {
      log.push({ kind: 'action', atS, action: act });
    } else {
      const replaced = { kind: 'action' as const, atS, action: merged };
      const gone =
        (merged.type === 'control' && merged.from === merged.to) ||
        (merged.type === 'autopilot' && merged.command === 'turn' && merged.turnDeg === 0);
      log = gone ? log.slice(0, -1) : [...log.slice(0, -1), replaced];
    }
  }
  const over = log.length - EXERCISE_SETTINGS.logMax;
  for (let i = 0; i < over; i += 1) {
    const index = log.findIndex((entry) => entry.kind === 'action');
    if (index < 0) break;
    log = [...log.slice(0, index), ...log.slice(index + 1)];
  }
  return { ...next, exercise: { ...run, log } };
}

/** The outline drawn for the current step (PHASE10_SPEC 16.3), or null. */
export function shownTarget(state: AppState): ResolvedTarget | null {
  const run = state.exercise;
  if (run === null || run.status === 'done') return null;
  const def = exerciseDef(run.id);
  const show = def?.steps[run.step]?.show;
  if (def === undefined || show === undefined) return null;
  const target = def.targets?.find((t) => t.id === show);
  return target === undefined ? null : resolveTarget(target, state.harbour);
}
