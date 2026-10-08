import { boat, type BoatData } from './boat';
import { curveSide, type Side } from './boomSolver';
import type { Controls } from './controls';
import { jibClew, jibTwistDeg } from './jib';
import { mainSailCorners, type BoomPose, type SailCorners } from './rigGeometry';
import type { RigState } from './sim';
import {
  add,
  cross,
  length,
  normalize,
  rotateAroundAxis,
  scale,
  sub,
  vec3,
  type Vec3,
} from './vec3';

/**
 * Sail shapes (PHASE1_SPEC 8.5, 8.6): a grid between the luff (mast or forestay) and the leech.
 * Each row is turned to leeward around the luff by a twist that grows from 0 at the foot to
 * `twist` at the head; a filled sail curves to leeward, a luffing sail flaps from the luff.
 */

const DEG = Math.PI / 180;

/** Twist at the head, degrees: baseTwistDeg + twistPerDegBoomRise · max(0, ψ). */
export function mainSailTwistDeg(psiDeg: number, data: BoatData = boat): number {
  const v = data.visual;
  return v.baseTwistDeg + v.twistPerDegBoomRise * Math.max(0, psiDeg);
}

export interface MainSailShapeInput {
  pose: BoomPose;
  /** Unfurled fraction, 0..1. */
  unfurled: number;
  /** 0 = luffing, 1 = filled. */
  fill: number;
  /** The leeward side: the sail twists and curves towards it (see curveSide). */
  side: Side;
  windSpeedKn: number;
  timeS: number;
}

/**
 * The mainsail as drawn for a rig state: the drawn boom pose, the unfurled fraction, the drawn
 * fill, and the curve towards leeward. Leeward comes from the wind, not the boom, so the curve
 * never points the wrong way while the boom swings across in a gybe or sails by the lee.
 */
export function mainSailInputFor(rig: RigState, controls: Controls): MainSailShapeInput {
  return {
    pose: { thetaDeg: rig.theta.value, psiDeg: rig.psi.value },
    unfurled: rig.applied.mainFurl / 100,
    fill: rig.fill,
    side: curveSide(controls.ctl_wind_dir, rig.solution.side),
    windSpeedKn: controls.ctl_wind_speed,
    timeS: rig.timeS,
  };
}

/** The jib as drawn: rotation around the luff, unfurled fraction, fill and leeward side. */
export interface JibShapeInput {
  phiDeg: number;
  /** Unfurled fraction reached, 0..1. */
  unfurled: number;
  fill: number;
  side: Side;
  windSpeedKn: number;
  timeS: number;
}

/** The jib as drawn for a rig state: the smoothed rotation and fill, curving away from the wind. */
export function jibInputFor(rig: RigState, controls: Controls): JibShapeInput {
  return {
    phiDeg: rig.jibPhi.value,
    unfurled: rig.jibSolution.unfurled,
    fill: rig.jibFill,
    side: curveSide(controls.ctl_wind_dir, rig.jibSolution.side),
    windSpeedKn: controls.ctl_wind_speed,
    timeS: rig.timeS,
  };
}

export interface SailGrid {
  /** Number of rows and columns of quads; there are (rows + 1) × (columns + 1) points. */
  rows: number;
  columns: number;
  /** Row by row from the foot to the head; in each row from the luff to the leech. */
  points: Vec3[];
}

export function mainSailGrid(input: MainSailShapeInput, data: BoatData = boat): SailGrid {
  return sailGrid(
    {
      corners: mainSailCorners(input.unfurled, input.pose, data),
      twistDeg: mainSailTwistDeg(input.pose.psiDeg, data),
      fill: input.fill,
      side: input.side,
      windSpeedKn: input.windSpeedKn,
      timeS: input.timeS,
    },
    data,
  );
}

/** Jib corners for a rotation φ and unfurled fraction: the clew rotates around the luff. */
export function jibSailCorners(
  phiDeg: number,
  unfurled: number,
  data: BoatData = boat,
): SailCorners {
  const jib = data.sails.jib;
  return { tack: vec3(jib.tack), head: vec3(jib.head), clew: jibClew(phiDeg, unfurled, data) };
}

export function jibSailGrid(input: JibShapeInput, data: BoatData = boat): SailGrid {
  return sailGrid(
    {
      corners: jibSailCorners(input.phiDeg, input.unfurled, data),
      twistDeg: jibTwistDeg(input.phiDeg, input.unfurled, data),
      fill: input.fill,
      side: input.side,
      windSpeedKn: input.windSpeedKn,
      timeS: input.timeS,
    },
    data,
  );
}

interface SailGridInput {
  corners: SailCorners;
  /** Twist at the head, degrees. */
  twistDeg: number;
  fill: number;
  side: Side;
  windSpeedKn: number;
  timeS: number;
}

/**
 * The grid of one sail. The rows turn around the luff (tack → head): for the mainsail that is
 * the vertical mast, for the jib the sloping forestay. Same look numbers for both sails.
 */
function sailGrid(input: SailGridInput, data: BoatData): SailGrid {
  const look = data.visual.mainSail;
  const rows = look.rows;
  const columns = look.columns;
  const { corners } = input;
  const axis = normalize(sub(corners.head, corners.tack));
  const twist = input.twistDeg;
  const fill = Math.min(1, Math.max(0, input.fill));
  const ripple =
    (1 - fill) *
    look.rippleAmplitudeM *
    Math.min(look.rippleMaxWindScale, Math.max(0, input.windSpeedKn) / look.rippleReferenceKn);
  // Flapping starts at the luff: a nearly filled sail only flaps in its front part.
  const rippleWidth = 1 - (1 - look.rippleFrontFractionWhenFilled) * fill;
  const phase = 2 * Math.PI * look.rippleFrequencyHz * input.timeS;

  const points: Vec3[] = [];
  for (let i = 0; i <= rows; i += 1) {
    const v = i / rows;
    const luff = add(corners.tack, scale(sub(corners.head, corners.tack), v));
    const leech = add(corners.clew, scale(sub(corners.head, corners.clew), v));
    const chord = rotateAroundAxis(sub(leech, luff), axis, input.side * twist * v * DEG);
    const chordLength = length(chord);
    // Normal on the leeward side of the chord, across the luff (horizontal for the mainsail).
    const across = cross(axis, chord);
    const size = length(across);
    const normal: Vec3 = size > 1e-9 ? scale(across, input.side / size) : [0, 0, input.side];
    const depth = fill * look.camberRatio * chordLength;
    for (let j = 0; j <= columns; j += 1) {
      const u = j / columns;
      let offset = depth * 4 * u * (1 - u);
      if (ripple > 0 && u < rippleWidth) {
        const envelope = Math.sin((Math.PI * u) / rippleWidth);
        const wave = Math.sin(
          (2 * Math.PI * u * chordLength) / look.rippleWavelengthM -
            phase +
            look.rippleHeightPhaseRad * v,
        );
        offset += ripple * envelope * wave;
      }
      points.push(add(add(luff, scale(chord, u)), scale(normal, offset)));
    }
  }
  return { rows, columns, points };
}
