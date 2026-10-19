import { defaultControls, type Controls } from '../src/model/controls';
import { steadyState } from '../src/model/motion';
import { mpsToKn } from '../src/model/angles';
import { boat } from '../src/model/boat';
import {
  linesFromLink,
  lineTension,
  type LineCode,
  type MooringLine,
} from '../src/model/mooringLines';

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
  /** Absolute heel at that speed, degrees (0 unless `heel`). */
  heelDeg: number;
}

/** The fastest steady speed over the sheet grid of PHASE2_SPEC 6.3. */
export function best(twsKn: number, twaDeg: number, heel = false): Best {
  let result: Best = { speedKn: -Infinity, main: 0, jib: 0, heelDeg: 0 };
  for (const main of MAIN_SHEETS) {
    for (const jib of JIB_SHEETS) {
      const steady = steadyState(trimmed(twsKn, twaDeg, main, jib), 0, undefined, { heel });
      const speedKn = mpsToKn(steady.speedMps);
      if (speedKn > result.speedKn) {
        result = { speedKn, main, jib, heelDeg: Math.abs(steady.heelDeg) };
      }
    }
  }
  return result;
}

export function bestSpeedKn(twsKn: number, twaDeg: number, heel = false): number {
  return best(twsKn, twaDeg, heel).speedKn;
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

/**
 * One sample per frame of `pick(state)` from `fromS` seconds on (`t >= fromS`), for a run of
 * `seconds` at `fps` (PHASE3_SPEC 7.6).
 */
export function sampleRun(
  state: AppState,
  seconds: number,
  fps: number,
  fromS: number,
  pick: (s: AppState) => number,
): number[] {
  const samples: number[] = [];
  run(state, seconds, fps, (s, t) => {
    if (t >= fromS - 1e-9) samples.push(pick(s));
    return s;
  });
  return samples;
}

export const mean = (values: readonly number[]): number =>
  values.reduce((sum, v) => sum + v, 0) / values.length;

/** Population standard deviation (divides by N). */
export function stdDev(values: readonly number[]): number {
  const m = mean(values);
  return Math.sqrt(values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length);
}

/** A boat at rest (or at `speedKn`) with the sails away and the autopilot off (PHASE7_SPEC 6.7). */
export function harbourStart(o: {
  windDirDeg?: number;
  twsKn?: number;
  speedKn?: number;
  rudderDeg?: number;
  engine?: { running: boolean; leverPct: number };
  headingDeg?: number;
}): AppState {
  const state = initialState({
    controls: {
      ctl_wind_dir: o.windDirDeg ?? 0,
      ctl_wind_speed: o.twsKn ?? 0,
      ctl_main_furl: 0,
      ctl_jib_furl: 0,
      ctl_jib_sheet: 100,
      ctl_rudder: o.rudderDeg ?? 0,
    },
    boat: {
      mode: 'sailing',
      headingDeg: o.headingDeg ?? 0,
      speedMps: (o.speedKn ?? 0) * 0.514444,
    },
    ...(o.engine ? { engine: o.engine } : {}),
  });
  return { ...state, autopilot: { ...state.autopilot, mode: 'off' } };
}

/**
 * The lines of our berth for the boat as she lies (PHASE7_SPEC 10.7): stern lines `sternSlackM`
 * longer than the distance to their rings; the lazy line at hand tight (`'handTight'`), at its
 * distance plus `lazy` metres, or none (`null`). "The transom" is the point `(transomX, 0)`.
 */
export function berthLines(
  state: AppState,
  o: { sternSlackM: number; lazy: 'handTight' | number | null },
): MooringLine[] {
  const wanted: { code: LineCode; lengthM: number }[] = [
    { code: 'sp', lengthM: 30 },
    { code: 'ss', lengthM: 30 },
    ...(o.lazy === null ? [] : [{ code: 'll' as const, lengthM: 30 }]),
  ];
  const l = boat.physics.lines;
  return linesFromLink(wanted, state.boat, state.harbour).map((line) => {
    const d = lineTension(line, state.boat).distanceM;
    const lengthM =
      line.code !== 'll'
        ? d + o.sternSlackM
        : o.lazy === 'handTight'
          ? (d * l.lineEAN) / (l.lineEAN + l.crewPullN)
          : d + (o.lazy as number);
    return { ...line, lengthM };
  });
}
