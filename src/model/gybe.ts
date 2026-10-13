import { DEG } from './angles';
import { boat, type BoatData } from './boat';
import type { RigState } from './sim';

/**
 * Gybe dynamics (PHASE2_SPEC 11): how the boom crosses when the wind gets behind the main, and
 * what that costs in energy and in load on the main sheet. Pure.
 *
 * Phase 1's trigger stays (15° by the lee, `solution.gybe`); what changes is the crossing: the
 * wind's push swings the boom with inertia and air drag, instead of a fast spring.
 */

/** The boom's swing about the mast: angle and rate, and the two sides of the crossing. */
export interface GybeSwing {
  /** Boom angle, degrees (+ = to starboard), as `RigState.theta`. */
  thetaDeg: number;
  /** Swing rate, degrees per second. */
  omegaDegS: number;
  /** The angle the swing started from. */
  startDeg: number;
  /** The solved angle on the new side, where the sheet stops the boom. */
  stopDeg: number;
}

/** What one gybe cost, worked out when the sheet stops the boom. */
export interface GybeReport {
  /** The boom was swung wide (not hauled in): the dangerous kind. */
  accidental: boolean;
  /** Speed of the boom end when it is stopped, m/s. */
  endSpeedMps: number;
  /** Kinetic energy of the swinging boom and sail, joules. */
  energyJ: number;
  /** Peak pull on the boom's sheet blocks, newtons. */
  peakBlocksN: number;
  /** Peak pull in one part of the sheet rope (what the tail and the clutch carry), newtons. */
  peakRopeN: number;
  /** Simulation time of the impact, seconds. */
  atS: number;
  /** The sector the boom swept, degrees (for the danger zone). */
  startDeg: number;
  stopDeg: number;
}

function sailArea(data: BoatData): number {
  return data.sails.main.modelledAreaM2;
}

/** Distance from the mast to the main's centre of effort along the foot at full sail (m). */
function ceLever(mainOut: number, data: BoatData): number {
  return (data.sails.main.footLength * mainOut) / 3;
}

/**
 * Moment of inertia about the mast (kg·m²): the boom as a rod, the sail's mass as a triangle
 * along the foot, and the air dragged along with the sail (the swing pushes a cylinder of air).
 */
export function boomInertia(data: BoatData = boat): number {
  const g = data.physics.gybe;
  const lb = data.rig.boom.length;
  const e = data.sails.main.footLength;
  const gooseneckY = data.rig.boom.gooseneck[1] ?? 0;
  const p = data.sails.main.headY - (gooseneckY + data.sails.main.tackHeightAboveBoom);
  const dCE = e / 3;
  const rho = data.physics.constants.airDensityKgM3;
  const airMass = rho * Math.PI * (e / 2) ** 2 * p * 0.5;
  return (g.boomMassKg * lb ** 2) / 3 + (g.sailMassKg * e ** 2) / 6 + airMass * dCE ** 2;
}

/**
 * The wind's push on the swinging boom, newtons·metre, towards the new side (`sign`).
 * `½ρ·aws²·A·driveCoefficient·dCE·cos²(heel)`, times a shape factor (data `physics.gybe.driveNote`):
 * wide swings are hit broadside, and the push builds as the sail comes round.
 */
function driveTorque(
  s: GybeSwing,
  awsKn: number,
  mainOut: number,
  heelDeg: number,
  data: BoatData,
): number {
  const g = data.physics.gybe;
  const aws = awsKn * data.physics.constants.knotMps;
  const rho = data.physics.constants.airDensityKgM3;
  const span = s.stopDeg - s.startDeg;
  const done = span === 0 ? 1 : Math.min(1, Math.max(0, (s.thetaDeg - s.startDeg) / span));
  const broadside = Math.abs(Math.sin(s.startDeg * DEG));
  const shape =
    g.driveGain *
    (g.driveFloor + (1 - g.driveFloor) * broadside) *
    (g.driveStartFraction + (1 - g.driveStartFraction) * done);
  const cosHeel = Math.cos(heelDeg * DEG);
  return (
    0.5 *
    rho *
    aws *
    aws *
    sailArea(data) *
    mainOut *
    g.driveCoefficient *
    ceLever(mainOut, data) *
    cosHeel *
    cosHeel *
    shape
  );
}

/**
 * Advances the swing by `h` seconds (semi-implicit Euler; use `h` of 0.005 s or less):
 * `M = sign · drive − cAir · ω|ω|`, `ω += M / I · h`, `θ += ω · h`, with
 * `cAir = ½ρ·A·normalForceCoefficient·dCE³` (the sail pushing through the air).
 */
