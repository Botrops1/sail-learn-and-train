import {
  DEFAULT_CAMERA,
  DEFAULT_SETTINGS,
  type CameraPreset,
  type CameraState,
  type Settings,
  type StepSize,
} from '../model/settings';

/**
 * The single app store (PHASE1_SPEC 9.1). M0 holds only camera and settings;
 * controls, rig and selection are added by later milestones.
 */
export interface AppState {
  camera: CameraState;
  settings: Settings;
}

export type Action =
  | { type: 'setStep'; step: StepSize }
  | { type: 'setDebug'; debug: boolean }
  | { type: 'setCameraPreset'; preset: CameraPreset };

export function initialState(overrides: Partial<AppState> = {}): AppState {
  return {
    camera: { ...DEFAULT_CAMERA, ...overrides.camera },
    settings: { ...DEFAULT_SETTINGS, ...overrides.settings },
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
