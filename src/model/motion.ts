import { apparentWind } from './apparentWind';
import { DEG, wrap180, wrap360 } from './angles';
import { boat as hanse508, type BoatData } from './boat';
import type { Controls } from './controls';
import { boatMassKg, hullResistance, type Resistance } from './hullResistance';
import { sailForces, type SailForces } from './sailForces';
import { initialRig, type RigState } from './sim';

/**
 * Boat motion on open water (PHASE2_SPEC 6.3): speed, heading and position from the sail forces
 * and the hull resistance. A teaching model, not a velocity prediction program. Pure.
 */
export interface BoatState {
  mode: 'sailing' | 'held';
  /** Compass heading, [0, 360). */
  headingDeg: number;
  /** Speed along the bow, m/s, + ahead. */
  speedMps: number;
  /** + = heading increasing (turning to starboard). */
  yawRateDegS: number;
  /** + = heeled to starboard. Zero until M8. */
  heelDeg: number;
  heelRateDegS: number;
  /** Metres east and north of where the boat started. */
  eastM: number;
  northM: number;
}

export function initialBoat(overrides: Partial<BoatState> = {}): BoatState {
  return {
    mode: 'sailing',
    headingDeg: 0,
    speedMps: 0,
    yawRateDegS: 0,
    heelDeg: 0,
    heelRateDegS: 0,
    eastM: 0,
    northM: 0,
    ...overrides,
  };
}

export interface MotionInputs {
  /** Compass direction the true wind comes from, and its speed. */
  windDirDeg: number;
  twsKn: number;
  /** The rudder as applied (the lagged wheel), degrees, + = to starboard. */
  rudderDeg: number;
  rig: RigState;
  controls: Controls;
  engineThrustN: number;
}

export interface MotionReport {
  forces: SailForces;
  resistance: Resistance;
  awsKn: number;
  awaDeg: number;
  twaDeg: number;
}

/** Mass including the water the hull drags along, kg. */
export function effectiveMassKg(data: BoatData = hanse508): number {
  return boatMassKg(data) * (1 + data.physics.mass.addedMassFraction);
}

/** Advances the boat by `dt` seconds, in substeps of at most `integration.maxStepS`. */
export function stepBoat(
  boatState: BoatState,
  inputs: MotionInputs,
  dt: number,
  data: BoatData = hanse508,
): { boat: BoatState; report: MotionReport } {
  const { maxStepS } = data.physics.integration;
  const { turnLengthM, yawLagS } = data.physics.steering;
  const mEff = effectiveMassKg(data);
  const held = boatState.mode === 'held';
  const count = held ? 1 : Math.max(1, Math.ceil(dt / maxStepS));
  const h = held ? 0 : dt / count;

  let { headingDeg, speedMps, yawRateDegS, eastM, northM } = boatState;
  const heelDeg = boatState.heelDeg;
  if (held) speedMps = 0;
  let report: MotionReport | undefined;
  for (let i = 0; i < count; i += 1) {
    const twaDeg = wrap180(inputs.windDirDeg - headingDeg);
    const wind = apparentWind(inputs.twsKn, twaDeg, speedMps, data);
    const forces = sailForces(inputs.rig, inputs.controls, wind.awsKn, wind.awaDeg, heelDeg, data);
    const resistance = hullResistance(speedMps, forces.sideN, heelDeg, inputs.rudderDeg, data);
    report = { forces, resistance, awsKn: wind.awsKn, awaDeg: wind.awaDeg, twaDeg };
    if (held) break;

    const push = forces.driveN + forces.windageN + inputs.engineThrustN;
    const acceleration = (push - Math.sign(speedMps) * resistance.totalN) / mEff;
    const before = speedMps;
    speedMps += acceleration * h;
    if (before !== 0 && Math.sign(speedMps) !== Math.sign(before)) {
      // Crossed zero: she stops if the push cannot beat the resistance at the new speed.
      const after = hullResistance(speedMps, forces.sideN, heelDeg, inputs.rudderDeg, data);
      if (Math.abs(push) < after.totalN) speedMps = 0;
    }

    const rTarget = (speedMps * Math.tan(inputs.rudderDeg * DEG)) / turnLengthM;
    const rNow = yawRateDegS * DEG;
    yawRateDegS = (rNow + (rTarget - rNow) * (1 - Math.exp(-h / yawLagS))) / DEG;
    headingDeg = wrap360(headingDeg + yawRateDegS * h);
    eastM += speedMps * h * Math.sin(headingDeg * DEG);
    northM += speedMps * h * Math.cos(headingDeg * DEG);
  }
  if (!report) throw new Error('stepBoat: no substep ran');
  // Held still: the boat is returned as it is (the store has already zeroed its speed).
  const next: BoatState = held
    ? boatState
    : { ...boatState, headingDeg, speedMps, yawRateDegS, eastM, northM };
  return { boat: next, report };
}

export interface SteadyState {
  speedMps: number;
  heelDeg: number;
  awsKn: number;
  awaDeg: number;
}

/**
 * The speed the boat settles at with the controls as they are and her heading held
 * (PHASE2_SPEC 6.3): for links without `bs`, Reset and the calibration tests. Upright; M8 adds
 * the heeled case.
 */
export function steadyState(
  controls: Controls,
  headingDeg: number,
  data: BoatData = hanse508,
  opts: { windDirDeg?: number; twsKn?: number } = {},
): SteadyState {
  const dirDeg = opts.windDirDeg ?? controls.ctl_wind_dir;
  const twsKn = opts.twsKn ?? controls.ctl_wind_speed;
  const override =
    opts.windDirDeg === undefined && opts.twsKn === undefined ? undefined : { dirDeg, twsKn };
  const twaDeg = wrap180(dirDeg - headingDeg);
  const heelDeg = 0;
  let speed = 0;
  let wind = apparentWind(twsKn, twaDeg, speed, data);
  for (let i = 0; i < 40; i += 1) {
    wind = apparentWind(twsKn, twaDeg, speed, data);
    const rig = initialRig(controls, data, {}, { velocity: [speed, 0, 0], headingDeg }, override);
    const forces = sailForces(rig, controls, wind.awsKn, wind.awaDeg, heelDeg, data);
    let low = 0;
    let high = 10;
    for (let k = 0; k < 30; k += 1) {
      const mid = (low + high) / 2;
      const net =
        forces.driveN +
        forces.windageN -
        hullResistance(mid, forces.sideN, heelDeg, 0, data).totalN;
      if (net > 0) low = mid;
      else high = mid;
    }
    speed = 0.5 * speed + 0.5 * ((low + high) / 2);
  }
  return { speedMps: speed, heelDeg, awsKn: wind.awsKn, awaDeg: wind.awaDeg };
}
