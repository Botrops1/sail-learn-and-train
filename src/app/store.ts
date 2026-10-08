import {
  DEFAULT_CAMERA,
  DEFAULT_SETTINGS,
  type CameraPreset,
  type CameraState,
  type Settings,
  type StepSize,
} from '../model/settings';

/**
 * The single app store (PHASE1_SPEC 9.1). M1 holds camera, settings and the selected part;
 * controls and rig are added by later milestones.
 */
export interface AppState {
  camera: CameraState;
  settings: Settings;
  /** Registry id of the part shown in the info card, or null. */
  selection: string | null;
}

export type Action =
  | { type: 'setStep'; step: StepSize }
  | { type: 'setDebug'; debug: boolean }
  | { type: 'setCameraPreset'; preset: CameraPreset }
  | { type: 'select'; partId: string | null };

export function initialState(overrides: Partial<AppState> = {}): AppState {
  return {
    camera: { ...DEFAULT_CAMERA, ...overrides.camera },
    settings: { ...DEFAULT_SETTINGS, ...overrides.settings },
    selection: overrides.selection ?? null,
  };
}

export function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setStep':
      return { ...state, settings: { ...state.settings, step: action.step } };
    case 'setDebug':
      return { ...state, settings: { ...state.settings, debug: action.debug } };
    case 'setCameraPreset':
      return { ...state, camera: { ...state.camera, preset: action.preset } };
    case 'select':
      return { ...state, selection: action.partId };
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
