import { boat as boatData } from '../model/boat';
import { clampControl, defaultControls, type ControlId, type Controls } from '../model/controls';
import {
  DEFAULT_CAMERA,
  DEFAULT_SETTINGS,
  type CameraPreset,
  type CameraState,
  type Detail,
  type RopesMode,
  type Settings,
  type StepSize,
} from '../model/settings';
import {
  initialRealistic,
  reduceRealistic,
  stepRealistic,
  type RealisticAction,
  type RealisticState,
} from '../model/realistic';
import { step, initialRig, type BoatMotion, type RigHistory, type RigState } from '../model/sim';
import {
  adjustAutopilot,
  engageAutopilot,
  stepAutopilot,
  tackAutopilot,
  type AutopilotState,
} from '../model/autopilot';
import { engineThrustN, initialEngine, stepEngine, type EngineState } from '../model/engine';
import { appendTrack, type TrackPoint } from '../model/track';
import { isTimeScale, timeSpeedAvailable } from '../model/timeScale';
import {
  initialWindMode,
  isSeed,
  sizeRange,
  windAt,
  type WindModeId,
  type WindModeState,
  type WindNow,
} from '../model/windModes';
import { floggingDamage, NO_DAMAGE, type SailDamage } from '../model/trim';
import {
  initialBoat,
  steadyState,
  stepBoat,
  type BoatState,
  type MotionReport,
} from '../model/motion';

/**
 * The single app store (PHASE1_SPEC 9.1): control targets, the solved rig, the selected part,
 * camera and settings. UI dispatches actions; renderers read the state.
 */
export interface AppState {
  /** What the user has set (targets). */
  controls: Controls;
  /** What the rig is doing (solved and smoothed, advanced every frame). */
  rig: RigState;
  camera: CameraState;
  settings: Settings;
  /** Registry id of the part shown in the info card, or null. */
  selection: string | null;
  /** Realistic mode (PHASE1_SPEC 7.2.2): stations, clutches, winches. Kept while in Easy mode. */
  realistic: RealisticState;
  /** Pause (both modes): time stands still; not stored in the URL. */
  paused: boolean;
  /** The boat's motion (PHASE2_SPEC 4.1): held still or sailing, heading, speed, position. */
  boat: BoatState;
  autopilot: AutopilotState;
  /** The latest report of `stepBoat` (forces, resistance, winds), for the strip and debug. */
  motion: MotionReport | null;
  /** Seconds left to show "Autopilot on Standby: you took the wheel". */
  autopilotNoticeS: number;
  /** Where the boat has been (M7, for the map). Sailing only; not in the link. */
  track: TrackPoint[];
  /** The wind pattern on top of the mean wind the dial and slider set (M10). */
  windMode: WindModeState;
  /**
   * The true wind now (M10): the mean with the pattern applied, at the rig's clock. The dial and
   * slider show the mean (`controls`); the sails, the boat, the autopilot and the map use this.
   */
  wind: WindNow;
  /** How worn each sail is from flogging (M9, 0 … 1; 1 = torn). Not in the link. */
  sailDamage: SailDamage;
  /** The engine (M12): stopped or running, the lever, rpm and gear. */
  engine: EngineState;
}

/** Engine commands (PHASE2_SPEC 12.3): start, stop, or the lever (−100 … 100, whole numbers). */
export type EngineCommand = 'start' | 'stop' | { leverPct: number };

/** Autopilot commands (PHASE2_SPEC 6.4). `turnDeg` + = turn the boat to starboard. */
export type AutopilotCommand = 'off' | 'heading' | 'wind' | 'tack' | { turnDeg: number };

