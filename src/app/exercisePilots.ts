import { wrap180 } from '../model/angles';
import { area } from '../model/area';
import type { ControlId } from '../model/controls';
import { atBoard, type DinghyCommand } from '../model/dinghy';
import { boatPoint, exerciseDef, twaSignedDeg, type ExerciseLevel } from '../model/exercises';
import { marinaGeometry } from '../model/marina';
import type { RealisticAction, StationId } from '../model/realistic';
import type { LineCode } from '../model/mooringLines';
import type { RopesMode } from '../model/settings';
import {
  reduce,
  type Action,
  type AppState,
  type AutopilotCommand,
  type EngineCommand,
} from './store';

/**
 * The scripted learners (PHASE10_SPEC 16.7, PHASE10_PHONE_SPEC 8.3): each is a factory that
 * returns `(state, t) => state`, called once per 0.05 s part of a frame. `t` is the app seconds
 * since Start. They power the good-run tests and, from M81, Watch and Show me. A pilot may send an
 * action that is refused.
 */
export type Pilot = (s: AppState, t: number) => AppState;

let recording: Action[] | null = null;
/** Applies an action; while `pilotActions` records, an action the store accepts is kept (3.2). */
const A = (s: AppState, a: Action): AppState => {
  const next = reduce(s, a);
  if (recording && next !== s) recording.push(a);
  return next;
};
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
  let phase = -1;
  let lastT = 0;
  return (s, t) => {
    if (s.exercise === null) return s;
    // PHASE10_PHONE_SPEC 3.5: a fresh pilot starts in the phase its step needs.
    if (phase === -1) phase = [0, 0, 4, 6, 6, 8][s.exercise.step] ?? 0;
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

/**
 * A night at anchor (M98, PHASE10_SPEC 28.3): the learner of Anchoring with a line ashore, then
 * nothing in the last step (the night): `anchorPilot`'s default branch would tighten the line forever.
 */
export function nightPilot(): Pilot {
  const anchor = anchorPilot();
  return (s, t) => (s.exercise?.step === 6 ? s : anchor(s, t));
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

const ctl = (s: AppState, values: Partial<Record<ControlId, number>>): AppState =>
  Object.entries(values).some(([k, v]) => s.controls[k as ControlId] !== v)
    ? A(s, { type: 'setControls', values })
    : s;
const ap = (s: AppState, command: AutopilotCommand) => A(s, { type: 'autopilot', command });
const eng = (s: AppState, command: EngineCommand) => A(s, { type: 'engine', command });
/** Seconds since the current step began (run time, PHASE10_PHONE_SPEC 3.1). */
const inStep = (s: AppState) => (s.exercise ? s.exercise.elapsedS - s.exercise.stepStartS : 0);
/** Runs `fn` once per (step, key): the pilot's one-off taps. `once.ran` tells whether a key ran. */
function onceMaker() {
  const done = new Set<string>();
  const key = (s: AppState, name: string) => `${s.exercise?.step}:${name}`;
  const once = (s: AppState, name: string, fn: (s: AppState) => AppState) => {
    const k = key(s, name);
    if (done.has(k)) return s;
    done.add(k);
    return fn(s);
  };
  return Object.assign(once, { ran: (s: AppState, name: string) => done.has(key(s, name)) });
}
const turns = (s: AppState, n: number, deg: number) => {
  for (let i = 0; i < n; i += 1) s = ap(s, { turnDeg: deg });
  return s;
};

export function pointsOfSailPilot(): Pilot {
  const once = onceMaker();
  return (s) => {
    switch (s.exercise?.step) {
      case 0:
        return ctl(s, { ctl_mainsheet: 12 });
      case 1:
        return ctl(
          once(s, 't', (x) => turns(x, 2, -10)),
          { ctl_mainsheet: 25 },
        );
      case 2:
        return ctl(
          once(s, 't', (x) => turns(x, 3, -10)),
          { ctl_mainsheet: 50, ctl_jib_sheet: 100 },
        );
      case 3:
        return ctl(
          once(s, 't', (x) => turns(x, 4, -10)),
          { ctl_mainsheet: 100 },
        );
      case 4:
        return once(s, 't', (x) => turns(x, 3, -10));
      default:
        return s;
    }
  };
}
export function tackingPilot(): Pilot {
  const once = onceMaker();
  return (s) => {
    switch (s.exercise?.step) {
      case 0:
        return once(s, 'tack', (x) => ap(x, 'tack'));
      case 1:
        return ctl(
          once(s, 'off', (x) => ap(x, 'off')),
          { ctl_rudder: -25 },
        );
      case 2:
        return twaSignedDeg(s) > 35 ? ctl(s, { ctl_rudder: 0 }) : s;
      case 3:
        return once(s, 'w', (x) => ap(ap(x, 'wind'), { turnDeg: -10 }));
      default:
        return s;
    }
  };
}
export function ironsPilot(): Pilot {
  return (s) => {
    switch (s.exercise?.step) {
      case 0:
        return ctl(s, { ctl_mainsheet: 60, ctl_jib_sheet: 60 });
      case 1:
        return ctl(s, { ctl_rudder: 30 });
      case 2:
        return ctl(s, { ctl_rudder: 0, ctl_mainsheet: 12, ctl_jib_sheet: 30 });
      default:
        return s;
    }
  };
}
export function gybingPilot(): Pilot {
  const once = onceMaker();
  return (s) => {
    switch (s.exercise?.step) {
      case 0:
        return ctl(s, { ctl_mainsheet: 5 });
      case 1:
        return once(s, 'g', (x) => ap(x, 'tack'));
      case 2:
        return ctl(s, { ctl_mainsheet: 100 });
      case 3:
        return once(s, 'h', (x) => turns(ap(x, 'heading'), 3, 10));
      default:
        return s;
    }
  };
}
// ---- the Training dinghy (M118, PHASE_DINGHY_SPEC 12.3) ----------------------------------------

const dinghy = (s: AppState, command: DinghyCommand) => A(s, { type: 'dinghy', command });
const sheet = (s: AppState, pct: number) => ctl(s, { ctl_mainsheet: pct });
/**
 * The dinghy's heading hold: the rudder that steers the wind angle towards `targetTwa` (signed, +
 * = wind over starboard). A boat that turns to starboard (rudder +) lowers the signed angle, so the
 * error is `twa − target` (the spec's formula, 12.3, with the sign that settles on the target).
 */
const holdTwa = (s: AppState, targetTwa: number) =>
  rudder(s, Math.round(clamp(1.5 * (twaSignedDeg(s) - targetTwa), -30, 30)));
/** The hold towards the middle of the step's `twaDeg`, on the tack the step names (else the tack she is on). */
function holdStepTwa(s: AppState): AppState {
  const run = s.exercise;
  const check = run ? exerciseDef(run.id)?.steps[run.step]?.check : undefined;
  if (!check?.twaDeg) return s;
  const side =
    check.tack === 'port' ? -1 : check.tack === 'starboard' ? 1 : twaSignedDeg(s) < 0 ? -1 : 1;
  return holdTwa(s, (side * (check.twaDeg[0] + check.twaDeg[1])) / 2);
}

/**
 * Go and stop: beam reach, the sheet at 50, 100, 50 %. (The spec says 40, but on this beam reach
 * the sail reads Stalled there and Good starts at about 45: decided in the M118 PR.)
 */
export function dinghyGoStopPilot(): Pilot {
  return (s) => {
    const sign = twaSignedDeg(s) < 0 ? -1 : 1;
    const held = holdTwa(s, sign * 90);
    switch (s.exercise?.step) {
      case 0:
        return sheet(held, 50);
      case 1:
        return sheet(held, 100);
      case 2:
        return sheet(held, 50);
      default:
        return held;
    }
  };
}

/** Tack: hold close-hauled, rudder +30 (towards the wind on starboard tack) through the tack, sit on the side on the new tack. */
export function dinghyTackPilot(): Pilot {
  const once = onceMaker();
  return (s) => {
    switch (s.exercise?.step) {
      case 0:
        return holdStepTwa(s);
      case 1:
        return rudder(s, 30);
      case 2:
        return holdStepTwa(once(s, 'sit', (x) => dinghy(x, { kind: 'sit', sit: 'side' })));
      default:
        return s;
    }
  };
}

/**
 * Gybe: hold the run with the sheet hauled in to 8 % (the boom must be within 20° of the middle at
 * the gybe, or it is an accidental gybe; the spec's 60 % leaves it 50° out), rudder −30 until the
 * boom has crossed, then the hold on the broad reach with the sheet eased: decided in the M118 PR.
 */
export function dinghyGybePilot(): Pilot {
  return (s) => {
    switch (s.exercise?.step) {
      case 0:
        return sheet(holdStepTwa(s), 8);
      case 1:
        return rudder(sheet(s, 8), -30);
      case 2:
        return sheet(holdStepTwa(s), 50);
      default:
        return s;
    }
  };
}

/** Capsize: swim round, push the board down once at it, stand on it, then sit on the side. */
export function dinghyCapsizePilot(): Pilot {
  const capsize = (s: AppState, command: 'swim' | 'boardDown' | 'stand') =>
    dinghy(s, { kind: 'capsize', command });
  return (s) => {
    const c = s.dinghy.capsize;
    switch (s.exercise?.step) {
      case 0:
        return c.phase === 'over' ? capsize(s, 'swim') : s;
      case 1:
        return atBoard(c) ? capsize(s, 'boardDown') : s;
      case 2:
        return capsize(s, 'stand');
      case 3:
        return c.phase === 'upright' && s.dinghy.sit !== 'side'
          ? dinghy(s, { kind: 'sit', sit: 'side' })
          : s;
      default:
        return s;
    }
  };
}

const gennakerCmd = (s: AppState, command: 'next' | 'back' | 'gybe') =>
  A(s, { type: 'gennaker', command });
/** The gennaker, rigged step by step at the bow, set with its sock and trimmed on a broad reach. */
export function gennakerRigPilot(): Pilot {
  const once = onceMaker();
  return (s) => {
    switch (s.exercise?.step) {
      case 0:
      case 1:
      case 2:
      case 4:
        return once(s, 'next', (x) => gennakerCmd(x, 'next'));
      case 3:
        // The jib only rolls away while its sheet is eased (PT-13).
        return ctl(s, { ctl_jib_sheet: 100, ctl_jib_furl: 0 });
      case 5:
        return ctl(s, { ctl_gennaker_sock: 100 });
      case 6:
        return ctl(s, { ctl_gennaker_sheet: 35 });
      default:
        return s;
    }
  };
}
/** Bear away, haul the main, gybe, gybe the gennaker, come up and trim both. */
export function gennakerGybePilot(): Pilot {
  const once = onceMaker();
  return (s) => {
    switch (s.exercise?.step) {
      case 0:
        return once(s, 't', (x) => turns(x, 3, -10));
      case 1:
        return ctl(s, { ctl_mainsheet: 5 });
      case 2:
        return once(s, 'g', (x) => ap(x, 'tack'));
      case 3:
        return once(s, 'gg', (x) => gennakerCmd(x, 'gybe'));
      case 4:
        return ctl(
          once(s, 't', (x) => turns(x, 3, -10)),
          { ctl_mainsheet: 90, ctl_gennaker_sheet: 40 },
        );
      default:
        return s;
    }
  };
}
/** Bear away behind the main, ease the sheet, pull the sock down, lower it, unroll the jib. */
export function gennakerDousePilot(): Pilot {
  const once = onceMaker();
  return (s) => {
    switch (s.exercise?.step) {
      case 0:
        return once(s, 't', (x) => turns(x, 10, -5));
      case 1:
        return ctl(s, { ctl_gennaker_sheet: 100 });
      case 2:
        return ctl(s, { ctl_gennaker_sock: 0 });
      case 3:
        // One step back per call (one per 0.05 s part of a frame) until it is stowed.
        return s.gennaker.stage > 0 ? gennakerCmd(s, 'back') : s;
      case 4:
        return ctl(s, { ctl_jib_furl: 100 });
      default:
        return s;
    }
  };
}
const GUSTS_EASE_ABOVE_KN = 16.5; // the GUST badge's threshold in this exercise (1.1 × 15 kn)
/** The GUST badge shows above 1.1 × the mean wind: ease the main while it shows. */
export function gustsPilot(): Pilot {
  return (s) => {
    switch (s.exercise?.step) {
      case 0:
        return ctl(s, { ctl_mainsheet: s.wind.twsKn > GUSTS_EASE_ABOVE_KN ? 45 : 25 });
      case 1:
        return ctl(s, { ctl_mainsheet: 35 });
      default:
        return s;
    }
  };
}
/** Header and lift: bear away 20° in the header, head up 40° in the lift. */
export function windShiftPilot(): Pilot {
  const once = onceMaker();
  return (s) => {
    switch (s.exercise?.step) {
      case 1:
        return once(s, 't', (x) => turns(x, 2, -10));
      case 3:
        return once(s, 't', (x) => turns(x, 4, 10));
      default:
        return s;
    }
  };
}
/** Weather helm: wait for the wind, then ease the main sheet to 30 %. */
export function weatherHelmPilot(): Pilot {
  return (s) => (s.exercise?.step === 1 ? ctl(s, { ctl_mainsheet: 30 }) : s);
}
export function reduceSailPilot(): Pilot {
  return (s) => {
    switch (s.exercise?.step) {
      case 0:
        return inStep(s) < 0.5
          ? ctl(s, { ctl_jib_sheet: 100 })
          : ctl(s, { ctl_jib_sheet: 100, ctl_jib_furl: 40 });
      case 1:
        return ctl(s, { ctl_jib_sheet: 75, ctl_main_furl: 60 });
      case 2:
        return ctl(s, { ctl_mainsheet: 35 });
      default:
        return s;
    }
  };
}
/** The afternoon maestral (M96): wait, then roll the jib and the main in, then hold the main sheet. */
export function maestralPilot(): Pilot {
  return (s) => {
    switch (s.exercise?.step) {
      case 1:
        return inStep(s) < 1
          ? ctl(s, { ctl_jib_sheet: 100 })
          : ctl(s, { ctl_jib_sheet: 100, ctl_jib_furl: 40 });
      case 2:
        return ctl(s, { ctl_jib_sheet: 75, ctl_main_furl: 60 });
      case 3:
        return ctl(s, { ctl_mainsheet: 40 });
      default:
        return s;
    }
  };
}
/** A bura is coming (M97): the jib away, the main to 45 %, then the main sheet eased in each gust. */
export function buraPilot(): Pilot {
  return (s) => {
    switch (s.exercise?.step) {
      case 0:
        return inStep(s) < 1
          ? ctl(s, { ctl_jib_sheet: 100 })
          : ctl(s, { ctl_jib_sheet: 100, ctl_jib_furl: 0 });
      case 1:
        return ctl(s, { ctl_main_furl: 45 });
      case 2:
        return ctl(s, { ctl_mainsheet: s.wind.twsKn > 1.1 * s.controls.ctl_wind_speed ? 70 : 45 });
      default:
        return s;
    }
  };
}
export function setSailsPilot(): Pilot {
  const once = onceMaker();
  return (s) => {
    switch (s.exercise?.step) {
      case 1:
        return ctl(s, { ctl_main_furl: 100 });
      case 2:
        return once(s, 'w', (x) => turns(ap(x, 'wind'), 6, -10));
      case 3:
        return ctl(s, { ctl_jib_furl: 100, ctl_jib_sheet: 30 });
      case 4:
        return once(s, 'e', (x) => eng(eng(x, { leverPct: 0 }), 'stop'));
      default:
        return s;
    }
  };
}
export function furlSailsPilot(): Pilot {
  const once = onceMaker();
  return (s) => {
    switch (s.exercise?.step) {
      case 0:
        return once(s, 'e', (x) => eng(x, 'start'));
      case 1:
        return ctl(s, { ctl_jib_sheet: 100, ctl_jib_furl: 0 });
      case 2:
        return once(s, 'h', (x) => turns(ap(eng(x, { leverPct: 30 }), 'heading'), 6, 10));
      case 3:
        return ctl(s, { ctl_main_furl: 0 });
      default:
        return s;
    }
  };
}

const real = (s: AppState, action: RealisticAction) => A(s, { type: 'realistic', action });
const W = 'winch_primary_starboard';
const P = 'winch_primary_port';
/** M82: walk to the helm (the autopilot and the engine rows stand under Helm in the bar). */
const atHelm = (s: AppState) => real(s, { type: 'station', station: 'helm' });
const goTo = (station: StationId) => (s: AppState) => real(s, { type: 'station', station });
/** M112: true once the captain stands at `station` (no walk going on). */
const arrived = (s: AppState, station: StationId) =>
  s.realistic.station === station && s.realistic.walk === null;
/** Put a rope on the winch, three turns, into the self-tailer (PHASE10_PHONE_SPEC 9.4). */
const onWinch = (s: AppState, key: string, winch: string) => {
  s = real(s, { type: 'onWinch', key });
  for (let i = 0; i < 3; i += 1) s = real(s, { type: 'turn', winch, delta: 1 });
  return real(s, { type: 'selfTailer', winch, into: true });
};
/**
 * Setting the sails in Realistic ropes (M82, PHASE10_PHONE_SPEC 9.4): the stations are worked as a
 * learner does, Alone (one person walks between the stations). The pilot waits for each walk
 * (M112): a station is chosen, then the taps follow once he has arrived.
 */
export function setSailsRealisticPilot(): Pilot {
  const once = onceMaker();
  return (s) => {
    switch (s.exercise?.step) {
      case 1: {
        s = once(s, 'a-go', goTo('starboard'));
        if (once.ran(s, 'a-go') && arrived(s, 'starboard'))
          s = once(s, 'a', (x) =>
            real(onWinch(real(x, { type: 'clutch', key: 'a2', open: true }), 'a3', W), {
              type: 'button',
              winch: W,
              held: true,
            }),
          );
        if (s.controls.ctl_main_furl >= 99)
          s = once(s, 'r', (x) => real(x, { type: 'button', winch: W, held: false }));
        return s;
      }
      case 2: {
        if (inStep(s) < 2) return s;
        s = once(s, 'b-go', goTo('starboard'));
        if (once.ran(s, 'b-go') && arrived(s, 'starboard'))
          s = once(s, 'b', (x) =>
            real(real(x, { type: 'clutch', key: 'a2', open: false }), {
              type: 'offWinch',
              winch: W,
            }),
          );
        if (once.ran(s, 'b')) s = once(s, 'b2-go', atHelm);
        if (once.ran(s, 'b2-go') && arrived(s, 'helm'))
          s = once(s, 'b2', (x) => turns(ap(x, 'wind'), 6, -10));
        return s;
      }
      case 3: {
        s = once(s, 'c-go', goTo('port'));
        if (once.ran(s, 'c-go') && arrived(s, 'port'))
          s = once(s, 'c', (x) => real(x, { type: 'clutch', key: 'r1', open: true }));
        if (once.ran(s, 'c')) s = once(s, 'c2-go', goTo('starboard'));
        if (once.ran(s, 'c2-go') && arrived(s, 'starboard'))
          s = once(s, 'c2', (x) =>
            real(onWinch(x, 'a5', W), { type: 'button', winch: W, held: true }),
          );
        if (s.controls.ctl_jib_sheet < 50)
          s = once(s, 'r', (x) => real(x, { type: 'button', winch: W, held: false }));
        return s;
      }
      case 4:
        s = once(s, 'e-go', atHelm);
        if (once.ran(s, 'e-go') && arrived(s, 'helm'))
          s = once(s, 'e', (x) => eng(eng(x, { leverPct: 0 }), 'stop'));
        return s;
      default:
        return s;
    }
  };
}
/** Furling the sails in Realistic ropes (M82, PHASE10_PHONE_SPEC 9.4); waits for each walk (M112). */
export function furlSailsRealisticPilot(): Pilot {
  const once = onceMaker();
  return (s) => {
    switch (s.exercise?.step) {
      case 0:
        s = once(s, 'e-go', atHelm);
        if (once.ran(s, 'e-go') && arrived(s, 'helm')) s = once(s, 'e', (x) => eng(x, 'start'));
        return s;
      case 1: {
        s = once(s, 'a-go', goTo('starboard'));
        if (once.ran(s, 'a-go') && arrived(s, 'starboard'))
          s = once(s, 'a', (x) => real(x, { type: 'clutch', key: 'a5', open: true }));
        if (once.ran(s, 'a')) s = once(s, 'a2-go', goTo('port'));
        if (once.ran(s, 'a2-go') && arrived(s, 'port'))
          s = once(s, 'a2', (x) =>
            real(onWinch(x, 'r1', P), { type: 'button', winch: P, held: true }),
          );
        if (100 * s.rig.jibSolution.unfurled <= 1)
          s = once(s, 'r', (x) => real(x, { type: 'button', winch: P, held: false }));
        return s;
      }
      case 2:
        s = once(s, 'h-go', atHelm);
        if (once.ran(s, 'h-go') && arrived(s, 'helm'))
          s = once(s, 'h', (x) => turns(ap(eng(x, { leverPct: 30 }), 'heading'), 6, 10));
        return s;
      case 3: {
        s = once(s, 'b-go', goTo('port'));
        if (once.ran(s, 'b-go') && arrived(s, 'port'))
          s = once(s, 'b', (x) =>
            real(real(x, { type: 'offWinch', winch: P }), {
              type: 'clutch',
              key: 'b3',
              open: true,
            }),
          );
        if (once.ran(s, 'b')) s = once(s, 'b2-go', goTo('starboard'));
        if (once.ran(s, 'b2-go') && arrived(s, 'starboard'))
          s = once(s, 'b2', (x) =>
            real(onWinch(real(x, { type: 'clutch', key: 'a3', open: true }), 'a2', W), {
              type: 'button',
              winch: W,
              held: true,
            }),
          );
        if (s.controls.ctl_main_furl <= 1)
          s = once(s, 'r', (x) => real(x, { type: 'button', winch: W, held: false }));
        return s;
      }
      default:
        return s;
    }
  };
}

/**
 * A fresh pilot (new closure state) for the exercise, or null where none exists (PHASE10_PHONE_SPEC
 * 8.3). Harbour exercises ignore the ropes mode; the others have a pilot in Easy ropes, and
 * (M82) Setting and Furling the sails also in Realistic ropes.
 */
export function pilotFor(id: string, level: ExerciseLevel, ropes: RopesMode): Pilot | null {
  if (exerciseDef(id)?.group === 'dinghy') {
    // M118: the dinghy's four exercises run in Easy ropes only.
    if (ropes !== 'easy') return null;
    switch (id) {
      case 'dinghy-go-stop':
        return dinghyGoStopPilot();
      case 'dinghy-tack':
        return dinghyTackPilot();
      case 'dinghy-gybe':
        return dinghyGybePilot();
      case 'dinghy-capsize':
        return dinghyCapsizePilot();
      default:
        return null;
    }
  }
  if (exerciseDef(id)?.group === 'harbour') {
    switch (id) {
      case 'leave-berth':
        return leavePilot(level);
      case 'enter-berth':
        return enterPilot(level);
      case 'turn-own-length':
        return turnPilot();
      case 'mooring-buoy':
        return buoyPilot();
      case 'anchor-shore':
        return anchorPilot();
      case 'night-anchor':
        return nightPilot();
      case 'stern-to-anchor':
        return sternAnchorPilot();
      default:
        return null;
    }
  }
  if (ropes === 'realistic') {
    // M82: the two exercises that run in Realistic ropes (PHASE10_PHONE_SPEC 9.3).
    if (id === 'set-sails') return setSailsRealisticPilot();
    if (id === 'furl-sails') return furlSailsRealisticPilot();
    return null;
  }
  if (ropes !== 'easy') return null;
  switch (id) {
    case 'points-of-sail':
      return pointsOfSailPilot();
    case 'tacking':
      return tackingPilot();
    case 'irons':
      return ironsPilot();
    case 'gybing':
      return gybingPilot();
    case 'gennaker-rig':
      return gennakerRigPilot();
    case 'gennaker-gybe':
      return gennakerGybePilot();
    case 'gennaker-douse':
      return gennakerDousePilot();
    case 'gusts':
      return gustsPilot();
    case 'weather-helm':
      return weatherHelmPilot();
    case 'wind-shift':
      return windShiftPilot();
    case 'reduce-sail':
      return reduceSailPilot();
    case 'maestral':
      return maestralPilot();
    case 'bura':
      return buraPilot();
    case 'set-sails':
      return setSailsPilot();
    case 'furl-sails':
      return furlSailsPilot();
    default:
      return null;
  }
}

/**
 * Calls the pilot on this state and returns every action its helpers applied, in order (the
 * computed state is dropped: dispatching the same actions reproduces it, because `reduce` is pure).
 */
export function pilotActions(pilot: Pilot, state: AppState): Action[] {
  if (state.exercise === null) return [];
  const actions: Action[] = [];
  recording = actions;
  try {
    pilot(state, state.exercise.elapsedS);
  } finally {
    recording = null;
  }
  return actions;
}
