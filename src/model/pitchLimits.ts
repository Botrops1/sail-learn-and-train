import { boat, type BoatData } from './boat';
import { boomPoint, vangStrutEnds } from './rigGeometry';
import { capPaidOut } from './ropeLengths';
import { distance, vec3 } from './vec3';

/**
 * Vang and topping lift (PHASE1_SPEC 8.3 step 2): hard limits on the boom pitch ψ.
 * Topping lift: its own limit runs toppingLiftHauledDeg (0 %) → toppingLiftEasedDeg (100 %).
 * The rigid vang strut stops the boom at strutStopDeg, so the lower limit is the higher of the
 * two: an eased topping lift hangs slack while the strut carries the boom.
 * Vang: upper limit, vangHauledDeg (0 %) → vangEasedDeg (100 %).
 */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** How low the topping lift alone would let the boom end go (it may be below the strut stop). */
export function toppingLiftLimit(easedPct: number, data: BoatData = boat): number {
  const p = data.rig.boom.pitch;
  return lerp(p.toppingLiftHauledDeg, p.toppingLiftEasedDeg, easedPct / 100);
}

/** Lower pitch limit: max(topping-lift limit, rigid vang strut stop). */
export function lowerPitchLimit(toppingLiftPct: number, data: BoatData = boat): number {
  return Math.max(toppingLiftLimit(toppingLiftPct, data), data.rig.vang.strutStopDeg);
}

/** The lowest pitch the boom can ever have: the lower limit with the topping lift fully eased. */
export function lowestPitch(data: BoatData = boat): number {
  return lowerPitchLimit(100, data);
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
  return capPaidOut('rope_vang', data.rig.vang.tacklePurchase * (extension - hauled), data);
}

/**
 * Topping lift paid out from fully hauled: the boom end hangs lower, so the line is longer.
 * Never more than the rope's total length (as for the vang).
 */
export function toppingLiftPaidOut(easedPct: number, data: BoatData = boat): number {
  const paid =
    toppingLiftLength(toppingLiftLimit(easedPct, data), data) -
    toppingLiftLength(toppingLiftLimit(0, data), data);
  return capPaidOut('rope_topping_lift', paid, data);
}
