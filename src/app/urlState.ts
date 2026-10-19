import type { AppMode } from './appMode';
import { compassDeg, knToMps, mpsToKn, wrap180, wrap360 } from '../model/angles';
import type { AutopilotState } from '../model/autopilot';
import { controlSpec, normalizeWindFrom, type ControlId, type Controls } from '../model/controls';
import { clockParam, defaultClockUtcMs, parseClockParam } from '../model/clock';
import { settledJibUnfurled } from '../model/jib';
import { isLanguage } from '../model/languages';
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
  initialGearbox,
  initialHandle,
  initialRealistic,
  isStationId,
  socketAt,
  stationWinch,
  tailSpec,
  type HandleState,
  type RealisticState,
  type StationId,
} from '../model/realistic';
import type { RigHistory } from '../model/sim';
import { boat } from '../model/boat';
import { DEFAULT_HARBOUR, type HarbourState } from '../model/harbour';
import { isMarinaLayout, isTraffic } from '../model/marina';
import { isLineCode, linesFromLink, NO_LINES, type LineCode } from '../model/mooringLines';
import type { BoatState } from '../model/motion';
import { isPlace, placeStart, type PlaceStart } from '../model/places';
import { isTimeScale } from '../model/timeScale';
import { defaultSeaSetting, isSeaSetting } from '../model/waves';
import {
  initialWindMode,
  isSeed,
  sizeRange,
  type WindModeId,
  type WindModeState,
} from '../model/windModes';
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
/** A decimal such as `0.25` (the time scale `tx`). */
const DECIMAL = /^\d+(\.\d+)?$/;

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

  // A link with `pl=` opens in that place's ready state for every key it does not give (M42).
  const harbour = parseHarbour(params);
  const start = harbour.place === 'open' ? null : placeStart(harbour);
  if (start) {
    controls.ctl_main_furl ??= 0;
    controls.ctl_jib_furl ??= 0;
    controls.ctl_jib_sheet ??= 100;
  }

  let preset: CameraPreset | undefined;
  const cam = params.get('cam');
  if (cam !== null && isCameraPreset(cam)) preset = cam;

  let selection: string | null = null;
  const sel = params.get('sel');
  if (sel !== null && isRegisteredPartId(sel)) selection = sel;
  let learn: string | null = null;
  const learnParam = params.get('learn');
  if (learnParam !== null && isRegisteredPartId(learnParam)) learn = learnParam;

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

  const langParam = params.get('lang');
  const language = langParam !== null && isLanguage(langParam) ? langParam : undefined;

  // `lg` (the rope colour legend, until M38) is read by nobody now: an old link opens the same picture.

  let labels: boolean | undefined;
  const labelsParam = params.get('lb');
  if (labelsParam === '1') labels = true;
  else if (labelsParam === '0') labels = false;

  // `mm=0` hides the mini-map; `mm=1` is the default and is accepted.
  let miniMap: boolean | undefined;
  const miniMapParam = params.get('mm');
  if (miniMapParam === '1') miniMap = true;
  else if (miniMapParam === '0') miniMap = false;

  let ropesMode: RopesMode | undefined;
  const mode = params.get('mode');
  if (mode !== null && isRopesMode(mode)) ropesMode = mode;
  // Harbour mode (`m=harbour`, M41) wins over a `learn=` key, which is then dropped. Learn mode:
  // `m=learn`, or an old link with an open entry (Phase 4 opened the Learn tab).
  const harbourMode = params.get('m') === 'harbour';
  if (harbourMode) learn = null;
  const appMode: AppMode | undefined = harbourMode
    ? 'harbour'
    : params.get('m') === 'learn' || learn !== null
      ? 'learn'
      : undefined;

  const realistic = parseRealistic(params);
  const windMode = parseWindMode(params);
  const txParam = params.get('tx');
  const timeScale = txParam !== null && DECIMAL.test(txParam) ? Number(txParam) : undefined;
  // `tb=0`: the time bar's speed part is off (then the time scale is 1: initialState).
  const timeBar = params.get('tb') === '0' ? false : undefined;
  // `clock=0`: the clock chip is hidden.
  const clockShown = params.get('clock') === '0' ? false : undefined;
  const { boat: boatState, autopilot } = parseBoat(params, controls.ctl_wind_dir ?? 60, start);
  if (start) Object.assign(boatState, parsePosition(params, start));

  // `jr`: how far the jib is out when that is less than the controls alone give (the sheet was
  // hauled against a jib furled with the sheet released). Never less than "Jib out" asked for.
  const history: RigHistory = {};
  const jr = params.get('jr');
  if (jr !== null && /^\d+$/.test(jr)) {
    const value = Number(jr);
    const asked = controls.ctl_jib_furl ?? controlSpec('ctl_jib_furl').default;
    if (value >= asked && value <= 100) history.jibUnfurled = value / 100;
  }

  const state = initialState({
    controls,
    camera: preset ? { preset } : {},
    settings: {
      ...(stepSize !== undefined ? { step: stepSize } : {}),
      ...(debug !== undefined ? { debug } : {}),
      detail,
      ...(language !== undefined ? { language } : {}),
      ...(labels !== undefined ? { labels } : {}),
      ...(miniMap !== undefined ? { miniMap } : {}),
      ...(ropesMode !== undefined ? { ropesMode } : {}),
      ...(timeScale !== undefined && isTimeScale(timeScale) ? { timeScale } : {}),
      ...(timeBar !== undefined ? { timeBar } : {}),
      ...(clockShown !== undefined ? { clock: clockShown } : {}),
    },
    selection,
    learn,
    ...(appMode !== undefined ? { appMode } : {}),
    history,
    realistic,
    boat: boatState,
    autopilot,
    windMode,
    engine: parseEngine(params, start !== null),
    sea: parseSea(params, start),
    ...parseClock(params),
    harbour,
  });
  // The lines need the boat as she lies (the far ends are our berth's), so they come last (M44).
  const lines = linesFromLink(parseLines(params), state.boat, state.harbour);
  return lines.length === 0 ? state : { ...state, lines: { ...NO_LINES, lines } };
}

