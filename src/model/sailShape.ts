import { boat, type BoatData } from './boat';
import { curveSide, type Side } from './boomSolver';
import type { Controls } from './controls';
import { jibClew, jibTwistDeg } from './jib';
import {
  capShroudPoints,
  lowerShroudPoints,
  mainSailCorners,
  spreaderSegments,
  spreaderTip,
  type BoomPose,
  type SailCorners,
} from './rigGeometry';
import type { RigState } from './sim';
import {
  add,
  cross,
  distance,
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
  const corners = mainSailCorners(input.unfurled, input.pose, data);
  const layout = mainSailLayout(corners, data);
  const grid = sailGrid(
    {
      corners,
      twistDeg: mainSailTwistDeg(input.pose.psiDeg, data),
      fill: input.fill,
      side: input.side,
      windSpeedKn: input.windSpeedKn,
      timeS: input.timeS,
    },
    data,
    layout,
  );
  // The sail lies on the boom's side; with the boom on the centreline it cannot reach the rig.
  const boomSide = Math.sign(input.pose.thetaDeg);
  if (boomSide !== 0) {
    // A flapping sail slaps against the rig: a row that passes this close counts as touching.
    const reachOut = rippleAmplitude(input.fill, input.windSpeedKn, data);
    wrapAroundRig(grid, layout, boomSide as Side, reachOut, data);
  }
  return grid;
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

/** Flapping amplitude of a luffing sail, metres: none when filled, more in more wind. */
function rippleAmplitude(fill: number, windSpeedKn: number, data: BoatData): number {
  const look = data.visual.mainSail;
  return (
    (1 - Math.min(1, Math.max(0, fill))) *
    look.rippleAmplitudeM *
    Math.min(look.rippleMaxWindScale, Math.max(0, windSpeedKn) / look.rippleReferenceKn)
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
function sailGrid(input: SailGridInput, data: BoatData, layout?: GridLayout): SailGrid {
  const look = data.visual.mainSail;
  const rows = look.rows;
  const columns = look.columns;
  const { corners } = input;
  const axis = normalize(sub(corners.head, corners.tack));
  const twist = input.twistDeg;
  const fill = Math.min(1, Math.max(0, input.fill));
  const ripple = rippleAmplitude(fill, input.windSpeedKn, data);
  // Flapping starts at the luff: a nearly filled sail only flaps in its front part.
  const rippleWidth = 1 - (1 - look.rippleFrontFractionWhenFilled) * fill;
  const phase = 2 * Math.PI * look.rippleFrequencyHz * input.timeS;

  const points: Vec3[] = [];
  for (let i = 0; i <= rows; i += 1) {
    const v = layout?.rowV[i] ?? i / rows;
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
      const u = layout
        ? columnU(j, columns, layout.contactU[i] ?? 0.5, layout.contactColumn)
        : j / columns;
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

/**
 * Where the rows and columns of the mainsail grid lie (fractions of the height and of each
 * row's chord). One row passes through each spreader tip and one column (the contact column)
 * follows the cap shroud, so the sail can be bent exactly around them (M3b).
 */
export interface GridLayout {
  /** Height fraction of each row, foot (0) to head (1). */
  rowV: number[];
  /** Per row: the chord fraction of the contact column. */
  contactU: number[];
  contactColumn: number;
  /** Per row: index of the spreader set whose tip this row passes through, or −1. */
  spreaderRow: number[];
}

/** Chord fraction of column j: evenly spaced on each side of the contact column. */
function columnU(j: number, columns: number, contactU: number, contactColumn: number): number {
  if (j <= contactColumn) return (j / contactColumn) * contactU;
  return contactU + ((j - contactColumn) / (columns - contactColumn)) * (1 - contactU);
}

/** A point of a polyline at height y (clamped to its ends); the polyline runs upwards. */
function pointAtHeight(points: Vec3[], y: number): Vec3 {
  const first = points[0] as Vec3;
  if (y <= first[1]) return first;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1] as Vec3;
    const b = points[i] as Vec3;
    if (y <= b[1]) {
      const t = b[1] > a[1] ? (y - a[1]) / (b[1] - a[1]) : 0;
      return add(a, scale(sub(b, a), t));
    }
  }
  return points[points.length - 1] as Vec3;
}

function planDistance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[2] - b[2]);
}

/**
 * Rows and columns of the mainsail grid for its corners. The luff is vertical, so a row's
 * height and plan length do not depend on the boom's swing or the twist; the layout is the same
 * on both sides (the rig is symmetric).
 */
export function mainSailLayout(corners: SailCorners, data: BoatData = boat): GridLayout {
  const look = data.visual.mainSail;
  const rows = look.rows;
  const contactColumn = Math.round(look.columns * look.contactColumnFraction);
  const shroud = capShroudPoints(1, data);
  const tackY = corners.tack[1];
  const clewY = corners.clew[1];
  const headY = corners.head[1];
  const clewReach = planDistance(corners.clew, corners.tack);
  const chordAt = (v: number) => Math.max(1e-6, (1 - v) * clewReach);
  /** Height of row v at chord fraction u. */
  const heightAt = (v: number, u: number) => {
    const luffY = tackY + v * (headY - tackY);
    const leechY = clewY + v * (headY - clewY);
    return luffY + u * (leechY - luffY);
  };
  const [minU = 0, maxU = 1] = look.contactUClamp;
  const clampU = (u: number) => Math.min(maxU, Math.max(minU, u));
  /** Chord fraction where the shroud crosses row v (two passes for the sloping row). */
  const contactUFor = (v: number) => {
    let u = 0.5;
    for (let k = 0; k < 2; k += 1) {
      const crossing = pointAtHeight(shroud, heightAt(v, u));
      u = clampU(planDistance(crossing, corners.tack) / chordAt(v));
    }
    return u;
  };

  const rowV = Array.from({ length: rows + 1 }, (_, i) => i / rows);
  const spreaderRow = rowV.map(() => -1);
  data.rig.spreaders.sets.forEach((set, index) => {
    const tip = spreaderTip(set, 1, data);
    // Solve for the row whose contact column is at the tip's height: y(v) = A + v · (H − A).
    let v = (set.y - tackY) / (headY - tackY);
    for (let k = 0; k < 4; k += 1) {
      const u = Math.min(1, planDistance(tip, corners.tack) / chordAt(v));
      const a = (1 - u) * tackY + u * clewY;
      v = (set.y - a) / (headY - a);
    }
    const row = Math.round(v * rows);
    if (row > 0 && row < rows && spreaderRow[row] === -1 && v > 0 && v < 1) {
      rowV[row] = v;
      spreaderRow[row] = index;
    }
  });
  return { rowV, contactU: rowV.map(contactUFor), contactColumn, spreaderRow };
}

interface Disc {
  /** Centre in plan (x, z), at the row's height. */
  x: number;
  z: number;
  /** Clearance: drawn radius plus the gap kept to the sail. */
  clearance: number;
}

/**
 * Bends each row of the mainsail around the spreader tips and shrouds on the boom's side
 * instead of passing through them (M3b): eased far out, the sail presses against the rig. The
 * row runs straight from the luff to the binding obstacle, wraps around it at the contact column
 * and continues beyond it in its own shape. The boom and its 72° limit are unchanged.
 */
function wrapAroundRig(
  grid: SailGrid,
  layout: GridLayout,
  side: Side,
  touchDistance: number,
  data: BoatData,
): void {
  const cols = grid.columns + 1;
  const gap = data.modelDetail.sailRigClearance;
  const cap = capShroudPoints(side, data);
  const lower = lowerShroudPoints(side, data);
  const spreaders = spreaderSegments(side, data);
  const wire = data.modelDetail.wireRenderRadius;
  const step = data.modelDetail.sailRigSampleStepM;

  for (let i = 0; i <= grid.rows; i += 1) {
    const row = grid.points.slice(i * cols, (i + 1) * cols);
    const luff = row[0] as Vec3;
    const leech = row[grid.columns] as Vec3;
    const contact = row[layout.contactColumn] as Vec3;
    // Plan polar coordinates around the luff: radius, and angle from aft towards the boom side.
    const polar = (x: number, z: number) => ({
      r: Math.hypot(x - luff[0], z - luff[2]),
      a: Math.atan2(side * (z - luff[2]), -(x - luff[0])),
    });
    const fromPolar = (r: number, a: number): [number, number] => [
      luff[0] - r * Math.cos(a),
      luff[2] + side * r * Math.sin(a),
    ];
    const reach = polar(leech[0], leech[2]).r;

    const discs: Disc[] = [];
    const shroudAt = (points: readonly Vec3[]) => {
      if (
        contact[1] < (points[0] as Vec3)[1] ||
        contact[1] > (points[points.length - 1] as Vec3)[1]
      )
        return;
      const p = pointAtHeight([...points], contact[1]);
      discs.push({ x: p[0], z: p[2], clearance: wire + gap });
    };
    shroudAt(cap);
    shroudAt(lower);
    const spreaderIndex = layout.spreaderRow[i] ?? -1;
    const spreader = spreaders[spreaderIndex];
    if (spreader) {
      const n = Math.max(1, Math.ceil(distance(spreader.a, spreader.b) / step));
      for (let k = 0; k <= n; k += 1) {
        const p = add(spreader.a, scale(sub(spreader.b, spreader.a), k / n));
        discs.push({ x: p[0], z: p[2], clearance: spreader.radius + gap });
      }
    }

    /** Angle of the row (as it is) at plan radius r: interpolated between its points. */
    const rowAngleAt = (r: number) => {
      let previous = polar(luff[0], luff[2]);
      for (let j = 1; j < row.length; j += 1) {
        const p = row[j] as Vec3;
        const current = polar(p[0], p[2]);
        if (current.r >= r) {
          if (j === 1) return current.a;
          const t = (r - previous.r) / Math.max(1e-9, current.r - previous.r);
          return previous.a + t * (current.a - previous.a);
        }
        previous = current;
      }
      return previous.a;
    };

    // The binding obstacle: of those the row passes through (or too close on the windward
    // side), the one whose windward tangent from the luff is furthest to windward.
    let binding: { disc: Disc; r: number; a: number; tangent: number } | undefined;
    for (const disc of discs) {
      const { r, a } = polar(disc.x, disc.z);
      if (r <= disc.clearance || r - disc.clearance > reach) continue;
      const tangent = a - Math.asin(Math.min(1, disc.clearance / r));
      if (rowAngleAt(r) <= tangent - Math.min(1, touchDistance / r)) continue;
      if (!binding || tangent < binding.tangent) binding = { disc, r, a, tangent };
    }
    if (!binding) continue;

    // The wrap point: off the obstacle to windward and outwards, so both the straight part
    // from the luff and the part beyond (bending up to 90° to leeward) clear it.
    const c = binding.disc.clearance;
    const { a } = binding;
    // Outwards from the luff, and to windward (towards a smaller angle, i.e. aft).
    const radial = [-Math.cos(a), side * Math.sin(a)] as const;
    const windward = [-Math.sin(a), -side * Math.cos(a)] as const;
    const wrap = polar(
      binding.disc.x + c * (radial[0] + windward[0]),
      binding.disc.z + c * (radial[1] + windward[1]),
    );
    const wrapsBeyond = reach > wrap.r;
    const limit = wrapsBeyond ? wrap.a : binding.tangent;
    // A leech that only just reaches past the obstacle mostly rests against it; the further it
    // reaches beyond, the more it curls round to leeward. Gradual, so neighbouring rows agree.
    const overhang = (reach - wrap.r) / data.modelDetail.sailRigCurlOverhangM;
    const curl = wrapsBeyond ? smoothstep01(overhang) : 0;

    for (let j = 1; j <= grid.columns; j += 1) {
      const k = i * cols + j;
      const p = grid.points[k] as Vec3;
      if (wrapsBeyond && j === layout.contactColumn) {
        const [x, z] = fromPolar(wrap.r, wrap.a);
        grid.points[k] = [x, p[1], z];
        continue;
      }
      const here = polar(p[0], p[2]);
      if (here.a <= limit) continue;
      // Beyond the wrap point the sail curves on to leeward (fully once it reaches far enough).
      const beyond = wrapsBeyond && j > layout.contactColumn && here.r > wrap.r;
      const angle = beyond ? limit + (here.a - limit) * curl : limit;
      const [x, z] = fromPolar(here.r, angle);
      grid.points[k] = [x, p[1], z];
    }
  }
}

function smoothstep01(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}
