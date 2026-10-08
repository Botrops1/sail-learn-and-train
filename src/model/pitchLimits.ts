import { boat, type BoatData } from './boat';
import { boomPoint, vangStrutEnds } from './rigGeometry';
import { distance, vec3 } from './vec3';

/**
 * Vang and topping lift (PHASE1_SPEC 8.3 step 2): hard limits on the boom pitch ψ.
 * Topping lift: lower limit, toppingLiftHauledDeg (0 %) → toppingLiftEasedDeg (100 %).
 * Vang: upper limit, vangHauledDeg (0 %) → vangEasedDeg (100 %).
 */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function toppingLiftLimit(easedPct: number, data: BoatData = boat): number {
  const p = data.rig.boom.pitch;
  return lerp(p.toppingLiftHauledDeg, p.toppingLiftEasedDeg, easedPct / 100);
}

export function vangLimit(easedPct: number, data: BoatData = boat): number {
  const p = data.rig.boom.pitch;
  return lerp(p.vangHauledDeg, p.vangEasedDeg, easedPct / 100);
}

/** Length of the rigid vang strut (mast point → boom point) for a boom pitch, θ = 0. */
export function vangStrutLength(psiDeg: number, data: BoatData = boat): number {
  const [a, b] = vangStrutEnds({ thetaDeg: 0, psiDeg }, data);
  return distance(a, b);
}

/** Length of the topping lift from its mast exit to the boom end, θ = 0. */
export function toppingLiftLength(psiDeg: number, data: BoatData = boat): number {
  const lift = data.rig.toppingLift;
  return distance(vec3(lift.mastExit), boomPoint(lift.boomDistance, { thetaDeg: 0, psiDeg }, data));
}

/**
 * Vang tackle paid out at the clutch from fully hauled. Easing lets the strut extend further
 * before the tackle stops it; the tackle's purchase multiplies the rope needed.
 */
export function vangPaidOut(easedPct: number, data: BoatData = boat): number {
  const extension = vangStrutLength(vangLimit(easedPct, data), data);
  const hauled = vangStrutLength(vangLimit(0, data), data);
  return data.rig.vang.tacklePurchase * (extension - hauled);
}

/** Topping lift paid out from fully hauled: the boom end hangs lower, so the line is longer. */
export function toppingLiftPaidOut(easedPct: number, data: BoatData = boat): number {
  return (
    toppingLiftLength(toppingLiftLimit(easedPct, data), data) -
    toppingLiftLength(toppingLiftLimit(0, data), data)
  );
}