export function gybeStep(
  s: GybeSwing,
  awsKn: number,
  mainOut: number,
  heelDeg: number,
  h: number,
  data: BoatData = boat,
): GybeSwing {
  const g = data.physics.gybe;
  const rho = data.physics.constants.airDensityKgM3;
  const sign = Math.sign(s.stopDeg - s.startDeg) || Math.sign(s.stopDeg) || 1;
  const lever = ceLever(mainOut, data);
  const cAir = 0.5 * rho * sailArea(data) * mainOut * g.normalForceCoefficient * lever ** 3;
  const omega = s.omegaDegS * DEG;
  const moment =
    sign * driveTorque(s, awsKn, mainOut, heelDeg, data) - cAir * omega * Math.abs(omega);
  const nextOmega = omega + (moment / boomInertia(data)) * h;
  return {
    ...s,
    omegaDegS: nextOmega / DEG,
    thetaDeg: s.thetaDeg + (nextOmega / DEG) * h,
  };
}

/** True once the boom has reached the new side's angle (or gone past it). */
export function gybeArrived(s: GybeSwing): boolean {
  const sign = Math.sign(s.stopDeg - s.startDeg) || Math.sign(s.stopDeg) || 1;
  return sign * s.thetaDeg >= sign * s.stopDeg;
}

/**
 * The impact when the sheet stops the boom at the new side: all the kinetic energy goes into
 * stretching the sheet system over `sheetStretchM`, so the peak pull on the blocks is
 * `2E / stretch`, shared by the `2 · partsPerSide` parts of the rope.
 */
export function gybeImpact(s: GybeSwing, timeS: number, data: BoatData = boat): GybeReport {
  const g = data.physics.gybe;
  const omega = s.omegaDegS * DEG;
  const energyJ = 0.5 * boomInertia(data) * omega * omega;
  const peakBlocksN = (2 * energyJ) / g.sheetStretchM;
  return {
    accidental: Math.abs(s.startDeg) > g.controlledMaxBoomDeg,
    endSpeedMps: Math.abs(omega) * data.rig.boom.length,
    energyJ,
    peakBlocksN,
    peakRopeN: peakBlocksN / (2 * data.rig.mainsheet.partsPerSide),
    atS: timeS,
    startDeg: s.startDeg,
    stopDeg: s.stopDeg,
  };
}

/**
 * The extra pull on the main sheet's rope while the impact lasts (`impactLoadDurationS` after
 * the boom is stopped), newtons: Realistic mode adds it to the tail's pull, so a sheet held by
 * hand on a winch with few turns slips.
 */
export function gybeImpactPullN(
  last: GybeReport | null,
  timeS: number,
  data: BoatData = boat,
): number {
  if (!last) return 0;
  const since = timeS - last.atS;
  return since >= 0 && since < data.physics.gybe.impactLoadDurationS ? last.peakRopeN : 0;
}

/** The sector of the danger zone to draw (PHASE2_SPEC 11.3). */
export interface DangerZone {
  /** `sweep`: where the boom crosses (or just crossed); `risk`: where it would, by the lee. */
  kind: 'sweep' | 'risk';
  fromDeg: number;
  toDeg: number;
  /** 1 while the boom crosses, then fading to 0 over `dangerFlashS`; always 1 for `risk`. */
  strength: number;
}

/**
 * The danger zone for this frame: the boom's sweep while it crosses and for `dangerFlashS`
 * after, otherwise a faint outline while the boom is by the lee (the risk), otherwise none.
 */
export function dangerZone(
  rig: Pick<RigState, 'gybeSwing' | 'lastGybe' | 'timeS' | 'theta'> & {
    solution: Pick<RigState['solution'], 'byTheLee'>;
  },
  data: BoatData = boat,
): DangerZone | null {
  if (rig.gybeSwing) {
    return {
      kind: 'sweep',
      fromDeg: rig.gybeSwing.startDeg,
      toDeg: rig.gybeSwing.stopDeg,
      strength: 1,
    };
  }
  const flashS = data.physics.gybe.dangerFlashS;
  if (rig.lastGybe) {
    const since = rig.timeS - rig.lastGybe.atS;
    if (since >= 0 && since < flashS) {
      return {
        kind: 'sweep',
        fromDeg: rig.lastGybe.startDeg,
        toDeg: rig.lastGybe.stopDeg,
        strength: 1 - since / flashS,
      };
    }
  }
  if (rig.solution.byTheLee) {
    // The boom would swing to the mirror image of where it is.
    return { kind: 'risk', fromDeg: rig.theta.value, toDeg: -rig.theta.value, strength: 1 };
  }
  return null;
}
