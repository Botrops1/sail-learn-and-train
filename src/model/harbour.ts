import type { MarinaLayoutId, TrafficId } from './marina';
import type { BoatState } from './motion';
import type { PlaceId } from './places';

/**
 * Harbour gear and place (M33, PHASE6_SPEC 4.2; M42, PHASE7_SPEC 8.3): the fenders, and where the
 * boat is (open water or the marina) with the marina's layout and traffic. M43 adds the fender
 * losses next to them; the lines and the anchor have states of their own.
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
}

export const DEFAULT_HARBOUR: Readonly<HarbourState> = {
  fendersOut: false,
  place: 'open',
  layout: 'medium',
  traffic: 'half',
};

/** True when the "Bring the fenders in before you sail" hint shows: fenders out and Sailing. */
export function fenderHintShown(harbour: HarbourState, boatMode: BoatState['mode']): boolean {
  return harbour.fendersOut && boatMode === 'sailing';
}
