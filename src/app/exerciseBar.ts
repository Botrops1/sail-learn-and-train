import { isControlId } from '../model/controls';
import type { ExerciseDef } from '../model/exercises';
import { isLineCode } from '../model/mooringLines';
import type { RopesMode } from '../model/settings';
import type { Action, AppState } from './store';

/**
 * The step bar's rows (PHASE10_PHONE_SPEC 3.1, 3.2, 6.3): which controls a step shows over the 3D
 * view. Pure (no DOM): the DOM part is `src/ui/exerciseBar.ts`.
 *
 * A row id is one of `control:<ControlId>`, `autopilot:turn`, `autopilot:mode`, `autopilot:tack`,
 * `engine`, `thrusters`, `line:<LineCode>`, `fenders`, `windlass`. The placeholder `ropes` is made
 * by `barRowsFor` for Realistic ropes and never stored in the data.
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

/** True for every row form of the data with a known control id or line code. */
export function isBarRowId(id: string): boolean {
  if (PLAIN_ROWS.includes(id)) return true;
  if (id.startsWith('control:')) return isControlId(id.slice('control:'.length));
  if (id.startsWith('line:')) return isLineCode(id.slice('line:'.length));
  return false;
}

/**
 * The rows of a step. Realistic ropes: the rope controls (every control but the wheel) are
 * replaced by one `ropes` row, placed where the first of them was (the rope stations are not in
 * the bar, 6.5). Harbour bars hold no rope rows, so nothing changes there.
 */
export function barRowsFor(def: ExerciseDef, step: number, ropes: RopesMode): BarRowId[] {
  const rows = [...(def.steps[step]?.bar ?? [])];
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
    default:
      return [];
  }
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