export type Action =
  | { type: 'setStep'; step: StepSize }
  | { type: 'setDebug'; debug: boolean }
  | { type: 'setDetail'; detail: Detail }
  | { type: 'setRopesMode'; mode: RopesMode }
  | { type: 'setLegend'; legend: boolean }
  | { type: 'setLabels'; labels: boolean }
  /** Reset all (View tab): controls, camera, selection and settings back to the defaults. */
  | { type: 'reset' }
  | { type: 'setCameraPreset'; preset: CameraPreset }
  | { type: 'select'; partId: string | null }
  | { type: 'setControls'; values: Partial<Controls> }
  /** A clutch, winch or station action of Realistic mode. */
  | { type: 'realistic'; action: RealisticAction }
  | { type: 'setPaused'; paused: boolean }
  /** Held still (Phase 1) or Sailing (PHASE2_SPEC 6.4). */
  | { type: 'setBoatMode'; mode: 'sailing' | 'held' }
  | { type: 'autopilot'; command: AutopilotCommand }
  /** The engine (M12). */
  | { type: 'engine'; command: EngineCommand }
  /** Wind modes (M10): the pattern restarts now; its size goes to the mode's default. */
  | { type: 'setWindMode'; mode: WindModeId }
  /** Size of the pattern: % (gusty), ° (shifty), kn (building, dying). Restarts the pattern. */
  | { type: 'setWindSize'; size: number }
  /** A new random pattern (the caller draws the seed, so the reducer stays pure). */
  | { type: 'newWindPattern'; seed: number }
  /** The time bar (M10, issue #25): a scale from `windModes.timeScales`; refused where the bar has no speed part. */
  | { type: 'setTimeScale'; scale: number }
  /** The View tab's switch for the time bar's speed part. Off puts the time scale back to ×1. */
  | { type: 'setTimeBar'; timeBar: boolean }
  /** New sails: the flogging damage goes back to 0 (M9). */
  | { type: 'repairSails' }
  /** Replace the whole state (a practice scenario opened from its link, M4c). */
  | { type: 'load'; state: AppState }
  | { type: 'step'; dt: number };

export interface InitialOverrides {
  controls?: Partial<Controls>;
  camera?: Partial<CameraState>;
  settings?: Partial<Settings>;
  selection?: string | null;
  /** From a shared link: rig history the controls alone do not give (see RigHistory). */
  history?: RigHistory;
  /** From a shared link: clutches, winch setup and station (Realistic mode). */
  realistic?: RealisticState;
  /** From a shared link: heading, speed, position, mode. Sailing without a speed: steady speed. */
  boat?: Partial<BoatState>;
  /** From a shared link; without it the autopilot holds the boat's heading. */
  autopilot?: AutopilotState;
  /** From a shared link: the wind mode, its seed and size. The pattern starts at time 0. */
  windMode?: Partial<WindModeState>;
  /** From a shared link: engine running and lever. */
  engine?: { running?: boolean; leverPct?: number };
}

/** The boat a link describes (PHASE2_SPEC 6.4): without a speed she starts at her steady speed. */
function boatFor(
  controls: Controls,
  overrides: Partial<BoatState> = {},
  wind?: WindNow,
  engine: EngineState = initialEngine(),
): BoatState {
  const mode = overrides.mode ?? 'sailing';
  const headingDeg = overrides.headingDeg ?? 0;
  if (mode === 'held') {
    return initialBoat({
      ...overrides,
      mode,
      headingDeg,
      speedMps: 0,
      yawRateDegS: 0,
      heelDeg: 0,
    });
  }
  // She opens settled: at her steady speed and heel (a link may give the speed).
  const steady = steadyState(controls, headingDeg, undefined, {
    heel: true,
    engineThrustN: engineThrustN(engine),
    ...(wind ? { windDirDeg: wind.dirDeg, twsKn: wind.twsKn } : {}),
  });
  const speedMps = overrides.speedMps ?? steady.speedMps;
  const heelDeg = overrides.heelDeg ?? steady.heelDeg;
  return initialBoat({ ...overrides, mode, headingDeg, speedMps, heelDeg });
}

function motionOf(boat: BoatState): BoatMotion {
  return { velocity: [boat.speedMps, 0, 0], headingDeg: boat.headingDeg, heelDeg: boat.heelDeg };
}

