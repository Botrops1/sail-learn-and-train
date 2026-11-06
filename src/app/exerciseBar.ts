import { isControlId } from '../model/controls';
import type { ExerciseDef } from '../model/exercises';
import { isLineCode } from '../model/mooringLines';
import { stationWinch, tailSpec, type StationId } from '../model/realistic';
import type { RopesMode } from '../model/settings';
import type { RealisticAction } from '../model/realistic';
import type { Action, AppState } from './store';

/**
 * The step bar's rows (PHASE10_PHONE_SPEC 3.1, 3.2, 6.3): which controls a step shows over the 3D
 * view. Pure (no DOM): the DOM part is `src/ui/exerciseBar.ts`.
 *
 * A row id is one of `control:<ControlId>`, `autopilot:turn`, `autopilot:mode`, `autopilot:tack`,
 * `engine`, `thrusters`, `line:<LineCode>`, `fenders`, `windlass`. M82 adds, for the rope stations of
 * Realistic ropes, `clutch:<StationId>:<clutch key>` and `winch:<StationId>:<winch id>:<rope key>`
 * (a step's `barRealistic` data). The placeholder `ropes` is made by `barRowsFor` for Realistic
 * ropes and never stored in the data; the station switch's `stations` only names a flash.
 */
export type BarRowId = string;

/** Engine lever step of the bar's Astern / Ahead buttons, % (the neutral band is ±10 %). */
export const BAR_LEVER_STEP_PCT = 5;
/** At most this many rows in one step. */
export const BAR_MAX_ROWS = 4;

const PLAIN_ROWS: readonly string[] = [
  'autopilot:turn',
  'autopilot:mode',
  'autopilot:tack',
  'engine',
  'thrusters',
  'fenders',
  'windlass',
];

/** M82: the two stations that have clutches and a winch. */
const ROPE_STATIONS: readonly string[] = ['port', 'starboard'];
/** M82: how many turns on the drum before the bar offers the self-tailer (PHASE1_SPEC 7.2.2). */
export const BAR_TURNS_BEFORE_TAILER = 3;

export type RealisticRow =
  | { kind: 'clutch'; station: StationId; key: string }
  | { kind: 'winch'; station: StationId; winch: string; key: string };

/**
 * M82: `clutch:<station>:<key>` and `winch:<station>:<winch>:<key>` read apart, or null when the
 * station, the clutch key or the winch does not exist in the boat data (a clutch must be at that
 * station; the winch must be that station's and must be able to take that rope).
 */
export function parseRealisticRow(id: string): RealisticRow | null {
  const parts = id.split(':');
  const [kind, station] = parts;
  if (!station || !ROPE_STATIONS.includes(station)) return null;
  if (kind === 'clutch' && parts.length === 3) {
    const spec = tailSpec(parts[2] ?? '');
    return spec && spec.station === station
      ? { kind, station: station as StationId, key: spec.key }
      : null;
  }
  if (kind === 'winch' && parts.length === 4) {
    const spec = tailSpec(parts[3] ?? '');
    const winch = parts[2] ?? '';
    if (!spec || stationWinch(station as StationId) !== winch || spec.winchId !== winch)
      return null;
    return { kind, station: station as StationId, winch, key: spec.key };
  }
  return null;
}

/**
 * True for every row form of the data with a known control id, line code, station, clutch key and
 * winch id.
 */
export function isBarRowId(id: string): boolean {
  if (PLAIN_ROWS.includes(id)) return true;
  if (id.startsWith('clutch:') || id.startsWith('winch:')) return parseRealisticRow(id) !== null;
  if (id.startsWith('control:')) return isControlId(id.slice('control:'.length));
  if (id.startsWith('line:')) return isLineCode(id.slice('line:'.length));
  return false;
}

/**
 * The rows of a step. Realistic ropes: the rope controls (every control but the wheel) are
 * replaced by one `ropes` row, placed where the first of them was (the rope stations are not in
 * the bar, 6.5). Harbour bars hold no rope rows, so nothing changes there.
 * M82: a step with a `barRealistic` list (an empty one included) shows that list as it is.
 */
export function barRowsFor(def: ExerciseDef, step: number, ropes: RopesMode): BarRowId[] {
  const stepDef = def.steps[step];
  if (ropes === 'realistic' && stepDef?.barRealistic) return [...stepDef.barRealistic];
  const rows = [...(stepDef?.bar ?? [])];
  if (ropes !== 'realistic') return rows;
  const out: BarRowId[] = [];
  let placed = false;
  for (const row of rows) {
    if (row.startsWith('control:') && row !== 'control:ctl_rudder') {
      if (!placed) out.push('ropes');
      placed = true;
    } else out.push(row);
  }
  return out;
}

/** The rows an action works (the bar lights them up and keeps its own state in step). */
export function barRowOf(action: Action): BarRowId[] {
  switch (action.type) {
    case 'setControls':
      return Object.keys(action.values).map((id) => `control:${id}`);
    case 'autopilot': {
      const c = action.command;
      if (c === 'tack') return ['autopilot:tack'];
      if (typeof c === 'object') return ['autopilot:turn'];
      return ['autopilot:mode'];
    }
    case 'engine':
      return ['engine'];
    case 'thruster':
      return ['thrusters'];
    case 'line':
      return [`line:${action.code}`];
    case 'setFenders':
      return ['fenders'];
    case 'windlass':
      return ['windlass'];
    case 'realistic':
      return realisticRowOf(action.action);
    default:
      return [];
  }
}

/** M82: the row a Realistic gesture works; a winch gesture names the winch, any rope (`:*`). */
function realisticRowOf(gesture: RealisticAction): BarRowId[] {
  switch (gesture.type) {
    case 'station':
      return ['stations'];
    case 'clutch': {
      const spec = tailSpec(gesture.key);
      return spec ? [`clutch:${spec.station}:${spec.key}`] : [];
    }
    case 'onWinch': {
      const spec = tailSpec(gesture.key);
      return spec ? [`winch:${spec.station}:${spec.winchId}:${spec.key}`] : [];
    }
    case 'turn':
    case 'selfTailer':
    case 'button':
    case 'offWinch': {
      const station = ROPE_STATIONS.find((s) => stationWinch(s as StationId) === gesture.winch);
      return station ? [`winch:${station}:${gesture.winch}:*`] : [];
    }
    default:
      return [];
  }
}

/** M82: a row id (from `barRowOf`, which may end in `:*` for any rope) names this shown row. */
export function rowMatches(shownRow: BarRowId, workedRow: BarRowId): boolean {
  if (shownRow === workedRow) return true;
  return workedRow.endsWith(':*') && shownRow.startsWith(workedRow.slice(0, -1));
}

/** A run is active: it is running or waiting on a mistake (3.1). */
/**
 * M81: which demo card the stack shows, from the state alone. 'stepDone': Watch has finished a step
 * and time stands still. 'nowYou': Show me has played its step (or the last one, status done).
 */
export function demoCardKind(state: AppState): 'stepDone' | 'nowYou' | null {
  const run = state.exercise;
  if (run === null) return null;
  if (run.demo === 'watch' && run.status === 'running' && run.stepPause) return 'stepDone';
  if (run.demo === 'showMe' && (run.step > run.demoStep || run.status === 'done')) return 'nowYou';
  return null;
}

export function barShown(state: AppState): boolean {
  const run = state.exercise;
  return run !== null && (run.status === 'running' || run.status === 'mistake');
}
