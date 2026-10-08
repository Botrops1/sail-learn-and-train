import { clampControl, defaultControls, type ControlId, type Controls } from '../model/controls';
import {
  DEFAULT_CAMERA,
  DEFAULT_SETTINGS,
  type CameraPreset,
  type CameraState,
  type RopesMode,
  type Settings,
  type StepSize,
} from '../model/settings';
import { initialRig, step, type RigHistory, type RigState } from '../model/sim';

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
}

export type Action =
  | { type: 'setStep'; step: StepSize }
  | { type: 'setDebug'; debug: boolean }
  | { type: 'setRopesMode'; mode: RopesMode }
  | { type: 'setLegend'; legend: boolean }
  /** Reset all (View tab): controls, camera, selection and settings back to the defaults. */
  | { type: 'reset' }
  | { type: 'setCameraPreset'; preset: CameraPreset }
  | { type: 'select'; partId: string | null }
  | { type: 'setControls'; values: Partial<Controls> }
  | { type: 'step'; dt: number };

export interface InitialOverrides {
  controls?: Partial<Controls>;
  camera?: Partial<CameraState>;
  settings?: Partial<Settings>;
  selection?: string | null;
  /** From a shared link: rig history the controls alone do not give (see RigHistory). */
  history?: RigHistory;
}

export function initialState(overrides: InitialOverrides = {}): AppState {
  const controls = { ...defaultControls(), ...overrides.controls };
  return {
    controls,
    // A link opens with the rig already settled: no swing from the centre on load.
    rig: initialRig(controls, undefined, overrides.history),
    camera: { ...DEFAULT_CAMERA, ...overrides.camera },
    settings: { ...DEFAULT_SETTINGS, ...overrides.settings },
    selection: overrides.selection ?? null,
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

export function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setStep':
      return { ...state, settings: { ...state.settings, step: action.step } };
    case 'setDebug':
      return { ...state, settings: { ...state.settings, debug: action.debug } };
    case 'setRopesMode':
      return { ...state, settings: { ...state.settings, ropesMode: action.mode } };
    case 'setLegend':
      return { ...state, settings: { ...state.settings, legend: action.legend } };
    case 'reset': {
      // The rig keeps moving from where it is, so the boom and sails swing back visibly. The
      // debug overlay is a tool, not part of what is shown: it stays as it is.
      const defaults = initialState({ settings: { debug: state.settings.debug } });
      return { ...defaults, rig: state.rig };
    }
    case 'setCameraPreset':
      return { ...state, camera: { ...state.camera, preset: action.preset } };
    case 'select':
      return { ...state, selection: action.partId };
    case 'setControls': {
      const controls = withControls(state.controls, action.values);
      return controls === state.controls ? state : { ...state, controls };
    }
    case 'step': {
      const dt = Math.min(MAX_STEP_S, Math.max(0, action.dt));
      return { ...state, rig: step({ controls: state.controls, rig: state.rig }, dt) };
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
