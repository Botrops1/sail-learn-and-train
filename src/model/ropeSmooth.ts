import { boat, type BoatData } from './boat';
import type { RopeDrawing } from './ropePaths';
import { add, cross, dot, length, normalize, scale, sub, type Vec3 } from './vec3';

/**
 * Ropes as drawn (PHASE9_SPEC 6.3, M60): every corner of a rope's line becomes an arc, and a
 * rope's tail gets two more points that mark its whipping. For the picture only: the rope
 * paths, lengths and loads are those of `ropeDrawings`, which this file never changes. Pure.
 */
export interface DrawnStrand {
  points: Vec3[];
  feed: number;
  /** Index of the first whipped point (the whipping runs from it to the end), or null. */
  whipFrom: number | null;
}

export interface DrawnRope {
  id: RopeDrawing['id'];
  state: RopeDrawing['state'];
  strands: DrawnStrand[];
}

const DEGENERATE_M = 1e-6;
const STRAIGHT_RAD = 1e-4;

/**
 * The line with each interior point replaced by `arcPoints` points on an arc (a fillet of radius
 * `radiusM`, made smaller where a neighbouring segment is short: it uses at most `maxShare` of
 * each), moved outwards so that its middle passes through the corner itself: a rope bent over an
 * edge never sinks deeper into the part than the sharp corner did (M60, owner's PR #135). The
 * two ends stay. A line of n ≥ 2 points gives 2 + (n − 2)·K points.
 */
export function roundCorners(
  points: readonly Vec3[],
  radiusM: number,
  arcPoints: number,
  maxShare: number,
): Vec3[] {
  if (points.length < 3) return points.map((p) => [p[0], p[1], p[2]]);
  const out: Vec3[] = [points[0] as Vec3];
  const steps = Math.max(1, arcPoints - 1);
  for (let i = 1; i < points.length - 1; i += 1) {
    const a = points[i - 1] as Vec3;
    const p = points[i] as Vec3;
    const b = points[i + 1] as Vec3;
    const la = length(sub(p, a));
    const lb = length(sub(b, p));
    const copies = (): void => {
      for (let k = 0; k < arcPoints; k += 1) out.push([p[0], p[1], p[2]]);
    };
    if (la < DEGENERATE_M || lb < DEGENERATE_M) {
      copies();
      continue;
    }
    const u = scale(sub(p, a), 1 / la);
    const v = scale(sub(b, p), 1 / lb);
    const turn = Math.acos(Math.min(1, Math.max(-1, dot(u, v))));
    if (turn > Math.PI - 1e-4) {
      copies();
      continue;
    }
    const tmax = maxShare * Math.min(la, lb);
    if (turn < STRAIGHT_RAD) {
      const half = Math.min(tmax, radiusM);
      for (let k = 0; k < arcPoints; k += 1) {
        out.push(add(p, scale(u, (-1 + (2 * k) / steps) * half)));
      }
      continue;
    }
    let t = radiusM * Math.tan(turn / 2);
    let r = radiusM;
    if (t > tmax) {
      t = tmax;
      r = t / Math.tan(turn / 2);
    }
    const t1 = sub(p, scale(u, t));
    const n = normalize(sub(v, scale(u, dot(u, v))));
    const centre = add(t1, scale(n, r));
    const arcAt = (phi: number): Vec3 =>
      add(sub(centre, scale(n, r * Math.cos(phi))), scale(u, r * Math.sin(phi)));
    const outwards = sub(p, arcAt(turn / 2));
    for (let k = 0; k < arcPoints; k += 1) {
      out.push(add(arcAt((turn * k) / steps), outwards));
    }
  }
  out.push(points[points.length - 1] as Vec3);
  return out;
}

