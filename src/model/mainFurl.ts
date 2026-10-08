import { boat, type BoatData } from './boat';

/**
 * In-mast furling with a two-line drive (PHASE1_SPEC 8.6, PT-12). One furling line has two
 * tails on the drum: hauling the "in" tail rolls the sail into the mast, hauling the "out" tail
 * rolls it out. The outhaul pulls the clew out along the boom and works with the "out" tail.
 * The sail rolls up from its back edge, so the clew moves along the boom towards the mast.
 */
export interface MainFurlLengths {
  /** Unfurled fraction f, 0 = furled, 1 = fully out. */
  unfurled: number;
  /** Clew distance from the tack along the boom: f · footLength. */
  clewDistance: number;
  /** "In" tail: paid out from fully hauled (fully hauled = sail furled). */
  inTailPaidOut: number;
  /** "Out" tail: paid out from fully hauled (fully hauled = sail out). */
  outTailPaidOut: number;
  /** Outhaul: paid out from fully hauled (fully hauled = clew at the boom end). */
  outhaulPaidOut: number;
}

export function mainFurlLengths(unfurledPct: number, data: BoatData = boat): MainFurlLengths {
  const f = Math.min(1, Math.max(0, unfurledPct / 100));
  const travel = data.rig.mainFurlingGearbox.lineTravelM;
  const foot = data.sails.main.footLength;
  return {
    unfurled: f,
    clewDistance: f * foot,
    inTailPaidOut: f * travel,
    outTailPaidOut: (1 - f) * travel,
    outhaulPaidOut: data.rig.outhaul.purchase * (1 - f) * foot,
  };
}
