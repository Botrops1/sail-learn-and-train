import { controlSpec, normalizeWindFrom, type ControlId, type Controls } from '../model/controls';
import { isRegisteredPartId } from '../model/registry';
import { isCameraPreset, isStepSize, type CameraPreset, type StepSize } from '../model/settings';
import { initialState, type AppState } from './store';

/** URL schema version (PHASE1_SPEC 9.2). Bump when a parameter changes meaning. */
export const URL_STATE_VERSION = 1;

/**
 * Controls in the URL so far, with their short names (PHASE1_SPEC 9.2, WORKFLOW 5). M2 adds the
 * boom and wind controls; the jib (`js`, `jf`) and the wheel (`rd`) follow with their milestones.
 */
export const URL_CONTROLS: readonly (readonly [string, ControlId])[] = [
  ['ms', 'ctl_mainsheet'],
  ['vg', 'ctl_vang'],
  ['tl', 'ctl_topping_lift'],
  ['mf', 'ctl_main_furl'],
  ['wd', 'ctl_wind_dir'],
  ['ws', 'ctl_wind_speed'],
];

const INTEGER = /^-?\d+$/;

/**
 * Reads the app state from a query string such as `?ms=35&wd=60&cam=top&step=1&debug=1`.
 * Unknown or out-of-range values fall back to the defaults silently (PHASE1_SPEC 9.2).
 * Control values are whole numbers. `cam=free` opens the default view: the position of a
 * hand-moved camera is not stored.
 */
export function parseUrlState(search: string): AppState {
  const params = new URLSearchParams(search);

  const controls: Partial<Controls> = {};
  for (const [key, id] of URL_CONTROLS) {
    const raw = params.get(key);
    if (raw === null || !INTEGER.test(raw)) continue;
    const value = Number(raw);
    const spec = controlSpec(id);
    if (value < spec.min || value > spec.max) continue;
    controls[id] = id === 'ctl_wind_dir' ? normalizeWindFrom(value) : value;
  }

  let preset: CameraPreset | undefined;
  const cam = params.get('cam');
  if (cam !== null && isCameraPreset(cam)) preset = cam;

  let selection: string | null = null;
  const sel = params.get('sel');
  if (sel !== null && isRegisteredPartId(sel)) selection = sel;

  let stepSize: StepSize | undefined;
  const step = params.get('step');
  if (step !== null && /^\d+$/.test(step)) {
    const value = Number(step);
    if (isStepSize(value)) stepSize = value;
  }

  let debug: boolean | undefined;
  const debugParam = params.get('debug');
  if (debugParam === '1') debug = true;
  else if (debugParam === '0') debug = false;

  return initialState({
    controls,
    camera: preset ? { preset } : {},
    settings: {
      ...(stepSize !== undefined ? { step: stepSize } : {}),
      ...(debug !== undefined ? { debug } : {}),
    },
    selection,
  });
}

/** Writes the state as a readable query string (with the leading `?`). */
export function serializeUrlState(state: AppState): string {
  const params = new URLSearchParams();
  params.set('v', String(URL_STATE_VERSION));
  for (const [key, id] of URL_CONTROLS) params.set(key, String(Math.round(state.controls[id])));
  params.set('cam', state.camera.preset);
  if (state.selection) params.set('sel', state.selection);
  params.set('step', String(state.settings.step));
  if (state.settings.debug) params.set('debug', '1');
  return `?${params.toString()}`;
}
