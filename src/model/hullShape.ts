import { boat, type BoatData } from './boat';

/**
 * Hull shape from hanse508.json (PHASE1_SPEC 6.1): plan outline, sheer, keel line and a
 * superellipse cross-section between them. Pure maths, shared by the 3D builder and the
 * camera clamp. Boat frame: x forward, y up, z starboard.
 */

type Pairs = readonly (readonly number[])[];

/** Piecewise-linear interpolation through [x, value] pairs, clamped at both ends. */
export function interpolate(points: Pairs, x: number): number {
  const sorted = [...points].sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) return 0;
  if (x <= (first[0] ?? 0)) return first[1] ?? 0;
  if (x >= (last[0] ?? 0)) return last[1] ?? 0;
  for (let i = 1; i < sorted.length; i += 1) {
    const a = sorted[i - 1];
    const b = sorted[i];
    if (!a || !b) continue;
    const ax = a[0] ?? 0;
    const bx = b[0] ?? 0;
    if (x <= bx) {
      const u = bx > ax ? (x - ax) / (bx - ax) : 0;
      return (a[1] ?? 0) + u * ((b[1] ?? 0) - (a[1] ?? 0));
    }
  }
  return last[1] ?? 0;
}

/** Half-beam of the deck edge at station x (0 outside the hull). */
export function halfBeamAt(x: number, data: BoatData = boat): number {
  if (x > data.hull.stemX || x < data.hull.transomX) return 0;
  return interpolate(data.hull.deckEdgeHalfBeam.points, x);
}

/** Height of the deck edge (sheer) above the waterline at station x. */
export function sheerAt(x: number, data: BoatData = boat): number {
  return interpolate(data.hull.sheerHeight.points, x);
}

/**
 * Height of the canoe-body bottom on the centreline (keel line, without the keel fin).
 * A parabola on each side of the deepest point, reaching the waterline at the waterline ends
 * (plumb bow), then rising straight to the transom bottom.
 */
export function keelLineAt(x: number, data: BoatData = boat): number {
  const { fwdX, aftX, transomBottomY } = data.hull.waterline;
  const { maxDepthBelowWL: depth, deepestX } = data.hull.canoeBody;
  if (x >= fwdX) return 0;
  if (x >= deepestX) {
    const u = (x - deepestX) / (fwdX - deepestX);
    return -depth * (1 - u * u);
  }
  if (x >= aftX) {
    const u = (deepestX - x) / (deepestX - aftX);
    return -depth * (1 - u * u);
  }
  const u = (aftX - x) / (aftX - data.hull.transomX);
  return Math.min(1, u) * transomBottomY;
}

/**
 * A point on the starboard half of the hull section at station x.
 * `s` runs from 0 (keel line, on the centreline) to 1 (deck edge). Returns [y, z].
 */
export function sectionPoint(x: number, s: number, data: BoatData = boat): [number, number] {
  const n = data.modelDetail.hullSectionExponent;
  const angle = (Math.min(1, Math.max(0, s)) * Math.PI) / 2;
  const top = sheerAt(x, data);
  const bottom = Math.min(keelLineAt(x, data), top);
  const z = halfBeamAt(x, data) * Math.pow(Math.sin(angle), 2 / n);
  const y = top - (top - bottom) * Math.pow(Math.cos(angle), 2 / n);
  return [y, z];
}
