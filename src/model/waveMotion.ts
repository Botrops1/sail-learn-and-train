import { DEG, interpTable, lagTowards, wrap180 } from './angles';
import { boat, type BoatData } from './boat';
import { boatToMap, modulo } from './mapFrame';
import { ceHeights } from './sailForces';
import { elevation, significantHeightM, type WaveTrain } from './waves';

/**
 * How the boat follows the water (PHASE3_SPEC 6.3): the phases of the wave trains at the boat,
 * and heave, pitch and roll that follow the surface sampled along the waterline and across the
 * beam, with a lag. Pure.
 */
export interface WaveMotion {
  /** Phase of each train at the boat's position, radians in [0, 2π); one per `waves.trains` row. */
  phases: number[];
  heaveM: number;
  heaveRateMps: number;
  pitchDeg: number;
  pitchRateDegS: number;
  rollDeg: number;
  rollRateDegS: number;
}

export function initialWaveMotion(data: BoatData = boat): WaveMotion {
  return {
    phases: data.waves.trains.map((row) => row.phaseRad),
    heaveM: 0,
    heaveRateMps: 0,
    pitchDeg: 0,
    pitchRateDegS: 0,
    rollDeg: 0,
    rollRateDegS: 0,
  };
}

/** Heave, pitch and roll the water asks for now (before the hull's lag). */
export function waveTargets(
  trains: readonly WaveTrain[],
  phases: readonly number[],
  headingDeg: number,
  data: BoatData = boat,
): { heaveM: number; pitchDeg: number; rollDeg: number } {
  if (trains.length === 0) return { heaveM: 0, pitchDeg: 0, rollDeg: 0 };
  const r = data.physics.waveResponse;
  const lwl = data.dimensions.lwl;
  const xC = (data.hull.waterline.fwdX + data.hull.waterline.aftX) / 2;
  const zS = r.rollSampleBeamFraction * data.dimensions.beam;
  const at = (x: number, z: number) => elevation(trains, phases, ...boatToMap(x, z, headingDeg));

  let sum = 0;
  let moment = 0;
  let spread = 0;
  for (const fraction of r.sampleFractions) {
    const x = xC + fraction * lwl;
    const eta = at(x, 0);
    sum += eta;
    moment += (x - xC) * eta;
    spread += (x - xC) * (x - xC);
  }
  const heaveM = r.heaveFollow * (sum / r.sampleFractions.length);
  const slope = spread > 0 ? moment / spread : 0;
  const pitchDeg = (r.pitchFollow * Math.atan(slope)) / DEG;
  const etaStarboard = at(xC, zS);
  const etaPort = at(xC, -zS);
  const rollDeg = (-r.rollFollow * Math.atan((etaStarboard - etaPort) / (2 * zS))) / DEG;
  return { heaveM, pitchDeg, rollDeg };
}

/**
 * Advances the wave motion by `h` seconds (one substep). The phases advance by the encounter
 * frequency: `k·(d·v) − ω`, with the boat's map velocity `v`, so the waves stay fixed on the map
 * while she sails through them.
 */
export function stepWaveMotion(
  wm: WaveMotion,
  trains: readonly WaveTrain[],
  speedMps: number,
  headingDeg: number,
  h: number,
  data: BoatData = boat,
): WaveMotion {
  if (h === 0) return wm;
  const settled =
    wm.heaveM === 0 &&
    wm.pitchDeg === 0 &&
    wm.rollDeg === 0 &&
    wm.heaveRateMps === 0 &&
    wm.pitchRateDegS === 0 &&
    wm.rollRateDegS === 0;
  if (trains.length === 0 && settled) return wm;

  let phases = wm.phases;
  if (trains.length > 0) {
    const vEast = speedMps * Math.sin(headingDeg * DEG);
    const vNorth = speedMps * Math.cos(headingDeg * DEG);
    phases = wm.phases.map((phase, i) => {
      const t = trains[i];
      if (!t) return phase;
      return modulo(
        phase + (t.k * (t.dirEast * vEast + t.dirNorth * vNorth) - t.omega) * h,
        2 * Math.PI,
      );
    });
  }
  const target = waveTargets(trains, phases, headingDeg, data);
  const r = data.physics.waveResponse;
  const heaveM = lagTowards(wm.heaveM, target.heaveM, h, r.heaveLagS);
  const pitchDeg = lagTowards(wm.pitchDeg, target.pitchDeg, h, r.pitchLagS);
  const rollDeg = lagTowards(wm.rollDeg, target.rollDeg, h, r.rollLagS);
  return {
    phases,
    heaveM,
    heaveRateMps: (heaveM - wm.heaveM) / h,
    pitchDeg,
    pitchRateDegS: (pitchDeg - wm.pitchDeg) / h,
    rollDeg,
    rollRateDegS: (rollDeg - wm.rollDeg) / h,
  };
}

const mainCeHeights = new WeakMap<BoatData, number>();

/** The mainsail's centre-of-effort height, computed once per data object. */
function mainCeHeightM(data: BoatData): number {
  let h = mainCeHeights.get(data);
  if (h === undefined) {
    h = ceHeights(data).main;
    mainCeHeights.set(data, h);
  }
  return h;
}

/**
 * How fast the sails move through the air because she pitches and rolls (m/s, boat frame;
 * PHASE3_SPEC 7.3). Only the wave roll moves the rig sideways, not the heel's own rate.
 */
export function rigMotion(
  wm: WaveMotion,
  data: BoatData = boat,
): { forwardMps: number; sideMps: number } {
  const h = mainCeHeightM(data);
  // Bow coming up: the rig swings aft. Rolling to starboard rail down: the rig swings to starboard.
  return { forwardMps: -wm.pitchRateDegS * DEG * h, sideMps: wm.rollRateDegS * DEG * h };
}

/** How far the main wave train comes from relative to the bow, 0 = from ahead, [0, 180]. */
function relativeWaveDeg(trains: readonly WaveTrain[], headingDeg: number): number {
  const main = trains[0];
  return main ? Math.abs(wrap180(main.fromDeg - headingDeg)) : 0;
}

/** The wave's push on the steering, as degrees of extra rudder (+ = turns her to starboard). */
export function waveYawDeg(
  wm: WaveMotion,
  trains: readonly WaveTrain[],
  headingDeg: number,
  data: BoatData = boat,
): number {
  if (trains.length === 0) return 0;
  const f = data.physics.waveFeedback;
  const rel = relativeWaveDeg(trains, headingDeg);
  return f.yawDegPerDegRoll * wm.rollDeg * interpTable(f.yawFactorByRelDeg, rel);
}

/** Extra resistance from the waves, N (≥ 0). */
export function addedResistanceN(
  speedMps: number,
  headingDeg: number,
  trains: readonly WaveTrain[],
  data: BoatData = boat,
): number {
  if (trains.length === 0 || speedMps <= 0) return 0;
  const f = data.physics.waveFeedback;
  const c = data.physics.constants;
  const rel = relativeWaveDeg(trains, headingDeg);
  return (
    f.addedResistanceCoefficient *
    c.waterDensityKgM3 *
    c.gravityMps2 *
    significantHeightM(trains) *
    data.dimensions.beam ** 2 *
    interpTable(f.addedResistanceByRelDeg, rel) *
    Math.min(1, speedMps / f.addedResistanceFullSpeedMps)
  );
}
