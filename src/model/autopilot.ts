import { boat as hanse508, type BoatData } from './boat';
import { wrap180, wrap360 } from './angles';
import type { BoatState } from './motion';

/**
 * The autopilot (PHASE2_SPEC 6.3; owner, 2026-10-10): Standby, hold the compass heading, or hold
 * the true wind angle. A PID on the heading error that moves the wheel's target. Pure.
 */
export interface AutopilotState {
  mode: 'off' | 'heading' | 'wind';
  /** Heading mode: compass target [0, 360). Wind mode: target TWA, signed (−180, 180]. */
  targetDeg: number;
  integralDeg: number;
}

const clamp = (value: number, limit: number): number => Math.max(-limit, Math.min(limit, value));

/** Engages a mode holding what the boat does now. */
export function engageAutopilot(
  mode: 'heading' | 'wind',
  boatState: BoatState,
  windDirDeg: number,
): AutopilotState {
  const targetDeg =
    mode === 'heading'
      ? wrap360(Math.round(boatState.headingDeg))
      : Math.round(wrap180(windDirDeg - boatState.headingDeg));
  return { mode, targetDeg, integralDeg: 0 };
}

/** `turnDeg` + = turn the boat to starboard. */
export function adjustAutopilot(
  ap: AutopilotState,
  turnDeg: number,
  data: BoatData = hanse508,
): AutopilotState {
  if (ap.mode === 'off') return ap;
  const targetDeg =
    ap.mode === 'heading' ? wrap360(ap.targetDeg + turnDeg) : wrap180(ap.targetDeg - turnDeg);
  const integralDeg =
    Math.abs(turnDeg) > data.physics.autopilot.integralBandDeg ? 0 : ap.integralDeg;
  return { ...ap, targetDeg, integralDeg };
}

/** Mirrors the course across the wind: a tack (wind ahead) or a gybe (wind astern). */
export function tackAutopilot(
  ap: AutopilotState,
  boatState: BoatState,
  windDirDeg: number,
): AutopilotState {
  if (ap.mode === 'off') return ap;
  const targetDeg =
    ap.mode === 'wind'
      ? wrap180(-ap.targetDeg)
      : wrap360(windDirDeg + wrap180(windDirDeg - boatState.headingDeg));
  return { ...ap, targetDeg, integralDeg: 0 };
}

/** The compass heading the autopilot is steering to. */
export function autopilotHeadingDeg(ap: AutopilotState, windDirDeg: number): number {
  return ap.mode === 'wind' ? wrap360(windDirDeg - ap.targetDeg) : ap.targetDeg;
}

export function stepAutopilot(
  ap: AutopilotState,
  boatState: BoatState,
  windDirDeg: number,
  rudderTargetDeg: number,
  dt: number,
  data: BoatData = hanse508,
): { autopilot: AutopilotState; rudderTargetDeg: number } {
  if (ap.mode === 'off') return { autopilot: ap, rudderTargetDeg };
  const a = data.physics.autopilot;
  const error = wrap180(autopilotHeadingDeg(ap, windDirDeg) - boatState.headingDeg);
  let integralDeg = ap.integralDeg;
  if (Math.abs(error) < a.integralBandDeg) {
    integralDeg = clamp(integralDeg + a.kiPerS * error * dt, a.integralLimitDeg);
  }
  const u = clamp(a.kp * error - a.kdS * boatState.yawRateDegS + integralDeg, a.maxRudderDeg);
  const rate = a.rudderRateDegPerS * dt;
  return {
    autopilot: { ...ap, integralDeg },
    rudderTargetDeg: rudderTargetDeg + clamp(u - rudderTargetDeg, rate),
  };
}
