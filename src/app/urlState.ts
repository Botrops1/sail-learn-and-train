import { isRegisteredPartId } from '../model/registry';
import { isCameraPreset, isStepSize } from '../model/settings';
import { initialState, type AppState } from './store';

/** URL schema version (PHASE1_SPEC 9.2). Bump when a parameter changes meaning. */
export const URL_STATE_VERSION = 1;

/**
 * Reads the app state from a query string such as `?cam=top&step=1&debug=1`.
 * Unknown or out-of-range values fall back to the defaults silently (PHASE1_SPEC 9.2).
 * M1 knows `cam`, `sel`, `step` and `debug`. `cam=free` opens the default view: the position
 * of a hand-moved camera is not stored.
 */
export function parseUrlState(search: string): AppState {
  const params = new URLSearchParams(search);
  const state = initialState();

  const cam = params.get('cam');
  if (cam !== null && isCameraPreset(cam)) state.camera.preset = cam;

  const sel = params.get('sel');
  if (sel !== null && isRegisteredPartId(sel)) state.selection = sel;

  const step = params.get('step');
  if (step !== null && /^\d+$/.test(step)) {
    const value = Number(step);
    if (isStepSize(value)) state.settings.step = value;
  }

  const debug = params.get('debug');
  if (debug === '1') state.settings.debug = true;
  else if (debug === '0') state.settings.debug = false;

  return state;
}

/** Writes the state as a readable query string (with the leading `?`). */
export function serializeUrlState(state: AppState): string {
  const params = new URLSearchParams();
  params.set('v', String(URL_STATE_VERSION));
  params.set('cam', state.camera.preset);
  if (state.selection) params.set('sel', state.selection);
  params.set('step', String(state.settings.step));
  if (state.settings.debug) params.set('debug', '1');
  return `?${params.toString()}`;
}
