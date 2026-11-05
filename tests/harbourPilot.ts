import { wrap180 } from '../src/model/angles';
import { boatPoint, type ExerciseLevel } from '../src/model/exercises';
import { area } from '../src/model/area';
import { marinaGeometry } from '../src/model/marina';
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

export const setFenders = (s: AppState, out: boolean) => A(s, { type: 'setFenders', out });
const hasLine = (s: AppState, code: LineCode) => s.lines.lines.some((l) => l.code === code);

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

/**
 * Entering the berth stern-to (PHASE10_SPEC 17.5): fenders out, slow ahead past the berth, stop,
 * turn with the thrusters until the stern points at it, back in slowly, stern lines, lazy line,
 * tighten. `skipFenders` leaves out phase 0's fenders (the fenders-in mistake test).
 */
export function enterPilot(_level: ExerciseLevel, opts: { skipFenders?: boolean } = {}): Pilot {
  let phase = 0;
  let lastT = 0;
  return (s, t) => {
    if (s.exercise === null) return s;
    const c = marinaGeometry(s.harbour.layout, s.harbour.traffic).ourBerth.centreEastM;
    const gap = area.marina.quayFaceNorthM - stern(s)[1];
    const v = s.boat.speedMps;
    const keep = (state: AppState, lat = true): AppState => {
      const e = stern(state)[0] - c;
      const h = H(state) - 180;
      const sternDir = lat ? (e > 0.3 ? 1 : e < -0.3 ? -1 : 0) : 0;
      return thr(thr(state, 'stern', sternDir), 'bow', h > 2 ? -1 : h < -2 ? 1 : 0);
    };
    switch (phase) {
      case 0:
        phase = 1;
        return lever(opts.skipFenders ? s : setFenders(s, true), 15);
      case 1:
        if (s.boat.eastM > c - 18) {
          phase = 2;
          return lever(s, -30);
        }
        return s;
      case 2:
        if (v < 0.1) {
          phase = 3;
          return thr(thr(lever(s, 0), 'bow', 1), 'stern', -1);
        }
        return s;
      case 3:
        if (Math.abs(wrap180(H(s) - 180)) < 5) {
          phase = 4;
          return thr(thr(s, 'bow', 0), 'stern', 0);
        }
        return s;
      case 4: {
        const want = gap > 10 ? -0.6 : gap > 5 ? -0.3 : -0.12;
        const out = lever(keep(s), v > want ? -15 : v < want - 0.15 ? 15 : 0);
        if (gap < 2.6) phase = 5;
        return out;
      }
      case 5: {
        const out = lever(keep(s), v < -0.03 ? 15 : 0);
        if (Math.abs(v) < 0.03 && out.engine.leverPct === 0) phase = 6;
        return out;
      }
      case 6: {
        let out = keep(s);
        out = hasLine(out, 'sp') ? out : line(out, 'sp', 'take');
        out = hasLine(out, 'ss') ? out : line(out, 'ss', 'take');
        if (hasLine(out, 'sp') && hasLine(out, 'ss')) {
          out = line(out, 'll', 'take');
          phase = 7;
        }
        return out;
      }
      case 7: {
        const out = keep(s, false);
        if (hasLine(out, 'll')) {
          phase = 8;
          return thr(out, 'bow', 0);
        }
        return out;
      }
      default:
        if (t - lastT > 0.5) {
          lastT = t;
          return line(s, 'll', 'tighten');
        }
        return s;
    }
  };
}

/**
 * Turning in her own length (PHASE10_SPEC 18.5). Step 0: wheel hard to starboard, a 15-second
 * pattern of 2 s ahead, 5 s neutral, up to 4 s astern (while she is not yet going back), neutral.
 * Step 1: wheel and lever off, both thrusters turn her until she points west.
 */
export function turnPilot(): Pilot {
  let step = -1;
  let stepStartT = 0;
  return (s, t) => {
    const run = s.exercise;
    if (run === null) return s;
    if (run.step !== step) {
      step = run.step;
      stepStartT = t;
    }
    if (run.step === 0) {
      const k = (t - stepStartT) % 15;
      const pct = k < 2 ? 60 : k < 7 ? 0 : k < 11 && s.boat.speedMps > -0.3 ? -60 : 0;
      return lever(rudder(s, 35), pct);
    }
    const off = Math.abs(wrap180(H(s) - 270)) > 5;
    return thr(thr(lever(rudder(s, 0), 0), 'bow', off ? 1 : 0), 'stern', off ? -1 : 0);
  };
}

/** Where the bay's middle buoy is (PHASE10_SPEC 18.2). */
const BUOY: [number, number] = [-1450, 0];

/**
 * Picking up a mooring buoy (PHASE10_SPEC 18.5): creep at the buoy into the wind, take the bow
 * line, lie to it in neutral, let go, go astern.
 */
