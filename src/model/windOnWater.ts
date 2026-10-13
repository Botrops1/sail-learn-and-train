import { DEG, interpTable, knToMps, smoothstep } from './angles';
import { area, type AreaData } from './area';
import { boat, type BoatData } from './boat';
import type { Controls } from './controls';
import type { BoatState } from './motion';
import { windAt, type WindModeState } from './windModes';

/**
 * What the wind does to the water you can see (PHASE3_SPEC 8, M16): white horses, the dark patch a
 * gust makes before it arrives, and where the practice buoys are. Pure: the renderer reads these.
 */

/** Fraction of the sea surface that breaks white, 0 … 1 (PT-44). */
export function whitecapCoverage(twsKn: number, data: BoatData = boat): number {
  return interpTable(data.waves.whitecaps.coverageByWindKn, twsKn);
}

/**
 * How white a point is, 0 … 1: the surface height as a fraction of the trains' amplitudes above
 * `hi = 1 − crestEdgeFactor·√coverage`, soft over `crestEdgeWidth` below it. 0 when the coverage or
 * the amplitude sum is 0.
 */
export function whitecapAmount(
  eta: number,
  amplitudeSum: number,
  coverage: number,
  data: BoatData = boat,
): number {
  if (coverage <= 0 || amplitudeSum <= 0) return 0;
  const { crestEdgeFactor, crestEdgeWidth } = data.waves.whitecaps;
  const hi = 1 - crestEdgeFactor * Math.sqrt(coverage);
  return smoothstep(hi - crestEdgeWidth, hi, eta / amplitudeSum);
}

/** How far upwind a map offset lies (m): + = towards where the wind comes from. */
export function upwindDistanceM(dEastM: number, dNorthM: number, windDirDeg: number): number {
  return dEastM * Math.sin(windDirDeg * DEG) + dNorthM * Math.cos(windDirDeg * DEG);
}

export interface GustProfile {
  fromM: number;
  stepM: number;
  values: number[];
}

/**
 * Gusty wind only: how strong the gust or lull is at each upwind distance on the water now,
 * −1 (deepest lull) … +1 (a full gust). Null for other wind modes or a mean wind under the
 * preview's minimum (PT-45). A gust travels downwind at the mean wind speed, so the water `u`
 * metres upwind shows the wind the boat will feel `u / U` seconds later.
 */
export function gustProfile(
  controls: Controls,
  windMode: WindModeState,
  timeS: number,
  data: BoatData = boat,
): GustProfile | null {
  if (windMode.mode !== 'gusty') return null;
  const preview = data.windModes.gustPreview;
  const meanMps = knToMps(controls.ctl_wind_speed, data);
  if (meanMps < preview.minWindMps) return null;
  const mean = controls.ctl_wind_speed;
  const spread = mean * (windMode.size / 100);
  const count = Math.round((preview.toM - preview.fromM) / preview.stepM);
  const values: number[] = [];
  for (let b = 0; b <= count; b += 1) {
    const u = preview.fromM + b * preview.stepM;
    const tws = windAt(controls.ctl_wind_dir, mean, windMode, timeS + u / meanMps, data).twsKn;
    values.push(Math.min(1, Math.max(-1, (tws - mean) / spread)));
  }
  return { fromM: preview.fromM, stepM: preview.stepM, values };
}

/**
 * Linear interpolation in the profile; outside `fromM … toM` it fades linearly to 0 over one
 * `stepM`, so the far water is not tinted.
 */
export function gustAt(profile: GustProfile, upwindM: number): number {
  const last = profile.values.length - 1;
  const toM = profile.fromM + last * profile.stepM;
  const first = profile.values[0] ?? 0;
  const end = profile.values[last] ?? 0;
  if (upwindM <= profile.fromM) {
    return first * Math.max(0, 1 - (profile.fromM - upwindM) / profile.stepM);
  }
  if (upwindM >= toM) return end * Math.max(0, 1 - (upwindM - toM) / profile.stepM);
  const position = (upwindM - profile.fromM) / profile.stepM;
  const index = Math.min(last - 1, Math.floor(position));
  const a = profile.values[index] ?? 0;
  const b = profile.values[index + 1] ?? 0;
  return a + (b - a) * (position - index);
}

/** Where each buoy is relative to the boat (map offset), with its id. */
export function buoyOffsets(
  boatState: Pick<BoatState, 'eastM' | 'northM'>,
  areaData: AreaData = area,
): { id: string; dEastM: number; dNorthM: number }[] {
  return areaData.marks.buoys.map((buoy) => ({
    id: buoy.id,
    dEastM: buoy.eastM - boatState.eastM,
    dNorthM: buoy.northM - boatState.northM,
  }));
}
