import { controlSpec, normalizeWindFrom, type ControlId, type Controls } from '../model/controls';
import { settledJibUnfurled } from '../model/jib';
import { isRegisteredPartId } from '../model/registry';
import {
  DEFAULT_SETTINGS,
  isCameraPreset,
  isDetail,
  isRopesMode,
  isStepSize,
  type CameraPreset,
  type Detail,
  type RopesMode,
  type StepSize,
} from '../model/settings';
import {
  initialRealistic,
  isStationId,
  stationWinch,
  tailSpec,
  type RealisticState,
  type StationId,
} from '../model/realistic';
import type { RigHistory } from '../model/sim';
import { boat } from '../model/boat';
import { initialState, type AppState } from './store';

/** URL schema version (PHASE1_SPEC 9.2). Bump when a parameter changes meaning. */
export const URL_STATE_VERSION = 1;

/**
 * Every control in the URL, with its short name (PHASE1_SPEC 9.2, WORKFLOW 5). M2 added the
 * boom and wind controls, M3 the jib (`js`, `jf`), M4a the wheel (`rd`).
 */
export const URL_CONTROLS: readonly (readonly [string, ControlId])[] = [
  ['ms', 'ctl_mainsheet'],
  ['js', 'ctl_jib_sheet'],
  ['vg', 'ctl_vang'],
  ['tl', 'ctl_topping_lift'],
  ['mf', 'ctl_main_furl'],
  ['jf', 'ctl_jib_furl'],
  ['rd', 'ctl_rudder'],
  ['wd', 'ctl_wind_dir'],
  ['ws', 'ctl_wind_speed'],
];

const INTEGER = /^-?\d+$/;

/**
 * Reads the app state from a query string such as `?ms=35&wd=60&cam=top&step=1&debug=1`.
 * Unknown or out-of-range values fall back to the defaults silently (PHASE1_SPEC 9.2).
 * Control values are whole numbers. `cam=free` opens the default view: the position of a
 * hand-moved camera is not stored. `detail=high|low` (M3b); without it, `fallbackDetail` (the
 * app passes the default for the screen size: low on phones).
 */
export function parseUrlState(
  search: string,
  fallbackDetail: Detail = DEFAULT_SETTINGS.detail,
): AppState {
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

  const detailParam = params.get('detail');
  const detail = detailParam !== null && isDetail(detailParam) ? detailParam : fallbackDetail;

  let debug: boolean | undefined;
  const debugParam = params.get('debug');
  if (debugParam === '1') debug = true;
  else if (debugParam === '0') debug = false;

  let legend: boolean | undefined;
  const legendParam = params.get('lg');
  if (legendParam === '1') legend = true;
  else if (legendParam === '0') legend = false;

  let ropesMode: RopesMode | undefined;
  const mode = params.get('mode');
  if (mode !== null && isRopesMode(mode)) ropesMode = mode;

  const realistic = parseRealistic(params);

  // `jr`: how far the jib is out when that is less than the controls alone give (the sheet was
  // hauled against a jib furled with the sheet released). Never less than "Jib out" asked for.
  const history: RigHistory = {};
  const jr = params.get('jr');
  if (jr !== null && /^\d+$/.test(jr)) {
    const value = Number(jr);
    const asked = controls.ctl_jib_furl ?? controlSpec('ctl_jib_furl').default;
    if (value >= asked && value <= 100) history.jibUnfurled = value / 100;
  }

  return initialState({
    controls,
    camera: preset ? { preset } : {},
    settings: {
      ...(stepSize !== undefined ? { step: stepSize } : {}),
      ...(debug !== undefined ? { debug } : {}),
      detail,
      ...(legend !== undefined ? { legend } : {}),
      ...(ropesMode !== undefined ? { ropesMode } : {}),
    },
    selection,
    history,
    realistic,
  });
}

/**
 * Realistic mode in the link (PHASE1_SPEC 9.2, decided in M4b): `st` the station (when not
 * Port), `co` the open clutches by key (e.g. `co=a5,b3`), and one parameter per winch with the
 * rope on it: `wp` (port winch) and `wsb` (starboard winch), as `<clutch key>.<turns>.<t|h>`
 * (turns negative = wrapped anticlockwise; t = tail in the self-tailer, h = in the hand), e.g.
 * `wsb=a5.3.t`. Anything invalid is left out silently.
 */
