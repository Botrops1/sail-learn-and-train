import { boat, type BoatData } from './boat';
import { DEG, knToMps, mpsToKn } from './angles';

export interface ApparentWind {
  awsKn: number;
  /** Relative to the bow, (−180, 180], + = from starboard. */
  awaDeg: number;
}

/**
 * The wind the moving boat feels (PHASE2_SPEC 6.3; PT-20): the true wind plus the headwind of
 * the boat's own speed. `twaDeg` is the true wind angle to the bow, + = from starboard.
 */
export function apparentWind(
  twsKn: number,
  twaDeg: number,
  speedMps: number,
  data: BoatData = boat,
): ApparentWind {
  const tws = knToMps(twsKn, data);
  const ax = tws * Math.cos(twaDeg * DEG) + speedMps;
  const az = tws * Math.sin(twaDeg * DEG);
  const awsKn = mpsToKn(Math.hypot(ax, az), data);
  if (awsKn < 1e-6) return { awsKn, awaDeg: twaDeg };
  return { awsKn, awaDeg: Math.atan2(az, ax) / DEG };
}
