import { defaultControls, type Controls } from '../src/model/controls';
import { steadyState } from '../src/model/motion';
import { mpsToKn } from '../src/model/angles';

export const MAIN_SHEETS = [0, 2, 4, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100];
export const JIB_SHEETS = [0, 25, 50, 75, 100];

/** Controls for a calibration run: wind from `twa` with heading 0 (PHASE2_SPEC 6.3). */
export function trimmed(twsKn: number, twaDeg: number, main: number, jib: number): Controls {
  return {
    ...defaultControls(),
    ctl_wind_dir: twaDeg,
    ctl_wind_speed: twsKn,
    ctl_mainsheet: main,
    ctl_jib_sheet: jib,
  };
}

export interface Best {
  speedKn: number;
  main: number;
  jib: number;
}

/** The fastest steady speed over the sheet grid of PHASE2_SPEC 6.3. */
export function best(twsKn: number, twaDeg: number): Best {
  let result: Best = { speedKn: -Infinity, main: 0, jib: 0 };
  for (const main of MAIN_SHEETS) {
    for (const jib of JIB_SHEETS) {
      const speedKn = mpsToKn(steadyState(trimmed(twsKn, twaDeg, main, jib), 0).speedMps);
      if (speedKn > result.speedKn) result = { speedKn, main, jib };
    }
  }
  return result;
}

export function bestSpeedKn(twsKn: number, twaDeg: number): number {
  return best(twsKn, twaDeg).speedKn;
}

import {
  initialState,
  reduce,
  type Action,
  type AppState,
  type InitialOverrides,
} from '../src/app/store';

/** Steps the store's reducer for `seconds` at `fps`. */
export function run(
  state: AppState,
  seconds: number,
  fps = 60,
  onFrame?: (s: AppState, t: number) => AppState,
): AppState {
  let s = state;
  const frames = Math.round(seconds * fps);
  for (let i = 0; i < frames; i += 1) {
    s = reduce(s, { type: 'step', dt: 1 / fps });
    if (onFrame) s = onFrame(s, (i + 1) / fps);
  }
  return s;
}

export function act(state: AppState, ...actions: Action[]): AppState {
  return actions.reduce((s, action) => reduce(s, action), state);
}

export { initialState };
export type { InitialOverrides };