export const WINCH_PARAMS: Readonly<Record<string, string>> = { port: 'wp', starboard: 'wsb' };

const WINCH_VALUE = /^([a-z]\d+)\.(-?\d)\.([th])$/;

function parseRealistic(params: URLSearchParams): RealisticState {
  const state = initialRealistic();
  const station = params.get('st');
  if (station !== null && isStationId(station)) state.station = station;
  for (const key of (params.get('co') ?? '').split(',')) {
    if (tailSpec(key)?.controlId) state.open[key] = true;
  }
  const maxTurns = boat.realisticMode.capstan.maxTurns;
  for (const [stationId, name] of Object.entries(WINCH_PARAMS)) {
    const match = WINCH_VALUE.exec(params.get(name) ?? '');
    const winchId = isStationId(stationId) ? stationWinch(stationId) : null;
    const winch = winchId ? state.winches[winchId] : undefined;
    if (!match || !winch) continue;
    const [, key = '', turnsText = '0', hold] = match;
    const spec = tailSpec(key);
    const turns = Number(turnsText);
    if (!spec?.controlId || spec.winchId !== winchId || Math.abs(turns) > maxTurns) continue;
    winch.tail = key;
    winch.turns = turns;
    winch.selfTailer = hold === 't' && turns !== 0;
  }
  return state;
}

/**
 * The Realistic-mode parameters for a state. A rope running out is not stored (PHASE1_SPEC
 * 7.2.2): its clutch is written closed, so the link opens with everything held.
 */
export function realisticParams(state: RealisticState): [string, string][] {
  const result: [string, string][] = [];
  if (state.station !== 'port') result.push(['st', state.station]);
  const open = Object.keys(state.open)
    .filter((key) => state.open[key] && state.reports[key]?.motion !== 'running')
    .sort();
  if (open.length > 0) result.push(['co', open.join(',')]);
  for (const [stationId, name] of Object.entries(WINCH_PARAMS)) {
    const winchId = stationWinch(stationId as StationId);
    const winch = winchId ? state.winches[winchId] : undefined;
    if (!winch?.tail) continue;
    result.push([name, `${winch.tail}.${winch.turns}.${winch.selfTailer ? 't' : 'h'}`]);
  }
  return result;
}

/** Below this (as a fraction) the furl a link restores is the same as without `jr`. */
const JR_TOLERANCE = 0.005;

/**
 * The jib's furl for `jr`, as a whole percentage, or null when a link without it opens the same:
 * where the jib settles from now, compared with where it settles from fully out.
 */
export function jibReachedParam(state: AppState): number | null {
  const { ctl_jib_sheet: sheet, ctl_jib_furl: furl } = state.controls;
  const settled = settledJibUnfurled(sheet, furl, state.rig.jibSolution.unfurled);
  const fresh = settledJibUnfurled(sheet, furl, 1);
  const percent = Math.round(settled * 100);
  return fresh - settled > JR_TOLERANCE && percent < Math.round(fresh * 100) ? percent : null;
}

/** Writes the state as a readable query string (with the leading `?`). */
export function serializeUrlState(state: AppState): string {
  const params = new URLSearchParams();
  params.set('v', String(URL_STATE_VERSION));
  for (const [key, id] of URL_CONTROLS) params.set(key, String(Math.round(state.controls[id])));
  const jr = jibReachedParam(state);
  if (jr !== null) params.set('jr', String(jr));
  params.set('cam', state.camera.preset);
  if (state.selection) params.set('sel', state.selection);
  params.set('step', String(state.settings.step));
  params.set('detail', state.settings.detail);
  // Settings that are rarely changed are only written when they differ from the default.
  if (state.settings.legend !== DEFAULT_SETTINGS.legend) {
    params.set('lg', state.settings.legend ? '1' : '0');
  }
  if (state.settings.ropesMode !== DEFAULT_SETTINGS.ropesMode) {
    params.set('mode', state.settings.ropesMode);
  }
  for (const [name, value] of realisticParams(state.realistic)) params.set(name, value);
  if (state.settings.debug) params.set('debug', '1');
  // Commas need no escaping in a query (co=a5,b3 stays readable).
  return `?${params.toString().replace(/%2C/g, ',')}`;
}