/** The point `distance` back from the end of `points`, and the index of the segment it lies on. */
function pointBackFromEnd(
  points: readonly Vec3[],
  distance: number,
): { at: Vec3; segment: number } {
  let remaining = distance;
  for (let i = points.length - 1; i > 0; i -= 1) {
    const from = points[i] as Vec3;
    const to = points[i - 1] as Vec3;
    const l = length(sub(to, from));
    if (remaining <= l || i === 1) {
      const share = l > 0 ? Math.min(1, remaining / l) : 0;
      return { at: add(from, scale(sub(to, from), share)), segment: i - 1 };
    }
    remaining -= l;
  }
  return { at: points[0] as Vec3, segment: 0 };
}

/**
 * Two more points near the end of the line, the whipping's edge (`whipM + edgeM` from the end)
 * and its start (`whipM` from the end), so the last `whipM` can be drawn in another colour with
 * a sharp edge. `whipFrom` is the index of the start. A line shorter than `whipM + edgeM` gets
 * them at 25 % and 50 % of its length.
 */
export function insertWhipping(
  points: readonly Vec3[],
  whipM: number,
  edgeM: number,
): { points: Vec3[]; whipFrom: number } {
  if (points.length < 2) return { points: [...points], whipFrom: points.length - 1 };
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += length(sub(points[i] as Vec3, points[i - 1] as Vec3));
  }
  const first = total < whipM + edgeM ? total * 0.75 : whipM + edgeM;
  const second = total < whipM + edgeM ? total * 0.5 : whipM;
  const q1 = pointBackFromEnd(points, first);
  const q2 = pointBackFromEnd(points, second);
  const out: Vec3[] = [];
  for (let i = 0; i < points.length; i += 1) {
    out.push(points[i] as Vec3);
    if (i === q1.segment) out.push(q1.at);
    if (i === q2.segment) out.push(q2.at);
  }
  // Q1 comes before Q2 when both fall in the segment; the later segment's point goes after it.
  const whipFrom = out.indexOf(q2.at);
  return { points: out, whipFrom };
}

/** Every rope as drawn: rounded corners, and the whipping points on each tail. */
export function smoothDrawings(
  drawings: readonly RopeDrawing[],
  data: BoatData = boat,
): DrawnRope[] {
  const bend = data.visual.ropeBend;
  return drawings.map((drawing) => ({
    id: drawing.id,
    state: drawing.state,
    strands: drawing.strands.map((strand) => {
      const rounded = roundCorners(
        strand.points,
        bend.radiusM,
        bend.arcPoints,
        bend.maxShareOfSegment,
      );
      if (!strand.tailEnd) return { points: rounded, feed: strand.feed, whipFrom: null };
      const whipped = insertWhipping(rounded, bend.whipLengthM, bend.whipEdgeM);
      return { points: whipped.points, feed: strand.feed, whipFrom: whipped.whipFrom };
    }),
  }));
}

const X_AXIS: Vec3 = [1, 0, 0];
const Y_AXIS: Vec3 = [0, 1, 0];

function firstNormal(t: Vec3): Vec3 {
  return normalize(cross(t, Math.abs(dot(t, Y_AXIS)) > 0.9 ? X_AXIS : Y_AXIS));
}

/** Steady tube frames along a line (parallel transport): a tangent and a normal at each point. */
export function transportFrames(points: readonly Vec3[]): { tangent: Vec3; normal: Vec3 }[] {
  const frames: { tangent: Vec3; normal: Vec3 }[] = [];
  const last = points.length - 1;
  for (let i = 0; i <= last; i += 1) {
    let tangent: Vec3 = X_AXIS;
    if (last > 0) {
      const from = points[Math.max(0, i - 1)] as Vec3;
      const to = points[Math.min(last, i + 1)] as Vec3;
      const d = sub(to, from);
      tangent = length(d) < 1e-9 ? (frames[i - 1]?.tangent ?? X_AXIS) : normalize(d);
    }
    let normal: Vec3;
    const previous = frames[i - 1];
    if (!previous) {
      normal = firstNormal(tangent);
    } else {
      const m = sub(previous.normal, scale(tangent, dot(tangent, previous.normal)));
      normal = length(m) < 1e-6 ? firstNormal(tangent) : normalize(m);
    }
    frames.push({ tangent, normal });
  }
  return frames;
}
