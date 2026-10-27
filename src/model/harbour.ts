import { area as adriatic, type AreaData } from './area';
import { boat as hanse508, type BoatData } from './boat';
import { pointToMap } from './lowSpeed';
import { marinaGeometry, type MarinaLayoutId, type TrafficId } from './marina';
import type { BoatState } from './motion';
import type { PlaceId } from './places';

/**
 * Harbour gear and place (M33, PHASE6_SPEC 4.2; M42, PHASE7_SPEC 8.3): the fenders, and where the
 * boat is (open water or the marina) with the marina's layout and traffic; M43: the fenders torn
 * off while sailing with them out. The lines and the anchor have states of their own.
 */
export interface HarbourState {
  /** The fenders hang over the side (true) or are in the locker (false). In the link as `fd=1`. */
  fendersOut: boolean;
  /** Where the boat was put (M42). In the link as `pl` when it is not open water. */
  place: PlaceId;
  /** The marina's berth width and fairway (M42). In the link as `ml`, only in the marina. */
  layout: MarinaLayoutId;
  /** How many other yachts lie in the marina (M42). In the link as `tr`, only in the marina. */
  traffic: TrafficId;
  /** A big arrow floats over our berth in the marina (M42, owner on PR #101). In the link as `ba=0` when off, only in a place. */
  berthArrow: boolean;
  /** Fender numbers torn off at speed (M43; 0–7 in `fenderPlaces` order, 8 the ball fender). A new array on every change. Not in the link. */
  fendersLost: readonly number[];
  /** Seconds the fenders have been out above `fenderLossSpeedMps` (M43). Not in the link. */
  fenderOverSpeedS: number;
  /** Fenders lost since she last slowed down (M43): the first loss takes longer than the next ones. Not in the link. */
  fendersLostSinceSlow: number;
}

export const DEFAULT_HARBOUR: Readonly<HarbourState> = {
  fendersOut: false,
  place: 'open',
  layout: 'medium',
  traffic: 'half',
  berthArrow: true,
  fendersLost: [],
  fenderOverSpeedS: 0,
  fendersLostSinceSlow: 0,
};

/** True when the "Bring the fenders in before you sail" hint shows: fenders out and Sailing. */
export function fenderHintShown(harbour: HarbourState, boatMode: BoatState['mode']): boolean {
  return harbour.fendersOut && boatMode === 'sailing';
}

/** M59: in the marina, fenders in the locker, going astern, our stern within 15 m of our berth's two rings: time to put the fenders out. */
export function fendersInHintShown(
  state: { harbour: HarbourState; boat: BoatState },
  data: BoatData = hanse508,
  areaData: AreaData = adriatic,
): boolean {
  const { harbour, boat } = state;
  if (harbour.place !== 'marina' || harbour.fendersOut || boat.speedMps >= -0.1) return false;
  const { west, east } = marinaGeometry(harbour.layout, harbour.traffic, areaData).ourRings;
  const [sternEast, sternNorth] = pointToMap(boat, data.hull.transomX, 0);
  const distanceM = Math.hypot(
    sternEast - (west[0] + east[0]) / 2,
    sternNorth - (west[1] + east[1]) / 2,
  );
  return distanceM <= areaData.marina.fendersHintM;
}
