import { boat, type BoatData } from './boat';
import { DEG, interpTable } from './angles';

/**
 * Hull resistance (PHASE2_SPEC 6.3): friction (ITTC-style line), wave-making against the Froude
 * number (the "hull speed" wall, PT-36), a small linear term, induced drag from the keel's side
 * force, and the rudder. All parts are ≥ 0; the caller applies them against the motion.
 */
export interface Resistance {
  totalN: number;
  frictionN: number;
  residuaryN: number;
  linearN: number;
  inducedN: number;
  heelN: number;
  rudderN: number;
}

/** The boat's mass used for the resistance: light craft plus payload (kg). */
export function boatMassKg(data: BoatData = boat): number {
  return data.dimensions.massesKg.lightCraftStandardKeel + data.physics.mass.payloadKg;
}

export function hullResistance(
  speedMps: number,
  sideForceN: number,
  heelDeg: number,
  rudderDeg: number,
  data: BoatData = boat,
): Resistance {
  const p = data.physics;
  const { waterDensityKgM3: rho, gravityMps2: g, waterViscosityM2s: nu } = p.constants;
  const lwl = data.dimensions.lwl;
  const v = Math.abs(speedMps);
  const hull = p.hull;

  const re = Math.max(1e5, (v * hull.frictionLengthFraction * lwl) / nu);
  const cf = 0.075 / (Math.log10(re) - 2) ** 2;
  const frictionN = 0.5 * rho * v * v * hull.wettedSurfaceM2 * cf * (1 + hull.formFactor);

  const froude = v / Math.sqrt(g * lwl);
  const residuaryN = interpTable(hull.residuaryPerWeightByFroude, froude) * boatMassKg(data) * g;

  const linearN = hull.linearDragNPerMps * v;

  const vi = hull.inducedMinSpeedMps;
  const inducedN =
    speedMps > 0
      ? ((sideForceN * sideForceN) /
          (0.5 * rho * Math.max(v, vi) ** 2 * Math.PI * hull.effectiveDraftM ** 2)) *
        Math.min(1, v / vi)
      : 0;

  // Heel adds resistance from M8 on (physics.heel); upright in M6.
  void heelDeg;
  const heelN = 0;
  const rudderN =
    0.5 *
    rho *
    v *
    v *
    hull.rudderAreaM2 *
    hull.rudderDragCoefficient *
    Math.sin(rudderDeg * DEG) ** 2;

  const totalN =
    speedMps < 0
      ? hull.asternResistanceFactor * (frictionN + residuaryN + linearN) + rudderN
      : frictionN + residuaryN + linearN + inducedN + heelN + rudderN;
  return { totalN, frictionN, residuaryN, linearN, inducedN, heelN, rudderN };
}