/**
 * The harbour keys (PHASE7_SPEC 8.4): `fd=1` the fenders are out (M33; any other value leaves them
 * in the locker); `pl` the place, `ml` and `tr` the marina's layout and traffic (only with
 * `pl=marina`). Wrong values give the defaults.
 */
function parseHarbour(params: URLSearchParams): HarbourState {
  const pl = params.get('pl');
  const place = pl !== null && isPlace(pl) ? pl : DEFAULT_HARBOUR.place;
  const ml = params.get('ml');
  const tr = params.get('tr');
  const marina = place === 'marina';
  return {
    fendersOut: params.get('fd') === '1',
    place,
    layout: marina && ml !== null && isMarinaLayout(ml) ? ml : DEFAULT_HARBOUR.layout,
    traffic: marina && tr !== null && isTraffic(tr) ? tr : DEFAULT_HARBOUR.traffic,
    // `ba=0`: no arrow over our berth (M42; only written in a place).
    berthArrow: params.get('ba') !== '0',
    // The fenders torn off are not in the link (M43): a link opens with all of them on board.
    fendersLost: DEFAULT_HARBOUR.fendersLost,
    fenderOverSpeedS: 0,
    fendersLostSinceSlow: 0,
  };
}

/** A position in the link: up to four digits and one decimal, e.g. `-95.0`. */
const POSITION_M = /^-?\d{1,4}(\.\d)?$/;

/** `pe` and `pn` (metres east and north): both valid, or both from the place's start. */
function parsePosition(params: URLSearchParams, start: PlaceStart): Partial<BoatState> {
  const pe = params.get('pe');
  const pn = params.get('pn');
  if (pe !== null && pn !== null && POSITION_M.test(pe) && POSITION_M.test(pn)) {
    return { eastM: Number(pe), northM: Number(pn) };
  }
  return { eastM: start.eastM, northM: start.northM };
}

