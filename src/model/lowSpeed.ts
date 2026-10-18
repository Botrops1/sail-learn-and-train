import { apparentWind } from './apparentWind';
import { DEG } from './angles';
import { boat as hanse508, type BoatData } from './boat';
import { boatMassKg } from './hullResistance';
import { boatToMap, mapToBoat } from './mapFrame';
import type { BoatState } from './motion';

/**
 * Slow-speed handling (PHASE7_SPEC 6): below about two knots the keel stops gripping, so the
 * boat slides sideways, turns on the spot when pushed, the wind blows her bow off, and the
 * propeller walks and washes. Also the hook (`ExternalForces`) through which later forces
 * (thrusters, lines, anchor, contact) act on the boat. Pure.
 *
 * Boat frame: x forward, z to starboard. A force (fx, fz) at (x, z) gives
 * `momentNm = (x − cgX)·fz − z·fx` about the turning point, + = turns her to starboard.
 */
export interface ExternalForces {
  /** Along the bow, N, + ahead. */
  surgeN: number;
  /** Sideways, N, + to starboard. */
  sideN: number;
  /** About the turning point (`lowSpeed.cgX`), N·m, + turns her to starboard. */
  momentNm: number;
}

export const NO_FORCES: ExternalForces = { surgeN: 0, sideN: 0, momentNm: 0 };

/** The force (fx, fz), boat frame, applied at boat point (x, z). */
export function forceAt(
  xM: number,
  zM: number,
  fxN: number,
  fzN: number,
  data: BoatData = hanse508,
): ExternalForces {
  return {
    surgeN: fxN,
    sideN: fzN,
    momentNm: (xM - data.physics.lowSpeed.cgX) * fzN - zM * fxN,
  };
}

/** Sums the three components; `addForces()` is zero. */
export function addForces(...parts: ExternalForces[]): ExternalForces {
  let surgeN = 0;
  let sideN = 0;
  let momentNm = 0;
  for (const part of parts) {
    surgeN += part.surgeN;
    sideN += part.sideN;
    momentNm += part.momentNm;
  }
  return { surgeN, sideN, momentNm };
}

/** Map position (east, north) of a boat point. */
export function pointToMap(boat: BoatState, xM: number, zM: number): [east: number, north: number] {
  const [east, north] = boatToMap(xM, zM, boat.headingDeg);
  return [boat.eastM + east, boat.northM + north];
}

/** Map velocity (m/s, east and north) of a boat point, from surge, sway and yaw rate. */
export function pointVelocity(
  boat: BoatState,
  xM: number,
  zM: number,
  data: BoatData = hanse508,
): [east: number, north: number] {
  const r = boat.yawRateDegS * DEG;
  const vx = boat.speedMps - r * zM;
  const vz = boat.swayMps + r * (xM - data.physics.lowSpeed.cgX);
  return boatToMap(vx, vz, boat.headingDeg);
}

/** A vector (a force or velocity given in east / north) in the boat frame. */
export function vectorToBoat(
  eastN: number,
  northN: number,
  headingDeg: number,
): [fx: number, fz: number] {
  return mapToBoat(eastN, northN, headingDeg);
}

/** Mass pushed sideways, kg: the boat and the water that goes with her. */
export function swayMassKg(data: BoatData = hanse508): number {
  return boatMassKg(data) * (1 + data.physics.lowSpeed.swayAddedMassFraction);
}

/** Inertia about the turning point, kg·m². */
export function yawInertiaKgM2(data: BoatData = hanse508): number {
  const ls = data.physics.lowSpeed;
  return boatMassKg(data) * ls.radiusOfGyrationM ** 2 * (1 + ls.yawAddedInertiaFraction);
}

/** The quadratic yaw drag of the hull turning on the spot, N·m per (rad/s)²: ½·ρw·Cd·(A / lwl)·lwl⁴ / 32. */
export function yawQuadDragNm(data: BoatData = hanse508): number {
  const ls = data.physics.lowSpeed;
  const lwl = data.dimensions.lwl;
  return (
    (0.5 *
      data.physics.constants.waterDensityKgM3 *
      ls.lateralDragCoefficient *
      (ls.lateralAreaM2 / lwl) *
      lwl ** 4) /
    32
  );
}

/** How much the rudder and hull grip at this speed (0 … 1): min(1, |u| / the full-grip speed). */
export function steerShare(speedMps: number, data: BoatData = hanse508): number {
  const ls = data.physics.lowSpeed;
  const full = speedMps >= 0 ? ls.steerFullSpeedMps : ls.steerFullSpeedAsternMps;
  return Math.min(1, Math.abs(speedMps) / full);
}

/**
 * The low-speed forces of the hull itself (wind on the hull and rig, prop walk, prop wash),
 * boat frame (PHASE7_SPEC 6.3). `engineThrustN` is + ahead; `rudderDeg` + to starboard.
 */
export function hullLowSpeedForces(
  speedMps: number,
  swayMps: number,
  twsKn: number,
  twaDeg: number,
  engineThrustN: number,
  rudderDeg: number,
  data: BoatData = hanse508,
): ExternalForces {
  const ls = data.physics.lowSpeed;
  const { airDensityKgM3, knotMps } = data.physics.constants;
  const u = speedMps;
  const hw = apparentWind(twsKn, twaDeg, u, data, swayMps);
  const q = 0.5 * airDensityKgM3 * (hw.awsKn * knotMps) ** 2;
  const fadeW = Math.max(0, 1 - Math.abs(u) / ls.windageFadeSpeedMps);
  // Wind from starboard (awa > 0) pushes her to port.
  const windN =
    -q * ls.windageSideAreaM2 * ls.windageSideDragCoefficient * Math.sin(hw.awaDeg * DEG) * fadeW;
  const arm = ls.windageArmM + ls.windageArmSwingM * Math.cos(hw.awaDeg * DEG);

  const xp = data.hull.saildrive.x;
  const walkN =
    engineThrustN < 0
      ? -ls.propWalkSide *
        ls.propWalkFraction *
        Math.abs(engineThrustN) *
        Math.max(0, 1 - Math.abs(u) / ls.propWalkFadeSpeedMps)
      : 0;

  const xr = data.hull.rudder.stockX;
  const washN =
    engineThrustN > 0
      ? -ls.propWashFraction *
        engineThrustN *
        Math.sin(rudderDeg * DEG) *
        Math.max(0, 1 - Math.abs(u) / ls.propWashFadeSpeedMps)
      : 0;

  return {
    surgeN: 0,
    sideN: windN + walkN + washN,
    momentNm: arm * windN + (xp - ls.cgX) * walkN + (xr - ls.cgX) * washN,
  };
}
