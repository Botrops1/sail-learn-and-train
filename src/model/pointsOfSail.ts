import { wrap180 } from './angles';
import { boat, type BoatData } from './boat';

/**
 * Points of sail (PHASE2_SPEC 7.3): the named ranges of the angle between the bow and the true
 * wind. The band edges are teaching choices (`physics.display.pointsOfSail`). Pure.
 */
export type PointOfSail = BoatData['physics']['display']['pointsOfSail'][number];

/** The point of sail for a true wind angle: by |TWA|; an edge belongs to the higher band. */
export function pointOfSail(twaDeg: number, data: BoatData = boat): PointOfSail {
  const bands = data.physics.display.pointsOfSail;
  const angle = Math.abs(wrap180(twaDeg));
  let found: PointOfSail | undefined;
  for (const band of bands) {
    if (angle >= band.fromDeg) found = band;
  }
  // The table starts at 0, so something always matches; the first band is the safe fallback.
  return found ?? (bands[0] as PointOfSail);
}

export interface PointOfSailArc {
  id: PointOfSail['id'];
  /** Compass bearings, degrees in [0, 360); the arc runs clockwise from `fromBearingDeg` to `toBearingDeg`. */
  fromBearingDeg: number;
  toBearingDeg: number;
  /** 'starboard': the side where the wind is over starboard (twaDeg > 0). */
  side: 'starboard' | 'port';
  current: boolean;
}

const wrap360 = (x: number): number => ((x % 360) + 360) % 360;

/**
 * The points of sail as compass arcs round the boat (PHASE_FEEDBACK_SPEC 9.2), for the mini-map:
 * two arcs per band, starboard first. A boat heading `windFrom - TWA` has the wind over
 * starboard when the TWA is positive, so the starboard arc of a band lies anticlockwise of the
 * wind. Exactly one arc is `current`. Pure.
 */
export function pointOfSailArcs(
  windFromDeg: number,
  twaDeg: number,
  data: BoatData = boat,
): PointOfSailArc[] {
  const currentId = pointOfSail(twaDeg, data).id;
  const currentSide = twaDeg >= 0 ? 'starboard' : 'port';
  const arcs: PointOfSailArc[] = [];
  for (const band of data.physics.display.pointsOfSail) {
    arcs.push({
      id: band.id,
      fromBearingDeg: wrap360(windFromDeg - band.toDeg),
      toBearingDeg: wrap360(windFromDeg - band.fromDeg),
      side: 'starboard',
      current: band.id === currentId && currentSide === 'starboard',
    });
    arcs.push({
      id: band.id,
      fromBearingDeg: wrap360(windFromDeg + band.fromDeg),
      toBearingDeg: wrap360(windFromDeg + band.toDeg),
      side: 'port',
      current: band.id === currentId && currentSide === 'port',
    });
  }
  return arcs;
}
