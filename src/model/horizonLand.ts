import { DEG } from './angles';

/** The distant land's two rings: the far one is paler and higher, the near one darker and lower. */
export type HorizonLayer = 'far' | 'near';
export const HORIZON_LAYERS: readonly HorizonLayer[] = ['far', 'near'];

export interface HorizonRidge {
  name: string;
  layer: HorizonLayer;
  fromDeg: number;
  toDeg: number;
  rippleDeg: number;
  /** [bearingDeg, heightDeg], bearings rising, inside (fromDeg, toDeg). */
  peaks: readonly (readonly [number, number])[];
}

export interface HorizonLandData {
  ridges: readonly HorizonRidge[];
}

/** Height in degrees of one ridge at an unwrapped bearing; 0 outside the open interval (fromDeg, toDeg). */
export function ridgeHeightDeg(ridge: HorizonRidge, bearingDeg: number): number {
  const b = bearingDeg;
  if (b <= ridge.fromDeg || b >= ridge.toDeg) return 0;
  const points: (readonly [number, number])[] = [
    [ridge.fromDeg, 0],
    ...ridge.peaks,
    [ridge.toDeg, 0],
  ];
  let lin = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const [b0, h0] = points[i] as readonly [number, number];
    const [b1, h1] = points[i + 1] as readonly [number, number];
    if (b >= b0 && b <= b1) {
      lin = b1 === b0 ? h0 : h0 + ((h1 - h0) * (b - b0)) / (b1 - b0);
      break;
    }
  }
  const ripple =
    ridge.rippleDeg === 0
      ? 0
      : ridge.rippleDeg *
        (0.6 * Math.sin(23 * b * DEG) + 0.4 * Math.sin(61 * b * DEG)) *
        Math.min(1, lin / ridge.rippleDeg);
  return Math.max(0, lin + ripple);
}

/** The outline of one layer: element i is the height at bearing i · stepDeg, for i = 0 … 360 / stepDeg − 1. */
export function horizonProfile(
  ridges: readonly HorizonRidge[],
  layer: HorizonLayer,
  stepDeg = 1,
): number[] {
  if (!(stepDeg > 0) || 360 % stepDeg !== 0) {
    throw new Error(`horizonProfile: stepDeg ${stepDeg} must be positive and divide 360`);
  }
  const mine = ridges.filter((r) => r.layer === layer);
  const n = 360 / stepDeg;
  const out: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const b = i * stepDeg;
    let h = 0;
    for (const r of mine) {
      for (const x of [b, b + 360, b - 360]) h = Math.max(h, ridgeHeightDeg(r, x));
    }
    out.push(h);
  }
  return out;
}
