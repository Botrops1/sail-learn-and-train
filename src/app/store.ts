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
}

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
}

/** The boat a link describes (PHASE2_SPEC 6.4): without a speed she starts at her steady speed. */
function boatFor(controls: Controls, overrides: Partial<BoatState> = {}): BoatState {
  const mode = overrides.mode ?? 'sailing';
  const headingDeg = overrides.headingDeg ?? 0;
  if (mode === 'held') {
    return initialBoat({ ...overrides, mode, headingDeg, speedMps: 0, yawRateDegS: 0, heelDeg: 0 });
  }
  const speedMps = overrides.speedMps ?? steadyState(controls, headingDeg).speedMps;
  return initialBoat({ ...overrides, mode, headingDeg, speedMps });
}

function motionOf(boat: BoatState): BoatMotion {
  return { velocity: [boat.speedMps, 0, 0], headingDeg: boat.headingDeg };
}

export function initialState(overrides: InitialOverrides = {}): AppState {
  const controls = { ...defaultControls(), ...overrides.controls };
  const boat = boatFor(controls, overrides.boat);
  return {
    controls,
    // A link opens with the rig already settled for the apparent wind: no swing on load.
    rig: initialRig(controls, undefined, overrides.history, motionOf(boat)),
    camera: { ...DEFAULT_CAMERA, ...overrides.camera },
    settings: { ...DEFAULT_SETTINGS, ...overrides.settings },
    selection: overrides.selection ?? null,
    realistic: overrides.realistic ?? initialRealistic(),
    paused: false,
    boat,
    autopilot: overrides.autopilot ?? engageAutopilot('heading', boat, controls.ctl_wind_dir),
    motion: null,
    autopilotNoticeS: 0,
  };
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
      return { ...defaults, rig: state.rig };
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
            }
          : { ...state.boat, mode: 'sailing' };
      return { ...state, boat };
    }
    case 'autopilot': {
      const command = action.command;
      const windDirDeg = state.controls.ctl_wind_dir;
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
      // Paused: time stands still (dt = 0), but what was prepared is shown.
      const frame = Math.min(MAX_STEP_S, Math.max(0, action.dt));
      const dt = state.paused ? 0 : frame;
      const sailing = state.boat.mode === 'sailing';
      let controls = state.controls;
      let autopilot = state.autopilot;
      // The autopilot moves the wheel's target (not through setControls: it must not switch
      // itself off).
      if (sailing && autopilot.mode !== 'off') {
        const steered = stepAutopilot(
          autopilot,
          state.boat,
          controls.ctl_wind_dir,
          controls.ctl_rudder,
          dt,
        );
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
      const rig = step({ controls, rig: state.rig }, dt, motionOf(state.boat), undefined, {
        instantRopes: realistic,
      });
      const moving = stepBoat(
        state.boat,
        {
          windDirDeg: controls.ctl_wind_dir,
          twsKn: controls.ctl_wind_speed,
          rudderDeg: rig.applied.rudder,
          rig,
          controls,
          engineThrustN: 0,
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
        autopilotNoticeS: Math.max(0, state.autopilotNoticeS - frame),
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
