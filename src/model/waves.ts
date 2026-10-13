import { DEG, knToMps, lagTowards, wrap180 } from './angles';
import { area, type AreaData } from './area';
import { boat, type BoatData } from './boat';

/**
 * Wind waves (PHASE3_SPEC 6.3): three wave trains sized by the wind and the fetch, and the
 * surface height they make at a point near the boat. Pure.
 */
export type SeaSetting = 'flat' | 'sheltered' | 'coastal' | 'open';

export interface SeaState {
  setting: SeaSetting;
  /** The wind the waves are made by: the true wind speed, lagged by `waves.buildTimeS`, knots. */
  windKn: number;
  /** Where the waves come from: the true wind direction, lagged the same way; signed, (−180, 180]. */
  dirDeg: number;
}

export interface SeaSize {
  heightM: number;
  periodS: number;
  wavelengthM: number;
}

export interface WaveTrain {
  amplitudeM: number;
  periodS: number;
  /** Angular frequency 2π/T (rad/s) and wave number ω²/g (rad/m). */
  omega: number;
  k: number;
  /** Compass direction the train comes from, signed (−180, 180]. */
  fromDeg: number;
  /** Unit vector of travel (towards fromDeg + 180): east and north components. */
  dirEast: number;
  dirNorth: number;
}

export function isSeaSetting(value: string, data: BoatData = boat): value is SeaSetting {
  return (data.waves.settings as readonly string[]).includes(value);
}

/** `waves.defaultSetting` as a SeaSetting (the JSON value is a plain string; falls back to 'coastal'). */
export function defaultSeaSetting(data: BoatData = boat): SeaSetting {
  const value = data.waves.defaultSetting;
  return isSeaSetting(value, data) ? value : 'coastal';
}

/** The area's fetch for a setting, km (`flat` → 0). */
export function fetchKm(setting: SeaSetting, areaData: AreaData = area): number {
  return areaData.sea.fetchKm[setting] ?? 0;
}

/** Wavelength of a deep-water wave of period `periodS`, metres. */
function wavelengthOf(periodS: number, data: BoatData): number {
  return (data.physics.constants.gravityMps2 * periodS * periodS) / (2 * Math.PI);
}

/**
 * Significant height, peak period and wavelength for a wind and a fetch (JONSWAP growth capped at
 * the fully developed sea, PHYSICS_TRUTHS PT-39).
 */
export function seaSize(windKn: number, fetchKmValue: number, data: BoatData = boat): SeaSize {
  const g = data.physics.constants.gravityMps2;
  const w = data.waves;
  const u = knToMps(windKn, data);
  if (fetchKmValue <= 0 || u < 0.1) {
    return {
      heightM: 0,
      periodS: w.minPeriodS,
      wavelengthM: wavelengthOf(w.minPeriodS, data),
    };
  }
  const x = (g * fetchKmValue * 1000) / (u * u);
  const heightM =
    Math.min(w.growth.heightCoefficient * Math.sqrt(x), w.growth.fullyDevelopedHeight) *
    ((u * u) / g);
  const periodS = Math.max(
    w.minPeriodS,
    Math.min(w.growth.periodCoefficient * Math.cbrt(x), w.growth.fullyDevelopedPeriod) * (u / g),
  );
  return { heightM, periodS, wavelengthM: wavelengthOf(periodS, data) };
}

export function waveTrains(
  sea: SeaState,
  data: BoatData = boat,
  areaData: AreaData = area,
): WaveTrain[] {
  const g = data.physics.constants.gravityMps2;
  const { heightM: hs, periodS: tp } = seaSize(sea.windKn, fetchKm(sea.setting, areaData), data);
  if (hs < data.waves.minHeightM) return [];
  const rows = data.waves.trains;
  const norm = 2 * Math.SQRT2 * Math.sqrt(rows.reduce((sum, r) => sum + r.weight * r.weight, 0));
  return rows.map((row) => {
    const periodS = tp * row.periodFactor;
    const omega = (2 * Math.PI) / periodS;
    const fromDeg = wrap180(sea.dirDeg + row.dirOffsetDeg);
    const to = (fromDeg + 180) * DEG;
    return {
      amplitudeM: (row.weight * hs) / norm,
      periodS,
      omega,
      k: (omega * omega) / g,
      fromDeg,
      dirEast: Math.sin(to),
      dirNorth: Math.cos(to),
    };
  });
}

/** The significant wave height of a set of trains: 2√2 · √(Σ a²). 0 for none. */
export function significantHeightM(trains: readonly WaveTrain[]): number {
  return 2 * Math.SQRT2 * Math.sqrt(trains.reduce((sum, t) => sum + t.amplitudeM ** 2, 0));
}

export function initialSea(setting: SeaSetting, wind: { dirDeg: number; twsKn: number }): SeaState {
  return { setting, windKn: wind.twsKn, dirDeg: wrap180(wind.dirDeg) };
}

/**
 * The waves follow the true wind with a lag of `waves.buildTimeS`: a gust barely moves them, a
 * shift or a building wind does, over minutes. `dt = 0` returns the same object.
 */
export function stepSea(
  sea: SeaState,
  wind: { dirDeg: number; twsKn: number },
  dt: number,
  data: BoatData = boat,
): SeaState {
  if (dt === 0) return sea;
  const tau = data.waves.buildTimeS;
  return {
    setting: sea.setting,
    windKn: lagTowards(sea.windKn, wind.twsKn, dt, tau),
    dirDeg: wrap180(sea.dirDeg + wrap180(wind.dirDeg - sea.dirDeg) * (1 - Math.exp(-dt / tau))),
  };
}

/** The new setting at once; the wind and direction are kept (a different place, same wind). */
export function setSeaSetting(sea: SeaState, setting: SeaSetting): SeaState {
  return sea.setting === setting ? sea : { ...sea, setting };
}

/** Surface height at a map offset (ΔE, ΔN) from the boat, with the trains' phases at the boat. */
export function elevation(
  trains: readonly WaveTrain[],
  phases: readonly number[],
  dEastM: number,
  dNorthM: number,
): number {
  let eta = 0;
  for (let i = 0; i < trains.length; i += 1) {
    const t = trains[i];
    if (!t) continue;
    eta +=
      t.amplitudeM * Math.cos((phases[i] ?? 0) + t.k * (t.dirEast * dEastM + t.dirNorth * dNorthM));
  }
  return eta;
}

/** Height and its slopes ∂η/∂E, ∂η/∂N at a map offset (for the 3D normals). */
export function elevationAndSlope(
  trains: readonly WaveTrain[],
  phases: readonly number[],
  dEastM: number,
  dNorthM: number,
): { eta: number; dEast: number; dNorth: number } {
  let eta = 0;
  let dEast = 0;
  let dNorth = 0;
  for (let i = 0; i < trains.length; i += 1) {
    const t = trains[i];
    if (!t) continue;
    const arg = (phases[i] ?? 0) + t.k * (t.dirEast * dEastM + t.dirNorth * dNorthM);
    eta += t.amplitudeM * Math.cos(arg);
    const s = t.amplitudeM * t.k * Math.sin(arg);
    dEast -= s * t.dirEast;
    dNorth -= s * t.dirNorth;
  }
  return { eta, dEast, dNorth };
}
