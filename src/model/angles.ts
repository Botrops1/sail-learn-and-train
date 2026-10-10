import { boat, type BoatData } from './boat';

/** Shared angle and unit helpers (PHASE2_SPEC 3.2). Pure. */
export const DEG = Math.PI / 180;

/** Wraps to (−180, 180]. */
export function wrap180(deg: number): number {
  const a = ((((deg + 180) % 360) + 360) % 360) - 180;
  return a === -180 ? 180 : a;
}

/** Wraps to [0, 360). */
export function wrap360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Signed (−180, 180] → compass [0, 360). */
export const compassDeg = wrap360;

export function knToMps(kn: number, data: BoatData = boat): number {
  return kn * data.physics.constants.knotMps;
}

export function mpsToKn(mps: number, data: BoatData = boat): number {
  return mps / data.physics.constants.knotMps;
}

/** Piecewise-linear interpolation in a table of [x, y] rows sorted by x; clamps at both ends. */
export function interpTable(table: readonly (readonly number[])[], x: number): number {
  const first = table[0];
  const last = table[table.length - 1];
  if (!first || !last) return 0;
  if (x <= (first[0] ?? 0)) return first[1] ?? 0;
  if (x >= (last[0] ?? 0)) return last[1] ?? 0;
  for (let i = 1; i < table.length; i += 1) {
    const upper = table[i];
    const lower = table[i - 1];
    if (!upper || !lower) continue;
    const [x0 = 0, y0 = 0] = lower;
    const [x1 = 0, y1 = 0] = upper;
    if (x > x1) continue;
    return x1 === x0 ? y1 : y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return last[1] ?? 0;
}