/** The true wind now for the controls' mean and a wind mode, at the rig clock `timeS`. */
function windNow(controls: Controls, windMode: WindModeState, timeS: number): WindNow {
  return windAt(controls.ctl_wind_dir, controls.ctl_wind_speed, windMode, timeS);
}

/**
 * Where the time bar has no speed part the time runs at ×1 (PHASE2_SPEC 10.3): Held still with a
 * steady wind, or the bar switched off.
 */
function withTimeRule(state: AppState): AppState {
  const { settings } = state;
  if (settings.timeScale === 1) return state;
  return timeSpeedAvailable(state.boat.mode, state.windMode.mode, settings.timeBar)
    ? state
    : { ...state, settings: { ...settings, timeScale: 1 } };
}

export function initialState(overrides: InitialOverrides = {}): AppState {
  const controls = { ...defaultControls(), ...overrides.controls };
  const windMode = initialWindMode(overrides.windMode);
  const wind = windNow(controls, windMode, 0);
  // Steady wind: the controls are the wind (Phase 1 and the sailing of M6-M9 exactly).
  const patterned = windMode.mode !== 'steady';
  const engine = initialEngine(overrides.engine);
  const boat = boatFor(controls, overrides.boat, patterned ? wind : undefined, engine);
  return withTimeRule({
    controls,
    // A link opens with the rig already settled for the apparent wind: no swing on load.
    rig: initialRig(
      controls,
      undefined,
      overrides.history,
      motionOf(boat),
      patterned ? wind : undefined,
    ),
    camera: { ...DEFAULT_CAMERA, ...overrides.camera },
    settings: { ...DEFAULT_SETTINGS, ...overrides.settings },
    selection: overrides.selection ?? null,
    realistic: overrides.realistic ?? initialRealistic(),
    paused: false,
    boat,
    autopilot: overrides.autopilot ?? engageAutopilot('heading', boat, controls.ctl_wind_dir),
    motion: null,
    autopilotNoticeS: 0,
    track: [],
    windMode,
    wind,
    sailDamage: NO_DAMAGE,
    engine,
  });
}

function withControls(controls: Controls, values: Partial<Controls>): Controls {
  const next = { ...controls };
  let changed = false;
  for (const [id, value] of Object.entries(values) as [ControlId, number | undefined][]) {
    if (value === undefined || !Number.isFinite(value)) continue;
    const clamped = clampControl(id, value);
    if (next[id] !== clamped) {
      next[id] = clamped;
      changed = true;
    }
  }
  return changed ? next : controls;
}

/** Longest frame step, seconds: a background tab must not make the rig jump. */
const MAX_STEP_S = 0.1;

/** How long "Autopilot on Standby: you took the wheel" shows, seconds. */
const AUTOPILOT_NOTICE_S = 3;

