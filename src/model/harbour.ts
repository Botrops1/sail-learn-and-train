import type { BoatState } from './motion';

/**
 * Harbour gear (M33, PHASE6_SPEC 4.2): what is hung or set out for a marina. Phase 6 has the
 * fenders only; Phase 7 adds the windlass and the lines next to them.
 */
export interface HarbourState {
  /** The fenders hang over the side (true) or are in the locker (false). In the link as `fd=1`. */
  fendersOut: boolean;
}

export const DEFAULT_HARBOUR: Readonly<HarbourState> = { fendersOut: false };

/** True when the "Bring the fenders in before you sail" hint shows: fenders out and Sailing. */
export function fenderHintShown(harbour: HarbourState, boatMode: BoatState['mode']): boolean {
  return harbour.fendersOut && boatMode === 'sailing';
}
