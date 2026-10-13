import { apparentWind } from './apparentWind';
import { DEG, interpTable, wrap180, wrap360 } from './angles';
import { boat as hanse508, type BoatData } from './boat';
import { controlSpec, type Controls } from './controls';
import { rightingMomentNm, rollDamping, rollInertia } from './heel';
import { boatMassKg, hullResistance, type Resistance } from './hullResistance';
import { sailForces, type SailForces } from './sailForces';
import { initialRig, type RigState } from './sim';
import type { SailDamage } from './trim';
import {
  addedResistanceN,
  initialWaveMotion,
  rigMotion,
  stepWaveMotion,
  waveYawDeg,
  type WaveMotion,
} from './waveMotion';
import type { WaveTrain } from './waves';

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
  /** + = heeled to starboard. */
  heelDeg: number;
  heelRateDegS: number;
  /** Seconds the "round-up" alert still shows (M8); set while she turns into the wind. */
  roundUpS: number;
  /** Seconds she has been heeled more than `heel.overpoweredHeelDeg` (M8). */
  overpoweredS: number;
  /** Metres east and north of where the boat started. */
  eastM: number;
  northM: number;
  /** Heave, pitch and roll on the waves, and the wave phases at the boat (M14). */
  waves: WaveMotion;
}

export function initialBoat(overrides: Partial<BoatState> = {}): BoatState {
  return {
    mode: 'sailing',
    headingDeg: 0,
    speedMps: 0,
    yawRateDegS: 0,
    heelDeg: 0,
    heelRateDegS: 0,
    roundUpS: 0,
    overpoweredS: 0,
    eastM: 0,
    northM: 0,
    waves: initialWaveMotion(),
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
  /**
   * The most rudder the steering can give now (the autopilot's limit, or the wheel's), for the
   * round-up test. Missing: the wheel's.
   */
  rudderLimitDeg?: number;
  /** Flogging damage (M9): a torn sail gives less force. Missing = new sails. */
  damage?: SailDamage;
  /** The wave trains now (M14); missing = none (M15: they act on the sails, the steering and the speed). */
  trains?: readonly WaveTrain[];
}

export interface MotionReport {
  forces: SailForces;
  resistance: Resistance;
  awsKn: number;
  awaDeg: number;
  twaDeg: number;
  /** Heeling moment, righting moment (Nm), rudder grip and the rudder angle that turns her (M8). */
  heelMomentNm: number;
  rightingMomentNm: number;
  grip: number;
  effectiveRudderDeg: number;
  /** She is turning into the wind by herself (the alert stays set for 3 s). */
  roundUp: boolean;
  /**
   * The waves' action in the last substep (M15; 0 in Held still): extra resistance (N, raw), the
   * extra rudder they give (degrees) and the sails' sideways speed from rolling (m/s).
   */
  waveResistanceN: number;
  waveYawDeg: number;
  rigSideMps: number;
}

const NO_TRAINS: readonly WaveTrain[] = [];

/** How long the round-up alert stays set after the last substep that met the test, seconds. */
export const ROUND_UP_HOLD_S = 3;

/** Mass including the water the hull drags along, kg. */
export function effectiveMassKg(data: BoatData = hanse508): number {
  return boatMassKg(data) * (1 + data.physics.mass.addedMassFraction);
}

/** How many substeps a step of `dt` seconds takes: none longer than `integration.maxStepS`. */
export function substepCount(dt: number, data: BoatData = hanse508): number {
  return Math.max(1, Math.ceil(dt / data.physics.integration.maxStepS));
}

/** Advances the boat by `dt` seconds, in substeps of at most `integration.maxStepS`. */
export function stepBoat(
  boatState: BoatState,
  inputs: MotionInputs,
  dt: number,
  data: BoatData = hanse508,
): { boat: BoatState; report: MotionReport } {
  const { turnLengthM, yawLagS } = data.physics.steering;
  const mEff = effectiveMassKg(data);
  const held = boatState.mode === 'held';
  const count = held ? 1 : substepCount(dt, data);
  const h = held ? 0 : dt / count;

  const heelData = data.physics.heel;
  const inertia = rollInertia(data);
  const damping = rollDamping(data);
  const rudderLimit = inputs.rudderLimitDeg ?? controlSpec('ctl_rudder').max;
  let { headingDeg, speedMps, yawRateDegS, heelDeg, heelRateDegS, roundUpS, overpoweredS } =
    boatState;
  let { eastM, northM, waves } = boatState;
  const trains = inputs.trains ?? NO_TRAINS;
  if (held) {
    // Held still: the boat bobs on the waves, nothing else moves (PHASE3_SPEC 6.3).
    const waveSteps = substepCount(dt, data);
    for (let i = 0; i < waveSteps; i += 1) {
      waves = stepWaveMotion(waves, trains, 0, headingDeg, dt / waveSteps, data);
    }
  }
  if (held) {
    speedMps = 0;
    heelDeg = 0;
  }
  let report: MotionReport | undefined;
  for (let i = 0; i < count; i += 1) {
    if (!held) waves = stepWaveMotion(waves, trains, speedMps, headingDeg, h, data);
    const twaDeg = wrap180(inputs.windDirDeg - headingDeg);
    // The rocking moves the sails through the air (M15): they feel it as a swing in the wind.
    const rocking = held ? { forwardMps: 0, sideMps: 0 } : rigMotion(waves, data);
    const wind = apparentWind(
      inputs.twsKn,
      twaDeg,
      speedMps + rocking.forwardMps,
      data,
      rocking.sideMps,
    );
    const forces = sailForces(
      inputs.rig,
      inputs.controls,
      wind.awsKn,
      wind.awaDeg,
      heelDeg,
      data,
      inputs.damage,
    );
    const resistance = hullResistance(speedMps, forces.sideN, heelDeg, inputs.rudderDeg, data);
    const makeReport = (
      grip: number,
      effectiveRudderDeg: number,
      roundUp: boolean,
      waveResistance = 0,
      waveYaw = 0,
    ): MotionReport => ({
      forces,
      resistance,
      awsKn: wind.awsKn,
      awaDeg: wind.awaDeg,
      twaDeg,
      heelMomentNm: forces.heelMomentNm,
      rightingMomentNm: rightingMomentNm(heelDeg, data),
      grip,
      effectiveRudderDeg,
      roundUp,
      waveResistanceN: waveResistance,
      waveYawDeg: waveYaw,
      rigSideMps: held ? 0 : rocking.sideMps,
    });
    if (held) {
      report = makeReport(1, inputs.rudderDeg, false);
      break;
    }

    const push = forces.driveN + forces.windageN + inputs.engineThrustN;
    const waveResistance = addedResistanceN(speedMps, headingDeg, trains, data);
    const acceleration = (push - Math.sign(speedMps) * resistance.totalN - waveResistance) / mEff;
    const before = speedMps;
    speedMps += acceleration * h;
    if (before !== 0 && Math.sign(speedMps) !== Math.sign(before)) {
      // Crossed zero: she stops if the push cannot beat the resistance at the new speed.
      const after = hullResistance(speedMps, forces.sideN, heelDeg, inputs.rudderDeg, data);
      if (Math.abs(push) < after.totalN) speedMps = 0;
    }

    // Roll: the sails heel her, the hull's shape rights her, the water damps it.
    let rollRate = heelRateDegS * DEG;
    rollRate +=
      ((forces.heelMomentNm - rightingMomentNm(heelDeg, data) - damping * rollRate) / inertia) * h;
    heelDeg += (rollRate * h) / DEG;
    if (Math.abs(heelDeg) >= heelData.maxHeelDeg) {
      heelDeg = Math.sign(heelDeg) * heelData.maxHeelDeg;
      rollRate = 0;
    }
    heelRateDegS = rollRate / DEG;
    overpoweredS = Math.abs(heelDeg) > heelData.overpoweredHeelDeg ? overpoweredS + h : 0;

    // Steering: the rudder loses grip as she heels, and the heel itself turns her to windward.
    const gripNow = interpTable(heelData.rudderGripByHeelDeg, Math.abs(heelDeg));
    const effectiveRudderDeg =
      gripNow * inputs.rudderDeg - heelData.weatherHelmDegPerDegHeel * heelDeg;
    // The waves push on the bow like extra rudder (M15).
    const waveYaw = waveYawDeg(waves, trains, headingDeg, data);
    const rTarget = (speedMps * Math.tan((effectiveRudderDeg + waveYaw) * DEG)) / turnLengthM;
    const rNow = yawRateDegS * DEG;
    yawRateDegS = (rNow + (rTarget - rNow) * (1 - Math.exp(-h / yawLagS))) / DEG;
    headingDeg = wrap360(headingDeg + yawRateDegS * h);
    eastM += speedMps * h * Math.sin(headingDeg * DEG);
    northM += speedMps * h * Math.cos(headingDeg * DEG);

    // Round-up: heeled, turning into the wind, with the rudder (almost) hard over against it.
    const intoWind = yawRateDegS * Math.sign(twaDeg) > heelData.roundUpMinYawRateDegS;
    const rudderAgainst = -Math.sign(yawRateDegS) * inputs.rudderDeg >= 0.9 * rudderLimit;
    roundUpS =
      Math.abs(heelDeg) >= heelData.roundUpMinHeelDeg && intoWind && rudderAgainst
        ? ROUND_UP_HOLD_S
        : Math.max(0, roundUpS - h);
    report = makeReport(gripNow, effectiveRudderDeg, roundUpS > 0, waveResistance, waveYaw);
  }
  if (!report) throw new Error('stepBoat: no substep ran');
  // Held still: the boat is returned as it is (the store has already zeroed its speed), with
  // the wave motion.
  const next: BoatState = held
    ? waves === boatState.waves
      ? boatState
      : { ...boatState, waves }
    : {
        ...boatState,
        headingDeg,
        speedMps,
        yawRateDegS,
        heelDeg,
        heelRateDegS,
        roundUpS,
        overpoweredS,
        eastM,
        northM,
        waves,
      };
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
 * (PHASE2_SPEC 6.3): for links without `bs`, Reset and the calibration tests. With `opts.heel`
 * she also heels until the righting moment balances the sails' heeling moment (M8), and the
 * heel takes drive away. `opts.engineThrustN` (M12) adds the engine's push, ahead only: a link
 * with the engine running opens at the speed it gives. `opts.trains` (M15) adds the waves' extra
 * resistance; the rocking is left out (it averages out).
 */
export function steadyState(
  controls: Controls,
  headingDeg: number,
  data: BoatData = hanse508,
  opts: {
    heel?: boolean;
    windDirDeg?: number;
    twsKn?: number;
    engineThrustN?: number;
    trains?: readonly WaveTrain[];
  } = {},
): SteadyState {
  const dirDeg = opts.windDirDeg ?? controls.ctl_wind_dir;
  const twsKn = opts.twsKn ?? controls.ctl_wind_speed;
  const override =
    opts.windDirDeg === undefined && opts.twsKn === undefined ? undefined : { dirDeg, twsKn };
  const twaDeg = wrap180(dirDeg - headingDeg);
  const thrustN = opts.engineThrustN ?? 0;
  let heelDeg = 0;
  let speed = 0;
  let wind = apparentWind(twsKn, twaDeg, speed, data);
  for (let i = 0; i < 40; i += 1) {
    wind = apparentWind(twsKn, twaDeg, speed, data);
    const rig = initialRig(controls, data, {}, { velocity: [speed, 0, 0], headingDeg }, override);
    const at = (heel: number) => sailForces(rig, controls, wind.awsKn, wind.awaDeg, heel, data);
    if (opts.heel) {
      // The heel where the sails' heeling moment equals the righting moment (30 bisections).
      let lowHeel = 0;
      let highHeel = data.physics.heel.maxHeelDeg;
      for (let k = 0; k < 30; k += 1) {
        const mid = (lowHeel + highHeel) / 2;
        const surplus = Math.abs(at(mid).heelMomentNm) - Math.abs(rightingMomentNm(mid, data));
        if (surplus > 0) lowHeel = mid;
        else highHeel = mid;
      }
      const found = -Math.sign(wind.awaDeg) * ((lowHeel + highHeel) / 2);
      heelDeg = 0.5 * heelDeg + 0.5 * found;
    }
    const forces = at(heelDeg);
    let low = 0;
    let high = 10;
    for (let k = 0; k < 30; k += 1) {
      const mid = (low + high) / 2;
      const net =
        forces.driveN +
        forces.windageN +
        thrustN -
        hullResistance(mid, forces.sideN, heelDeg, 0, data).totalN -
        addedResistanceN(mid, headingDeg, opts.trains ?? NO_TRAINS, data);
      if (net > 0) low = mid;
      else high = mid;
    }
    speed = 0.5 * speed + 0.5 * ((low + high) / 2);
  }
  return { speedMps: speed, heelDeg, awsKn: wind.awsKn, awaDeg: wind.awaDeg };
}
