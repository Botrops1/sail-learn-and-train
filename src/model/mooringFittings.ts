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

export interface FenderPlace {
  /** Top of the fender (where its line is tied). */
  top: Vec3;
  /** Where the line is made fast: on top of the toerail at the same station. */
  lineEnd: Vec3;
  side: Side;
}

/** On top of the toerail at station x, on the given side (3.1: "on the toerail"). */
function toerailTop(x: number, side: Side, data: BoatData): Vec3 {
  const { height, width } = data.deckFittings.toerail;
  return [x, sheerAt(x, data) + height, side * (halfBeamAt(x, data) - width / 2)];
}

/** Eight fender places (M33): per station, starboard then port. */
export function fenderPlaces(data: BoatData = boat): FenderPlace[] {
  const f = data.deckFittings.fenders;
  return f.stations.flatMap((x) =>
    ([1, -1] as const).map((side): FenderPlace => ({
      top: [
        x,
        sheerAt(x, data) - f.topBelowSheer,
        side * (halfBeamAt(x, data) + f.diameter / 2 + f.gap),
      ],
      lineEnd: toerailTop(x, side, data),
      side,
    })),
  );
}

/** The ball fender (M33): its centre and where its line is made fast. */
export function ballFenderPlace(data: BoatData = boat): {
  centre: Vec3;
  lineEnd: Vec3;
  side: Side;
} {
  const b = data.deckFittings.ballFender;
  const side: Side = b.side === 'port' ? -1 : 1;
  const r = b.diameter / 2;
  return {
    centre: [
      b.x,
      sheerAt(b.x, data) - b.topBelowSheer - r,
      side * (halfBeamAt(b.x, data) + r + data.deckFittings.fenders.gap),
    ],
    lineEnd: toerailTop(b.x, side, data),
    side,
  };
}