export function buoyPilot(): Pilot {
  return (s) => {
    const run = s.exercise;
    if (run === null) return s;
    switch (run.step) {
      case 0: {
        const [be, bn] = bow(s);
        const d = Math.hypot(BUOY[0] - be, BUOY[1] - bn);
        const want = d > 30 ? 1.0 : d > 8 ? 0.5 : 0.15;
        const brg = (Math.atan2(BUOY[0] - s.boat.eastM, BUOY[1] - s.boat.northM) * 180) / Math.PI;
        const v = s.boat.speedMps;
        const steered = rudder(s, clamp(2 * wrap180(brg - s.boat.headingDeg), -20, 20));
        return lever(steered, v < want - 0.05 ? 15 : v > want + 0.1 ? -15 : 0);
      }
      case 1:
        return line(rudder(lever(s, 0), 0), 'bl', 'take');
      case 2:
        return s;
      case 3:
        return line(s, 'bl', 'letGo');
      default:
        return lever(s, -15);
    }
  };
}

/** Where the anchor goes in Anchoring with a line ashore (PHASE10_SPEC 19.2). */
const DROP: [number, number] = [-1600, 0];

/**
 * Anchoring with a line ashore (PHASE10_SPEC 19.4): back slowly to the spot, let the anchor go,
 * keep going astern while the chain runs out, dig it in, let out more and back towards the shore,
 * take a line ashore, then tighten it.
 */
export function anchorPilot(): Pilot {
  let more = false;
  let lastT = 0;
  const hold = (s: AppState): AppState => {
    const off = wrap180(H(s) - 90);
    return thr(s, 'bow', off > 3 ? -1 : off < -3 ? 1 : 0);
  };
  return (s, t) => {
    const run = s.exercise;
    if (run === null) return s;
    const v = s.boat.speedMps;
    switch (run.step) {
      case 0: {
        const [be, bn] = bow(s);
        const d = Math.hypot(be - DROP[0], bn - DROP[1]);
        return lever(hold(s), d > 3 ? (v > -0.3 ? -15 : 0) : v < -0.05 ? 15 : 0);
      }
      case 1:
        return windlass(lever(s, 0), 'down');
      case 2:
        return lever(hold(s), v > -0.25 ? -15 : 0);
      case 3:
        return lever(hold(windlass(s, 'off')), -40);
      case 4: {
        if (!more) {
          if (stern(s)[0] < -1665) {
            more = true;
            return thr(lever(windlass(s, 'off'), 0), 'bow', 0);
          }
          return lever(hold(windlass(s, 'down')), v > -0.2 ? -15 : 0);
        }
        return hasLine(s, 'sl') || s.lines.crew !== null ? s : line(s, 'sl', 'take');
      }
      default:
        if (t - lastT > 0.5) {
          lastT = t;
          return line(s, 'sl', 'tighten');
        }
        return s;
    }
  };
}

/** The ring's north (20.2); its east is our berth's centre. */
const STERN_DROP_NORTH_M = 1442;
/** Depth of the water (5 m) plus the bow roller's height (1.8 m): the chain's slope (PHASE10_SPEC 20.4). */
const CHAIN_DEPTH_M = 6.8;

/**
 * Stern-to on your own anchor (PHASE10_SPEC 20.4): motor ahead across the fairway to the ring in
 * the empty berth opposite, let the anchor go, back into our berth paying the chain out as she
 * goes, stern lines, then take in chain until the anchor is set.
 */
export function sternAnchorPilot(): Pilot {
  let phase = 0;
  return (s) => {
    const run = s.exercise;
    if (run === null) return s;
    const c = marinaGeometry(s.harbour.layout, s.harbour.traffic).ourBerth.centreEastM;
    const gap = area.marina.quayFaceNorthM - stern(s)[1];
    const v = s.boat.speedMps;
    const keep = (state: AppState): AppState => {
      const e = stern(state)[0] - c;
      const h = H(state) - 180;
      const sternDir = e > 0.3 ? 1 : e < -0.3 ? -1 : 0;
      return thr(thr(state, 'stern', sternDir), 'bow', h > 2 ? -1 : h < -2 ? 1 : 0);
    };
    switch (run.step) {
      case 0: {
        const [be, bn] = bow(s);
        const d = Math.hypot(be - c, bn - STERN_DROP_NORTH_M);
        return lever(keep(s), d > 3 ? (v < 0.3 ? 15 : 0) : v > 0.05 ? -15 : 0);
      }
      case 1:
        return windlass(lever(keep(s), 0), 'down');
      case 2: {
        if (phase === 0) {
          const [be, bn] = bow(s);
          const far = Math.hypot(be - s.anchor.eastM, bn - s.anchor.northM);
          const out = windlass(
            s,
            s.anchor.chainOutM < Math.hypot(far, CHAIN_DEPTH_M) + 4 ? 'down' : 'off',
          );
          const want = gap > 10 ? -0.4 : gap > 5 ? -0.25 : -0.12;
          const moved = lever(keep(out), v > want ? -15 : v < want - 0.15 ? 15 : 0);
          if (gap < 2.6) {
            phase = 1;
            return windlass(moved, 'off');
          }
          return moved;
        }
        return lever(keep(s), v < -0.03 ? 15 : 0);
      }
      case 3: {
        let out = lever(keep(s), 0);
        out = hasLine(out, 'sp') ? out : line(out, 'sp', 'take');
        return hasLine(out, 'ss') ? out : line(out, 'ss', 'take');
      }
      default:
        if (s.anchor.phase !== 'set' && !s.anchor.cutOut) {
          return windlass(keep(s), 'up');
        }
        return thr(thr(windlass(s, 'off'), 'bow', 0), 'stern', 0);
    }
  };
}
