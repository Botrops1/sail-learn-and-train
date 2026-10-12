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
