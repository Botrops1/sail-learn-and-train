import { boat, type BoatData } from './boat';
import { DEG } from './angles';
import { boatMassKg } from './hullResistance';

/**
 * Heel (PHASE2_SPEC 8.3): the boat's righting moment against the heeling moment of the sails,
 * and the roll inertia and damping that make the heel settle in a few seconds. Pure.
 */

/**
 * The righting moment (Nm) at a heel angle, signed like `heelDeg`: it pushes back towards
 * upright. Shape: RM30 · sin(1.5 φ) / sin 45°, which peaks at 60° (`physics.heel`).
 */
export function rightingMomentNm(heelDeg: number, data: BoatData = boat): number {
  const rm30Nm = data.dimensions.rightingMomentKNmAt30Deg * 1000;
  const angle = Math.min(Math.abs(heelDeg), data.physics.heel.maxHeelDeg);
  return (Math.sign(heelDeg) * (rm30Nm * Math.sin(1.5 * angle * DEG))) / Math.sin(45 * DEG);
}

/** Roll inertia including the water the hull drags with it (kg·m²). */
export function rollInertia(data: BoatData = boat): number {
  const h = data.physics.heel;
  return (
    boatMassKg(data) *
    (h.rollGyrationBeamFraction * data.dimensions.beam) ** 2 *
    (1 + h.rollAddedInertiaFraction)
  );
}

/** Roll damping (N·m·s/rad) for the damping ratio `rollDampingRatio` at small angles. */
export function rollDamping(data: BoatData = boat): number {
  const k0 = (data.dimensions.rightingMomentKNmAt30Deg * 1000 * 1.5) / Math.sin(45 * DEG);
  return 2 * data.physics.heel.rollDampingRatio * Math.sqrt(rollInertia(data) * k0);
}
