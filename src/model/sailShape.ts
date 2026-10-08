import { boat, type BoatData } from './boat';
import type { Side } from './boomSolver';
import { mainSailCorners, type BoomPose } from './rigGeometry';
import { add, length, scale, sub, type Vec3 } from './vec3';

/**
 * Mainsail shape (PHASE1_SPEC 8.6): a grid between the luff (on the mast) and the leech.
 * Each row is turned to leeward by a twist that grows from 0 at the foot to `twist` at the
 * head; a filled sail curves to leeward, a luffing sail flaps from the luff.
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
  /** The boom's side: the sail twists and curves towards it (leeward). */
  side: Side;
  windSpeedKn: number;
  timeS: number;
}

export interface SailGrid {
  /** Number of rows and columns of quads; there are (rows + 1) × (columns + 1) points. */
  rows: number;
  columns: number;
  /** Row by row from the foot to the head; in each row from the luff to the leech. */
  points: Vec3[];
}

/** Rotates a vector around the vertical axis so that a boom angle θ becomes θ + angle. */
function turn(v: Vec3, angleDeg: number): Vec3 {
  const a = angleDeg * DEG;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
}

export function mainSailGrid(input: MainSailShapeInput, data: BoatData = boat): SailGrid {
  const look = data.visual.mainSail;
  const rows = look.rows;
  const columns = look.columns;
  const corners = mainSailCorners(input.unfurled, input.pose, data);
  const twist = mainSailTwistDeg(input.pose.psiDeg, data);
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
    const chord = turn(sub(leech, luff), input.side * twist * v);
    const chordLength = length(chord);
    const horizontal = Math.hypot(chord[0], chord[2]);
    // Horizontal normal on the leeward side of the chord.
    const normal: Vec3 =
      horizontal > 1e-9
        ? [(input.side * chord[2]) / horizontal, 0, (-input.side * chord[0]) / horizontal]
        : [0, 0, input.side];
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
