import { boat, type BoatData } from './boat';
import type { Side } from './deckVolumes';
import { halfBeamAt, sheerAt } from './hullShape';
import type { Vec3 } from './vec3';

/**
 * Where the mooring cleats and fairleads stand (M32, PHASE6_SPEC 8.2): on top of the toerail,
 * one of each station on each side. Boat frame: x forward, y up, z starboard. Data:
 * `deckFittings.cleats` and `fairleads` (the stations), `deckFittings.toerail` (the rim).
 */
export interface FittingPlace {
  /** Centre of the fitting's footprint on top of the toerail. */
  base: Vec3;
  /** Unit direction along the toerail (forward, in the x–z plane): the fitting's long axis. */
  along: Vec3;
  side: Side;
}

/** Half the distance over which the deck edge's slope is measured, metres. */
const SLOPE_STEP = 0.05;

function placesAt(stations: readonly number[], data: BoatData): FittingPlace[] {
  const { height, width } = data.deckFittings.toerail;
  return stations.flatMap((x) => {
    const slope =
      (halfBeamAt(x + SLOPE_STEP, data) - halfBeamAt(x - SLOPE_STEP, data)) / (2 * SLOPE_STEP);
    return ([1, -1] as const).map((side): FittingPlace => {
      const k = side * slope;
      const norm = Math.hypot(1, k);
      return {
        base: [x, sheerAt(x, data) + height, side * (halfBeamAt(x, data) - width / 2)],
        along: [1 / norm, 0, k / norm],
        side,
      };
    });
  });
}

/** One place per station and side, starboard first for each station, stations in data order. */
export function cleatPlaces(data: BoatData = boat): FittingPlace[] {
  return placesAt(data.deckFittings.cleats.stations, data);
}

export function fairleadPlaces(data: BoatData = boat): FittingPlace[] {
  return placesAt(data.deckFittings.fairleads.stations, data);
}