export function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setStep':
      return { ...state, settings: { ...state.settings, step: action.step } };
    case 'setDebug':
      return { ...state, settings: { ...state.settings, debug: action.debug } };
    case 'setDetail':
      return { ...state, settings: { ...state.settings, detail: action.detail } };
    case 'setRopesMode':
      return { ...state, settings: { ...state.settings, ropesMode: action.mode } };
    case 'setLegend':
      return { ...state, settings: { ...state.settings, legend: action.legend } };
    case 'setLabels':
      return { ...state, settings: { ...state.settings, labels: action.labels } };
    case 'reset': {
      // The rig keeps moving from where it is, so the boom and sails swing back visibly. The
      // debug overlay and the render detail suit the device, not what is shown: they stay.
      const { debug, detail } = state.settings;
      const defaults = initialState({ settings: { debug, detail } });
      return {
        ...defaults,
        rig: state.rig,
        windMode: { ...defaults.windMode, startS: state.rig.timeS },
      };
    }
    case 'setCameraPreset':
      return { ...state, camera: { ...state.camera, preset: action.preset } };
    case 'select':
      return { ...state, selection: action.partId };
    case 'setControls': {
      const controls = withControls(state.controls, action.values);
      if (controls === state.controls) return state;
      // Taking the wheel switches the autopilot to Standby.
      if (controls.ctl_rudder !== state.controls.ctl_rudder && state.autopilot.mode !== 'off') {
        const autopilot: AutopilotState = { ...state.autopilot, mode: 'off', integralDeg: 0 };
        return { ...state, controls, autopilot, autopilotNoticeS: AUTOPILOT_NOTICE_S };
      }
      return { ...state, controls };
    }
    case 'setBoatMode': {
      if (state.boat.mode === action.mode) return state;
      const boat: BoatState =
        action.mode === 'held'
          ? {
              ...state.boat,
              mode: 'held',
              speedMps: 0,
              yawRateDegS: 0,
              heelDeg: 0,
              heelRateDegS: 0,
              roundUpS: 0,
              overpoweredS: 0,
            }
          : { ...state.boat, mode: 'sailing' };
      // A new run starts a new track; held still keeps the one drawn so far.
      return withTimeRule({
        ...state,
        boat,
        track: action.mode === 'sailing' ? [] : state.track,
      });
    }
    case 'autopilot': {
      const command = action.command;
      const windDirDeg = state.wind.dirDeg;
      let autopilot = state.autopilot;
      if (command === 'off') {
        if (autopilot.mode === 'off') return state;
        autopilot = { ...autopilot, mode: 'off', integralDeg: 0 };
      } else if (command === 'heading' || command === 'wind') {
        if (autopilot.mode === command) return state;
        autopilot = engageAutopilot(command, state.boat, windDirDeg);
      } else if (command === 'tack') {
        autopilot = tackAutopilot(autopilot, state.boat, windDirDeg);
      } else {
        autopilot = adjustAutopilot(autopilot, command.turnDeg);
      }
      return autopilot === state.autopilot ? state : { ...state, autopilot };
    }
    case 'engine': {
      const command = action.command;
      const engine = state.engine;
      if (command === 'start' || command === 'stop') {
        const running = command === 'start';
        return engine.running === running ? state : { ...state, engine: { ...engine, running } };
      }
      if (!Number.isFinite(command.leverPct)) return state;
      const leverPct = Math.max(-100, Math.min(100, Math.round(command.leverPct)));
      return leverPct === engine.leverPct ? state : { ...state, engine: { ...engine, leverPct } };
    }
    case 'setWindMode': {
      if (state.windMode.mode === action.mode) return state;
      const windMode = initialWindMode({
        mode: action.mode,
        seed: state.windMode.seed,
        startS: state.rig.timeS,
      });
      return withTimeRule({
        ...state,
        windMode,
        wind: windNow(state.controls, windMode, state.rig.timeS),
      });
    }
    case 'setWindSize': {
      const range = sizeRange(state.windMode.mode);
      if (!range || !Number.isFinite(action.size)) return state;
      const size = Math.min(range.max, Math.max(range.min, Math.round(action.size)));
      const windMode = { ...state.windMode, size, startS: state.rig.timeS };
      return { ...state, windMode, wind: windNow(state.controls, windMode, state.rig.timeS) };
    }
    case 'newWindPattern': {
      if (state.windMode.mode === 'steady') return state;
      const seed = isSeed(action.seed) ? action.seed : state.windMode.seed;
      const windMode = { ...state.windMode, seed, startS: state.rig.timeS };
      return { ...state, windMode, wind: windNow(state.controls, windMode, state.rig.timeS) };
    }
    case 'setTimeScale':
      if (
        !isTimeScale(action.scale) ||
        state.settings.timeScale === action.scale ||
        !timeSpeedAvailable(state.boat.mode, state.windMode.mode, state.settings.timeBar)
      ) {
        return state;
      }
      return { ...state, settings: { ...state.settings, timeScale: action.scale } };
    case 'setTimeBar':
      if (state.settings.timeBar === action.timeBar) return state;
      return withTimeRule({ ...state, settings: { ...state.settings, timeBar: action.timeBar } });
    case 'repairSails':
      return state.sailDamage.main === 0 && state.sailDamage.jib === 0
        ? state
        : { ...state, sailDamage: NO_DAMAGE };
    case 'realistic': {
      let realistic = reduceRealistic(state.realistic, action.action);
      // While paused nothing runs yet: shutting the clutch then is just preparing.
      if (state.paused && realistic.notice?.key === 'closedOnRunning') {
        realistic = { ...realistic, notice: null };
      }
      return realistic === state.realistic ? state : { ...state, realistic };
    }
    case 'setPaused':
      return state.paused === action.paused ? state : { ...state, paused: action.paused };
    case 'load':
      return action.state;
    case 'step': {
      // Paused: time stands still (dt = 0), but what was prepared is shown. The time speed-up
      // (M10) multiplies the step; the boat still substeps by `integration.maxStepS`.
      const frame = Math.min(MAX_STEP_S, Math.max(0, action.dt));
      const dt = state.paused ? 0 : frame * state.settings.timeScale;
      const sailing = state.boat.mode === 'sailing';
      // The true wind at the end of this step: the mean with the wind mode's pattern.
      const wind = windNow(state.controls, state.windMode, state.rig.timeS + dt);
      const patterned = state.windMode.mode !== 'steady';
      let controls = state.controls;
      let autopilot = state.autopilot;
      // The autopilot moves the wheel's target (not through setControls: it must not switch
      // itself off).
      // Going astern the rudder turns her the other way, so a heading hold would turn her away:
      // it does not steer then (decided in the M12 PR).
      if (sailing && autopilot.mode !== 'off' && state.boat.speedMps >= 0) {
        const steered = stepAutopilot(autopilot, state.boat, wind.dirDeg, controls.ctl_rudder, dt);
        autopilot = steered.autopilot;
        controls = withControls(controls, { ctl_rudder: steered.rudderTargetDeg });
      }
      // Realistic mode: the clutches, winches and hands move the ropes, then the rig follows.
      const realistic = state.settings.ropesMode === 'realistic';
      let realisticState = state.realistic;
      if (realistic) {
        const moved = stepRealistic(state.realistic, controls, state.rig, dt);
        controls = withControls(controls, moved.values);
        realisticState = moved.state;
      }
      // The engine runs in Held still too (the boat just does not move).
      const engine = stepEngine(state.engine, dt);
      const rig = step({ controls, rig: state.rig }, dt, motionOf(state.boat), undefined, {
        instantRopes: realistic,
        wind: patterned ? wind : undefined,
        damage: state.sailDamage,
      });
      const moving = stepBoat(
        state.boat,
        {
          windDirDeg: wind.dirDeg,
          twsKn: wind.twsKn,
          rudderDeg: rig.applied.rudder,
          rig,
          controls,
          engineThrustN: engineThrustN(engine),
          damage: state.sailDamage,
          rudderLimitDeg:
            autopilot.mode === 'off' ? undefined : boatData.physics.autopilot.maxRudderDeg,
        },
        dt,
      );
      return {
        ...state,
        controls,
        rig,
        realistic: realisticState,
        boat: moving.boat,
        autopilot,
        motion: moving.report,
        wind,
        autopilotNoticeS: Math.max(0, state.autopilotNoticeS - frame),
        track: sailing ? appendTrack(state.track, moving.boat, rig.timeS) : state.track,
        sailDamage: floggingDamage(state.sailDamage, rig, dt),
        engine,
      };
    }
  }
}

export type Listener = (state: AppState, previous: AppState) => void;

export interface Store {
  getState(): AppState;
  dispatch(action: Action): void;
  subscribe(listener: Listener): () => void;
}

export function createStore(initial: AppState): Store {
  let state = initial;
  const listeners = new Set<Listener>();
  return {
    getState: () => state,
    dispatch(action) {
      const previous = state;
      state = reduce(state, action);
      if (state !== previous) listeners.forEach((listener) => listener(state, previous));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
