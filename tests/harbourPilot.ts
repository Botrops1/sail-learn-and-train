import { wrap180 } from '../src/model/angles';
import { boatPoint, type ExerciseLevel } from '../src/model/exercises';
import type { LineCode } from '../src/model/mooringLines';
import { reduce, type Action, type AppState } from '../src/app/store';

/**
 * The scripted learners of part 10b's good-run tests (PHASE10_SPEC 16.7): each is a factory that
 * returns `(state, t) => state`, called once per frame before the test steps the state.
 * `t` is the app seconds since Start. A pilot may send an action that is refused.
 */
export type Pilot = (s: AppState, t: number) => AppState;

const A = (s: AppState, a: unknown) => reduce(s, a as Action);
export const H = (s: AppState) => ((s.boat.headingDeg % 360) + 360) % 360;
export const lever = (s: AppState, p: number) =>
  s.engine.leverPct === p ? s : A(s, { type: 'engine', command: { leverPct: p } });
export const rudder = (s: AppState, d: number) =>
  s.controls.ctl_rudder === d ? s : A(s, { type: 'setControls', values: { ctl_rudder: d } });
export const line = (s: AppState, code: LineCode, command: 'take' | 'tighten' | 'ease' | 'letGo') =>
  A(s, { type: 'line', code, command });
export const thr = (s: AppState, which: 'bow' | 'stern', dir: -1 | 0 | 1) =>
  s.thrusters[which] === dir ? s : A(s, { type: 'thruster', which, dir });
export const windlass = (s: AppState, motion: 'off' | 'down' | 'up') =>
  s.anchor.windlass === motion ? s : A(s, { type: 'windlass', motion });
export const stern = (s: AppState) => boatPoint(s.boat, 'stern');
export const bow = (s: AppState) => boatPoint(s.boat, 'bow');
export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
export { wrap180 };

/** Leaving the berth: lines off, slow ahead out of the berth, then turn west with the thrusters. */
export function leavePilot(level: ExerciseLevel): Pilot {
  const lv = level === 'hard' ? 30 : 15;
  let turned = false;
  return (s) => {
    const run = s.exercise;
    if (run === null) return s;
    switch (run.step) {
      case 0:
        return line(s, 'll', 'letGo');
      case 1:
        return line(line(s, 'sp', 'letGo'), 'ss', 'letGo');
      case 2:
        return lever(s, lv);
      case 3:
        if (!turned && Math.abs(wrap180(H(s) - 270)) > 10) {
          return thr(thr(rudder(lever(s, 0), 30), 'bow', 1), 'stern', -1);
        }
        turned = true;
        return thr(thr(rudder(lever(s, 15), 0), 'bow', 0), 'stern', 0);
      default:
        return s;
    }
  };
}