/** `ln=sp:2.55,ss:2.55,ll:12.33` (M44): each entry a line code and its length in metres; wrong entries are left out. */
function parseLines(params: URLSearchParams): { code: LineCode; lengthM: number }[] {
  const ln = params.get('ln');
  if (ln === null) return [];
  const found: { code: LineCode; lengthM: number }[] = [];
  for (const entry of ln.split(',')) {
    const [code, length, ...rest] = entry.split(':');
    if (code === undefined || length === undefined || rest.length > 0) continue;
    if (!isLineCode(code) || !DECIMAL.test(length) || found.some((f) => f.code === code)) continue;
    found.push({ code, lengthM: Number(length) });
  }
  return found;
}

/** The lines that are on, in the order sp, ss, ll, as `ln` (M44); nothing when none is on. */
export function linesParams(state: AppState): [string, string][] {
  if (state.harbour.place !== 'marina' || state.lines.lines.length === 0) return [];
  return [
    ['ln', state.lines.lines.map((line) => `${line.code}:${line.lengthM.toFixed(2)}`).join(',')],
  ];
}

/**
 * The place parameters (PHASE7_SPEC 8.4), written when the place is not open water: `pl`, `ml`
 * (when not medium), `tr` (when not half), `ba=0` (arrow over our berth off), then the boat's position `pe`, `pn`.
 */
export function placeParams(state: AppState): [string, string][] {
  const { place, layout, traffic, berthArrow } = state.harbour;
  if (place === 'open') return [];
  const result: [string, string][] = [['pl', place]];
  if (place === 'marina') {
    if (layout !== DEFAULT_HARBOUR.layout) result.push(['ml', layout]);
    if (traffic !== DEFAULT_HARBOUR.traffic) result.push(['tr', traffic]);
  }
  if (!berthArrow) result.push(['ba', '0']);
  const written = (metres: number) => {
    const clamped = Math.max(-9999.9, Math.min(9999.9, metres)).toFixed(1);
    return clamped === '-0.0' ? '0.0' : clamped;
  };
  result.push(['pe', written(state.boat.eastM)], ['pn', written(state.boat.northM)]);
  result.push(...linesParams(state));
  return result;
}

/**
 * The time on board (M17): `clk` = local `YYYYMMDDHHmm`. Missing or not a real time: the area's
 * default (noon, 1 June), so old links open at noon.
 */
function parseClock(params: URLSearchParams): { clockUtcMs?: number } {
  const value = params.get('clk');
  const utcMs = value === null ? null : parseClockParam(value);
  return utcMs === null ? {} : { clockUtcMs: utcMs };
}

/** The clock parameters: `clk` when the time is not the default minute, `clock=0` when hidden. */
export function clockParams(state: AppState): [string, string][] {
  const result: [string, string][] = [];
  const written = clockParam(state.clock.utcMs);
  if (written !== clockParam(defaultClockUtcMs())) result.push(['clk', written]);
  if (state.settings.clock !== DEFAULT_SETTINGS.clock) result.push(['clock', '0']);
  return result;
}

/**
 * The Waves setting (M14): `sea` = flat | sheltered | coastal | open. A link without it, or with
 * another value, opens with the default (Coastal): old links open with waves.
 */
function parseSea(params: URLSearchParams, start: PlaceStart | null = null) {
  const sea = params.get('sea');
  return sea !== null && isSeaSetting(sea) ? sea : (start?.sea ?? defaultSeaSetting());
}

/**
 * The Waves parameter: written only when the setting is not the default; in a place always (a
 * place link without it opens with the place's own sea).
 */
export function seaParams(state: AppState): [string, string][] {
  return state.sea.setting === defaultSeaSetting() && state.harbour.place === 'open'
    ? []
    : [['sea', state.sea.setting]];
}

