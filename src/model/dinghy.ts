/**
 * M113 (PHASE_DINGHY_SPEC 5, 7.1): the Training dinghy's types and its starting state. Only the
 * types, the state's defaults and the tiller's drawn angle; the sailing comes with M114.
 */

/** Where the sailor sits: on the floor, on the side deck, or leaning out under the toe straps. */
export type Sit = 'in' | 'side' | 'out';

/** The `dinghy` block of `content/boat/dinghy.json` (grown by M114, M115 and M116). */
export interface DinghyData {
  centreboard: {
    x: number;
    chordM: number;
    depthBelowHullM: number;
    thicknessM: number;
    caseTopY: number;
  };
  tiller: { pivot: [number, number, number]; lengthM: number; extensionM: number };
  toeStraps: { fromX: number; toX: number; halfZ: number; y: number };
  ratchetBlock: [number, number, number];
  sheetHand: [number, number, number];
  cockpit: { fwdX: number; aftX: number; halfWidth: number; floorY: number };
  sideDeckWidthM: number;
}

/** What the learner changes on the dinghy besides the shared controls (M114 adds the actions). */
export interface DinghyState {
  /** Where you sit. */
  sit: Sit;
  /** The centreboard: 0 = fully up, 100 = fully down. */
  boardPct: number;
  /** The outhaul: 0 = hauled tight (flat sail), 100 = eased (full sail). */
  outhaulPct: number;
  /** The side the sailor sits on: 1 = starboard, -1 = port. */
  sailorSide: 1 | -1;
}

/** The state a fresh dinghy starts in (also what the Hanse carries, unused). M114 reads the defaults from the boat's data. */
export function initialDinghy(): DinghyState {
  return { sit: 'in', boardPct: 100, outhaulPct: 50, sailorSide: 1 };
}

/**
 * PT-75: the tiller is drawn on the opposite side to the rudder's back edge, so its angle is
 * the negative of the rudder's (+ = the boat turns to starboard = the tiller to port).
 */
export function tillerAngleDeg(rudderDeg: number): number {
  return -rudderDeg;
}
