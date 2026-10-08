import { boat, type BoatData } from './boat';
import { initialSide, solveBoom, type BoomInput, type BoomSolution } from './boomSolver';
import type { Controls } from './controls';
import type { Vec3 } from './vec3';

/**
 * Per-frame rig state and `step` (PHASE1_SPEC 8, 9.1). Pure: no DOM, no three.js.
 *
 * - Rope controls do not jump: the rope length follows the target with a first-order lag
 *   (`visual.controlResponseTimeS`), so the user sees the boom move.
 * - Each frame the boom solver gives the pose the ropes allow; the drawn boom follows it with a
 *   critically damped spring (`visual.boomSmoothingTimeS`, faster while gybing).
 */

/** Boat motion. Zero in Phase 1; Phase 2 adds speed and heading without changing `step`. */
export interface BoatMotion {
  velocity: Vec3;
  headingDeg: number;
}

export const AT_REST: Readonly<BoatMotion> = { velocity: [0, 0, 0], headingDeg: 0 };

/** Rope controls as currently applied (lagged towards the targets), % eased / % unfurled. */
export interface AppliedControls {
  mainsheet: number;
  vang: number;
  toppingLift: number;
  mainFurl: number;
}

/** A value moved by a critically damped spring. */
export interface Spring {
  value: number;
  velocity: number;
}

export interface RigState {
  applied: AppliedControls;
  /** What the latest solve was for (a frame with the same input reuses it). */
  input?: BoomInput;
  /** The latest solve: where the ropes allow the boom to be, rope states, fill. */
  solution: BoomSolution;
  /** What is drawn: the boom swing and pitch and the main's fill, moving towards `solution`. */
  theta: Spring;
  psi: Spring;
  fill: number;
  /** True while the boom swings across after an accidental gybe. */
  gybing: boolean;
  /** Seconds left to show the "GYBE" label (boom crossed with the wind from behind). */
  gybeLabelS: number;
  /** Seconds left to show the "Tack" label (boom crossed with the wind from ahead). */
  tackLabelS: number;
  /** Simulation time, seconds (drives the flapping of a luffing sail). */
  timeS: number;
}

function applied(controls: Controls): AppliedControls {
  return {
    mainsheet: controls.ctl_mainsheet,
    vang: controls.ctl_vang,
    toppingLift: controls.ctl_topping_lift,
    mainFurl: controls.ctl_main_furl,
  };
}

function boomInput(controls: Controls, rope: AppliedControls): BoomInput {
  return {
    windFromDeg: controls.ctl_wind_dir,
    windSpeedKn: controls.ctl_wind_speed,
    mainsheetPct: rope.mainsheet,
    vangPct: rope.vang,
    toppingLiftPct: rope.toppingLift,
    unfurledPct: rope.mainFurl,
  };
}

/** The settled rig for a set of controls: the first frame, a shared link, a test. */
export function initialRig(controls: Controls, data: BoatData = boat): RigState {
  const rope = applied(controls);
  const solution = solveBoom(
    boomInput(controls, rope),
    { side: initialSide(controls.ctl_wind_dir), thetaDeg: 0 },
    data,
  );
  return {
    applied: rope,
    solution: { ...solution, gybe: false, tack: false },
    theta: { value: solution.thetaDeg, velocity: 0 },
    psi: { value: solution.psiDeg, velocity: 0 },
    fill: solution.fill,
    gybing: false,
    gybeLabelS: 0,
    tackLabelS: 0,
    timeS: 0,
  };
}

/** Closer than this (in % or degrees) a lagged or smoothed value has arrived. */
const ARRIVED = 1e-4;

/** First-order lag: moves `value` towards `target` with time constant `tau`. */
export function lag(value: number, target: number, dt: number, tau: number): number {
  if (tau <= 0) return target;
  const next = target + (value - target) * Math.exp(-dt / tau);
  return Math.abs(next - target) < ARRIVED ? target : next;
}

function sameInput(a: BoomInput, b: BoomInput): boolean {
  return (
    a.windFromDeg === b.windFromDeg &&
    a.windSpeedKn === b.windSpeedKn &&
    a.mainsheetPct === b.mainsheetPct &&
    a.vangPct === b.vangPct &&
    a.toppingLiftPct === b.toppingLiftPct &&
    a.unfurledPct === b.unfurledPct
  );
}

/**
 * Critically damped spring towards `target` with time constant `tau`, solved exactly for a
 * constant target, so it is stable for any frame time.
 */
export function springTo(spring: Spring, target: number, dt: number, tau: number): Spring {
  if (tau <= 0) return { value: target, velocity: 0 };
  const omega = 1 / tau;
  const y0 = spring.value - target;
  const c = spring.velocity + omega * y0;
  const decay = Math.exp(-omega * dt);
  return {
    value: target + (y0 + c * dt) * decay,
    velocity: (spring.velocity - omega * c * dt) * decay,
  };
}

/** Degrees within which a gybe swing counts as finished. */
const GYBE_DONE_DEG = 2;

/**
 * Advances the rig by `dt` seconds towards the control targets. `motion` is the boat's
 * velocity and heading (zero in Phase 1).
 */
export function step(
  sim: { controls: Controls; rig: RigState },
  dt: number,
  motion: BoatMotion = AT_REST,
  data: BoatData = boat,
): RigState {
  void motion; // Phase 2: apparent wind from the boat's own motion.
  const { controls, rig } = sim;
  const v = data.visual;
  const target = applied(controls);
  const tau = v.controlResponseTimeS;
  const rope: AppliedControls = {
    mainsheet: lag(rig.applied.mainsheet, target.mainsheet, dt, tau),
    vang: lag(rig.applied.vang, target.vang, dt, tau),
    toppingLift: lag(rig.applied.toppingLift, target.toppingLift, dt, tau),
    mainFurl: lag(rig.applied.mainFurl, target.mainFurl, dt, tau),
  };

  // Once the ropes have arrived, the controls usually stay put for many frames: reuse the solve.
  const input = boomInput(controls, rope);
  const solution =
    rig.input && sameInput(rig.input, input)
      ? { ...rig.solution, gybe: false, tack: false }
      : solveBoom(input, { side: rig.solution.side, thetaDeg: rig.solution.thetaDeg }, data);

  // Only a gybe swings fast; a tack crosses at the normal speed.
  const gybing =
    solution.gybe ||
    (rig.gybing && !solution.tack && Math.abs(rig.theta.value - solution.thetaDeg) > GYBE_DONE_DEG);
  const swingTau = gybing ? v.gybeSwingTimeS : v.boomSmoothingTimeS;
  return {
    applied: rope,
    input,
    solution,
    theta: springTo(rig.theta, solution.thetaDeg, dt, swingTau),
    psi: springTo(rig.psi, solution.psiDeg, dt, v.boomSmoothingTimeS),
    fill: lag(rig.fill, solution.fill, dt, v.boomSmoothingTimeS),
    gybing,
    gybeLabelS: solution.gybe ? v.gybeLabelS : solution.tack ? 0 : Math.max(0, rig.gybeLabelS - dt),
    tackLabelS: solution.tack ? v.gybeLabelS : solution.gybe ? 0 : Math.max(0, rig.tackLabelS - dt),
    timeS: rig.timeS + dt,
  };
}