/**
 * The engine in the link (PHASE2_SPEC 12.3): `eng=1` running, `lv` the lever in % (−100 … 100,
 * whole numbers; absent = 0, neutral). Out-of-range values are left out.
 */
function parseEngine(
  params: URLSearchParams,
  ready = false,
): { running: boolean; leverPct: number } {
  const eng = params.get('eng');
  return {
    // A place link without `eng` opens with the engine running (M42); `eng=0` stops it.
    running: eng === '1' || (ready && eng === null),
    leverPct: wholeNumber(params.get('lv'), -100, 100) ?? 0,
  };
}

/**
 * The engine parameters for a state: `eng=1` while running, `lv` when the lever is not at 0. In a
 * place a stopped engine is written `eng=0`, because a place link without `eng` runs it.
 */
export function engineParams(state: AppState): [string, string][] {
  const result: [string, string][] = [];
  if (state.engine.running) result.push(['eng', '1']);
  else if (state.harbour.place !== 'open') result.push(['eng', '0']);
  if (state.engine.leverPct !== 0) result.push(['lv', String(Math.round(state.engine.leverPct))]);
  return result;
}

/** Whole numbers only (no decimals, no text). */
function wholeNumber(value: string | null, min: number, max: number): number | undefined {
  if (value === null || !INTEGER.test(value)) return undefined;
  const number = Number(value);
  return number >= min && number <= max ? number : undefined;
}

/** The wind mode's short name in the link (`wm`); absent = steady. */
export const WIND_MODE_PARAMS: Readonly<Record<Exclude<WindModeId, 'steady'>, string>> = {
  gusty: 'gusty',
  shifty: 'shifty',
  building: 'build',
  dying: 'die',
};

/**
 * The wind mode in the link (PHASE2_SPEC 10.3): `wm` = gusty | shifty | build | die, `seed` the
 * pattern (1 … 99,999; default 1), `wg` its size (a value outside the mode's range falls back to
 * the mode's default). The pattern always starts at its beginning when a link opens.
 */
function parseWindMode(params: URLSearchParams): Partial<WindModeState> {
  const wm = params.get('wm');
  const entry = Object.entries(WIND_MODE_PARAMS).find(([, name]) => name === wm);
  if (!entry) return {};
  const mode = entry[0] as WindModeId;
  const result: Partial<WindModeState> = { mode };
  const seed = wholeNumber(params.get('seed'), 1, 99999);
  if (seed !== undefined && isSeed(seed)) result.seed = seed;
  const range = sizeRange(mode);
  const size = wholeNumber(params.get('wg'), range?.min ?? 0, range?.max ?? 0);
  if (size !== undefined) result.size = size;
  return result;
}

/** The wind-mode, time scale (`tx`) and time bar (`tb=0`) parameters: only what is not the default. */
export function windModeParams(state: AppState): [string, string][] {
  const result: [string, string][] = [];
  const { windMode, settings } = state;
  if (windMode.mode !== 'steady') {
    result.push(['wm', WIND_MODE_PARAMS[windMode.mode]]);
    if (windMode.seed !== initialWindMode().seed) result.push(['seed', String(windMode.seed)]);
    if (windMode.size !== initialWindMode({ mode: windMode.mode }).size) {
      result.push(['wg', String(windMode.size)]);
    }
  }
  if (settings.timeScale !== DEFAULT_SETTINGS.timeScale) {
    result.push(['tx', String(settings.timeScale)]);
  }
  if (settings.timeBar !== DEFAULT_SETTINGS.timeBar) result.push(['tb', '0']);
  return result;
}

/** Boat speed in the link: knots with at most one decimal, −10 … 15. */
const SPEED_KN = /^-?\d+(\.\d)?$/;
const BOAT_SPEED_KN = { min: -10, max: 15 };

const AUTOPILOT_PARAMS = { off: 'off', heading: 'hdg', wind: 'wind' } as const;

