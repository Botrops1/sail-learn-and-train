/**
 * The Training dinghy (PHASE_DINGHY_SPEC 5, 7, 8): its types and starting state (M113) and what
 * makes it sail differently (M114): the sailor's weight, the hull's own righting moment, the
 * centreboard's grip and the outhaul's power. Pure; read through `boat.dinghy`, so none of it
 * runs on the Hanse 508.
 */
import { boat, type BoatData } from './boat';
import { DEG, interpTable } from './angles';
import type { RigState } from './sim';

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
  cockpit: { fwdX: number; aftX: number; halfWidth: number; floorY: number };
  sideDeckWidthM: number;
  /** M114: the sailor's weight (the mass is `physics.mass.payloadKg`). */
  crew: { armM: Record<Sit, number>; armNote: string; defaultSit: Sit };
  /** M114: the hull's own righting moment (Nm) against the heel (degrees). */
  rightingNmByHeelDeg: number[][];
  rightingNote: string;
  board: { defaultPct: number; wettedM2: number; liftUpNPerMps2: number; note: string };
  outhaul: { defaultPct: number; powerAtTight: number; note: string };
  /** M114: seconds of heel towards the sailor beyond this many degrees raise the alert. */
  windwardHeelAlertDeg: number;
  /** M114: and for this many seconds before the alert shows. */
  windwardHeelAfterS: number;
  /** M115: where the sailor's hips and feet are for each Sit on the starboard side, and the whole-body lean outboard (degrees). */
  seats: Record<
    Sit,
    { hip: [number, number, number]; feet: [number, number, number]; leanDeg: number }
  >;
  /** M115: offsets from the hip (forward, up, across) of the hand on the tiller extension and the one on the mainsheet. */
  sailorHands: { aft: [number, number, number]; fwd: [number, number, number] };
  /** M115: the sailor's front points across the boat, turned this many degrees towards the bow. */
  faceTurnDeg: number;
  /** M115: seconds the sailor takes to cross the boat in a tack or gybe (drawing only). */
  crossS: number;
  /** M115: the Sailor view's eye above the hip, how far it looks down, and how far to leeward. */
  sailorEye: { aboveHipM: number; lookDownDeg: number; lookToLeewardDeg: number };
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

/** What the learner can do in the Balance section (M114); percentages are clamped to 0…100 by the store. */
export type DinghyCommand =
  { kind: 'sit'; sit: Sit } | { kind: 'board'; pct: number } | { kind: 'outhaul'; pct: number };

/** The dinghy block of a boat; throws on the Hanse (these functions run only on the dinghy). */
function dinghyOf(data: BoatData): DinghyData {
  if (!data.dinghy) throw new Error('The dinghy model needs the dinghy boat data.');
  return data.dinghy;
}

const G = (data: BoatData) => data.physics.constants.gravityMps2;

/** The sailor's weight about the centreline, signed like heelDeg (Nm). */
export function crewMomentNm(
  heelDeg: number,
  sit: Sit,
  side: 1 | -1,
  data: BoatData = boat,
): number {
  const d = dinghyOf(data);
  return side * data.physics.mass.payloadKg * G(data) * d.crew.armM[sit] * Math.cos(heelDeg * DEG);
}

/** The hull's own righting moment, signed like heelDeg (Nm). */
export function dinghyRightingNm(heelDeg: number, data: BoatData = boat): number {
  const d = dinghyOf(data);
  const angle = Math.min(Math.abs(heelDeg), data.physics.heel.maxHeelDeg);
  return Math.sign(heelDeg) * interpTable(d.rightingNmByHeelDeg, angle);
}

/** Sideways grip of hull and board (N per (m/s ahead · m/s sideways)). */
export function boardLift(boardPct: number, data: BoatData = boat): number {
  const d = dinghyOf(data);
  const up = d.board.liftUpNPerMps2;
  return up + (data.physics.lowSpeed.keelLiftNPerMps2 - up) * (boardPct / 100);
}

/** Share of the mainsail's force the outhaul leaves (0..1). */
export function outhaulPower(outhaulPct: number, data: BoatData = boat): number {
  const d = dinghyOf(data);
  return d.outhaul.powerAtTight + (1 - d.outhaul.powerAtTight) * (outhaulPct / 100);
}

/** Extra wetted surface the centreboard adds (m²). */
export function boardWettedM2(boardPct: number, data: BoatData = boat): number {
  return dinghyOf(data).board.wettedM2 * (boardPct / 100);
}

/** The sailor sits opposite the boom (PT-80). */
export function nextSailorSide(boomSide: 1 | -1): 1 | -1 {
  return boomSide === 1 ? -1 : 1;
}

/** M114: the sailor takes the side opposite the boom (he moves across at once; M115 draws the walk). */
export function stepDinghy(state: DinghyState, rig: Pick<RigState, 'solution'>): DinghyState {
  const side = nextSailorSide(rig.solution.side);
  return side === state.sailorSide ? state : { ...state, sailorSide: side };
}

/** The state a fresh dinghy starts in (also what the Hanse carries, unused): the boat's own defaults. */
export function initialDinghy(
  data: BoatData = boat,
  rig?: Pick<RigState, 'solution'>,
): DinghyState {
  const d = data.dinghy;
  return {
    sit: d ? d.crew.defaultSit : 'in',
    boardPct: d ? d.board.defaultPct : 100,
    outhaulPct: d ? d.outhaul.defaultPct : 50,
    sailorSide: rig ? nextSailorSide(rig.solution.side) : 1,
  };
}

/**
 * PT-75: the tiller is drawn on the opposite side to the rudder's back edge, so its angle is
 * the negative of the rudder's (+ = the boat turns to starboard = the tiller to port).
 */
export function tillerAngleDeg(rudderDeg: number): number {
  return -rudderDeg;
}
