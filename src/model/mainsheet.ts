import { boat, type BoatData } from './boat';
import type { BoomPose } from './rigGeometry';
import type { Vec3 } from './vec3';

/**
 * German mainsheet geometry (PHASE1_SPEC 8.2). One rope from a deck block on each side up to
 * the boom: L(θ, ψ) = |B − D_port| + |B − D_stbd|, with B the boom attachment point.
 */

export function deckBlocks(data: BoatData = boat): [Vec3, Vec3] {
  const d = data.rig.mainsheet.deckBlocks;
  return [
    [d.x, d.y, -d.halfZ],
    [d.x, d.y, d.halfZ],
  ];
}

/**
 * Geometric sheet length L(θ, ψ) in metres. Written out without vector helpers: the boom
 * solver calls it thousands of times per frame.
 */
export function sheetLength(pose: BoomPose, data: BoatData = boat): number {
  const theta = (pose.thetaDeg * Math.PI) / 180;
  const psi = (pose.psiDeg * Math.PI) / 180;
  const r = data.rig.mainsheet.boomDistance;
  const g = data.rig.boom.gooseneck;
  const d = data.rig.mainsheet.deckBlocks;
  const dx = (g[0] ?? 0) - r * Math.cos(psi) * Math.cos(theta) - d.x;
  const dy = (g[1] ?? 0) + r * Math.sin(psi) - d.y;
  const z = (g[2] ?? 0) + r * Math.cos(psi) * Math.sin(theta);
  const across = dx * dx + dy * dy;
  return Math.sqrt(across + (z + d.halfZ) ** 2) + Math.sqrt(across + (z - d.halfZ) ** 2);
}

export interface SheetRange {
  /** Boom on the centreline at its lowest: L(0, ψ_lowest). */
  min: number;
  /** Full swing with the vang eased: L(maxSwing, vangEasedDeg). */
  max: number;
}

const ranges = new WeakMap<BoatData, SheetRange>();

/** L_min and L_max (PHASE1_SPEC 8.2), computed once per boat. */
export function sheetRange(data: BoatData = boat): SheetRange {
  const cached = ranges.get(data);
  if (cached) return cached;
  const pitch = data.rig.boom.pitch;
  const lowest = Math.min(pitch.toppingLiftEasedDeg, pitch.vangHauledDeg);
  const range = {
    min: sheetLength({ thetaDeg: 0, psiDeg: lowest }, data),
    max: sheetLength({ thetaDeg: data.rig.boom.maxSwingDeg, psiDeg: pitch.vangEasedDeg }, data),
  };
  ranges.set(data, range);
  return range;
}

/** L_avail for the control value (0 = hauled in, 100 = eased). */
export function availableSheetLength(easedPct: number, data: BoatData = boat): number {
  const { min, max } = sheetRange(data);
  return min + (easedPct / 100) * (max - min);
}

/** Rope paid out at the clutches from fully hauled: partsPerSide · (L_avail − L_min). */
export function mainsheetPaidOut(easedPct: number, data: BoatData = boat): number {
  const { min } = sheetRange(data);
  return data.rig.mainsheet.partsPerSide * (availableSheetLength(easedPct, data) - min);
}

/** Bisection steps: 30 halvings of 80° is under a millionth of a degree. */
const BISECTION_STEPS = 30;

/**
 * θ_max(ψ): the largest swing (degrees, ≥ 0) with L(θ, ψ) ≤ available, found by bisection
 * (L grows with |θ|). Returns null if even the centred boom needs more rope than available.
 */
export function maxSwingFor(
  available: number,
  psiDeg: number,
  data: BoatData = boat,
): number | null {
  if (sheetLength({ thetaDeg: 0, psiDeg }, data) > available) return null;
  const limit = data.rig.boom.maxSwingDeg;
  if (sheetLength({ thetaDeg: limit, psiDeg }, data) <= available) return limit;
  let lo = 0;
  let hi = limit;
  for (let i = 0; i < BISECTION_STEPS; i += 1) {
    const mid = (lo + hi) / 2;
    if (sheetLength({ thetaDeg: mid, psiDeg }, data) <= available) lo = mid;
    else hi = mid;
  }
  return lo;
}