/**
 * The boat in the link (PHASE2_SPEC 6.4): `hdg` heading, `bs` speed in knots (without it she
 * starts at her steady speed), `held=1` held still, `ap=off|hdg|wind` with its target `apt`.
 * Without `ap` the autopilot holds the heading, so an old link shows the boat sailing on.
 */
function parseBoat(
  params: URLSearchParams,
  windDirDeg: number,
  start: PlaceStart | null = null,
): { boat: Partial<BoatState>; autopilot: AutopilotState } {
  // In a place (M42) what the link does not give is the place's ready state: its heading, at
  // rest, autopilot off.
  const headingDeg = wholeNumber(params.get('hdg'), 0, 359) ?? start?.headingDeg ?? 0;
  const boatState: Partial<BoatState> = { headingDeg };
  if (params.get('held') === '1') boatState.mode = 'held';
  else {
    const raw = params.get('bs');
    const kn = raw !== null && SPEED_KN.test(raw) ? Number(raw) : undefined;
    if (kn !== undefined && kn >= BOAT_SPEED_KN.min && kn <= BOAT_SPEED_KN.max) {
      boatState.speedMps = knToMps(kn);
    } else if (start) boatState.speedMps = 0;
  }
  const ap = params.get('ap');
  const mode =
    ap === 'off' ? 'off' : ap === 'wind' ? 'wind' : ap === null && start ? 'off' : 'heading';
  const apt = params.get('apt');
  const targetDeg =
    mode === 'wind'
      ? (wholeNumber(apt, -180, 180) ?? Math.round(wrap180(windDirDeg - headingDeg)))
      : (wholeNumber(apt, 0, 359) ?? headingDeg);
  return {
    boat: boatState,
    autopilot: {
      mode,
      targetDeg: mode === 'wind' ? wrap180(targetDeg) : targetDeg,
      integralDeg: 0,
    },
  };
}

/** Compass heading as a whole number, 0–359. */
function headingParam(boat: BoatState): number {
  return wrap360(Math.round(boat.headingDeg)) % 360;
}

/**
 * The boat parameters for a state (PHASE2_SPEC 6.4): `hdg` when not 0, `bs` while sailing,
 * `held` when held still, `ap` and `apt` unless the autopilot holds the heading.
 */
export function boatParams(state: AppState): [string, string][] {
  const result: [string, string][] = [];
  const { boat: boatState, autopilot } = state;
  const heading = headingParam(boatState);
  // In a place `hdg` is always written: a link without it opens at the place's heading (east in the marina).
  if (heading !== 0 || state.harbour.place !== 'open') result.push(['hdg', String(heading)]);
  if (boatState.mode === 'held') result.push(['held', '1']);
  else {
    const kn = Math.round(mpsToKn(boatState.speedMps) * 10) / 10;
    const clamped = Math.min(BOAT_SPEED_KN.max, Math.max(BOAT_SPEED_KN.min, kn));
    result.push(['bs', (clamped === 0 ? 0 : clamped).toFixed(1)]);
  }
  const target = Math.round(autopilot.targetDeg);
  const holdsHeading = autopilot.mode === 'heading' && wrap360(target) % 360 === heading;
  // In a place a link without `ap` means off, so a heading hold is written too.
  if (holdsHeading && state.harbour.place !== 'open') result.push(['ap', 'hdg']);
  if (!holdsHeading) {
    result.push(['ap', AUTOPILOT_PARAMS[autopilot.mode]]);
    if (autopilot.mode === 'heading') result.push(['apt', String(compassDeg(target) % 360)]);
    if (autopilot.mode === 'wind') result.push(['apt', String(wrap180(target))]);
  }
  return result;
}

/**
 * Realistic mode in the link (PHASE1_SPEC 9.2, decided in M4b): `st` the station (when not
 * Port), `co` the open clutches by key (e.g. `co=a5,b3`), and one parameter per winch with the
 * rope on it: `wp` (port winch) and `wsb` (starboard winch), as `<clutch key>.<turns>.<t|h>`
 * (turns negative = wrapped anticlockwise; t = tail in the self-tailer, h = in the hand), e.g.
 * `wsb=a5.3.t`. M4c adds `hd` (the winch handle, see parseHandle) and `gb` (the mast gearbox
 * switch, `in` or `out`). Cranking the handle is not stored. Anything invalid is left out
 * silently.
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
    winch.selfTailer = hold === 't' && turns > 0;
  }
  const handle = parseHandle(params.get('hd'), state.station);
  if (handle) state.handle = handle;
  const gearbox = params.get('gb');
  if (gearbox === 'in' || gearbox === 'out') state.gearbox = gearbox;
  return state;
}

/**
 * The winch handle in the link (M4c): `hd=c` carried by the user, `hd=<station>.s` lying at a
 * station, `hd=<station>.w` in the socket there (the winch, or the mast gearbox). Only written
 * when it is not where it starts. A socket where there is none (the helm) is ignored.
 */
function parseHandle(value: string | null, station: StationId): HandleState | null {
  if (value === null) return null;
  const start = initialHandle();
  if (value === 'c') return { ...start, station, place: 'carried' };
  const match = /^([a-z]+)\.([sw])$/.exec(value);
  const at = match?.[1] ?? '';
  if (!match || !isStationId(at)) return null;
  if (match[2] === 'w' && !socketAt(at)) return null;
  return { ...start, station: at, place: match[2] === 'w' ? 'socket' : 'stowed' };
}

function handleParam(handle: HandleState): string | null {
  const start = initialHandle();
  if (handle.place === 'carried') return 'c';
  if (handle.place === start.place && handle.station === start.station) return null;
  return `${handle.station}.${handle.place === 'socket' ? 'w' : 's'}`;
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
  const handle = handleParam(state.handle);
  if (handle) result.push(['hd', handle]);
  if (state.gearbox !== initialGearbox()) result.push(['gb', state.gearbox]);
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
  if (state.appMode === 'learn' || state.appMode === 'harbour') params.set('m', state.appMode);
  if (state.selection) params.set('sel', state.selection);
  // The open entry is written only in Learn mode: a link with `learn=` opens in Learn mode.
  if (state.appMode === 'learn' && state.learn) params.set('learn', state.learn);
  params.set('step', String(state.settings.step));
  params.set('detail', state.settings.detail);
  if (state.settings.language !== DEFAULT_SETTINGS.language) {
    params.set('lang', state.settings.language);
  }
  // Settings that are rarely changed are only written when they differ from the default.
  if (state.settings.labels !== DEFAULT_SETTINGS.labels) {
    params.set('lb', state.settings.labels ? '1' : '0');
  }
  if (state.settings.miniMap !== DEFAULT_SETTINGS.miniMap) {
    params.set('mm', '0');
  }
  if (state.settings.ropesMode !== DEFAULT_SETTINGS.ropesMode) {
    params.set('mode', state.settings.ropesMode);
  }
  for (const [name, value] of boatParams(state)) params.set(name, value);
  for (const [name, value] of windModeParams(state)) params.set(name, value);
  for (const [name, value] of seaParams(state)) params.set(name, value);
  for (const [name, value] of engineParams(state)) params.set(name, value);
  for (const [name, value] of placeParams(state)) params.set(name, value);
  for (const [name, value] of clockParams(state)) params.set(name, value);
  if (state.harbour.fendersOut) params.set('fd', '1');
  for (const [name, value] of realisticParams(state.realistic)) params.set(name, value);
  if (state.settings.debug) params.set('debug', '1');
  // Commas and colons need no escaping in a query (co=a5,b3 and ln=sp:2.55 stay readable).
  return `?${params.toString().replace(/%2C/g, ',').replace(/%3A/g, ':')}`;
}
