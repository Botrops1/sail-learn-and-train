/**
 * The Training dinghy (PHASE_DINGHY_SPEC 5, 7, 8): its types and starting state (M113) and what
 * makes it sail differently (M114): the sailor's weight, the hull's own righting moment, the
 * centreboard's grip and the outhaul's power. Pure; read through `boat.dinghy`, so none of it
 * runs on the Hanse 508.
 */
import { boat, type BoatData } from './boat';
import { DEG, interpTable, smoothstep } from './angles';
import type { BoatState } from './motion';
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
  crew: {
    armM: Record<Sit, number>;
    armNote: string;
    defaultSit: Sit;
    /** M115: the sailor's weight is out on his side only when the apparent wind is at least `fullAwaDeg` off the bow; he is in the middle (no moment) within `centredAwaDeg`. */
    tack: { centredAwaDeg: number; fullAwaDeg: number; note: string };
  };
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
  /** M116: capsize and righting. */
  capsize: {
    /** Heel (degrees, either way) at which she goes over. */
    atHeelDeg: number;
    /** Heel she lies at once over. */
    lyingHeelDeg: number;
    /** Seconds she takes to go over, to swim round the stern to the board, and to come up. */
    goingOverS: number;
    swimS: number;
    rightingS: number;
    /** The centreboard must be at least this far down to stand on it. */
    minBoardPct: number;
    /** How fast she drifts downwind while over (m/s), and the time constant her speed dies away with (s). */
    driftMps: number;
    stopTimeS: number;
    /** Where the sailor's hips and feet are in a capsize, in the heading frame (z times the side she lies on). */
    sailor: {
      inWater: [number, number, number];
      astern: [number, number, number];
      atBoard: [number, number, number];
      standHip: [number, number, number];
      standFeet: [number, number, number];
    };
  };
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
  /** M116: upright, or going over, over, the sailor swimming round to the board, or righting. */
  capsize: CapsizeState;
}

/** M116: where she is in a capsize. */
export type CapsizePhase = 'upright' | 'goingOver' | 'over' | 'swimming' | 'righting';
/** `side`: the side she lies on (1 = starboard); `t`: seconds in this phase. */
export interface CapsizeState {
  phase: CapsizePhase;
  side: 1 | -1;
  t: number;
}
export const UPRIGHT: CapsizeState = { phase: 'upright', side: 1, t: 0 };
/** What the learner does in a capsize: swim round to the board, push it down, stand on it. */
export type CapsizeCommand = 'swim' | 'boardDown' | 'stand';

/** What the learner can do in the Balance section (M114) and in a capsize (M116); percentages are clamped to 0…100 by the store. */
export type DinghyCommand =
  | { kind: 'sit'; sit: Sit }
  | { kind: 'board'; pct: number }
  | { kind: 'outhaul'; pct: number }
  | { kind: 'capsize'; command: CapsizeCommand };

/** The dinghy block of a boat; throws on the Hanse (these functions run only on the dinghy). */
function dinghyOf(data: BoatData): DinghyData {
  if (!data.dinghy) throw new Error('The dinghy model needs the dinghy boat data.');
  return data.dinghy;
}

const G = (data: BoatData) => data.physics.constants.gravityMps2;

/**
 * M115: the share of the sailor's weight that is out on his side (0…1). Head to the wind, in the
 * turn of a tack or gybe, he comes into the middle to cross the boat; with the wind further
 * round he is on his side again.
 */
export function crewOutShare(awaDeg: number, data: BoatData = boat): number {
  const { centredAwaDeg, fullAwaDeg } = dinghyOf(data).crew.tack;
  return smoothstep(centredAwaDeg, fullAwaDeg, Math.abs(awaDeg));
}

/**
 * The sailor's weight about the centreline, signed like heelDeg (Nm). With `awaDeg` (M115) it is
 * scaled by `crewOutShare`: without it the sailor is always out on his side.
 */
export function crewMomentNm(
  heelDeg: number,
  sit: Sit,
  side: 1 | -1,
  data: BoatData = boat,
  awaDeg?: number,
): number {
  const d = dinghyOf(data);
  const share = awaDeg === undefined ? 1 : crewOutShare(awaDeg, data);
  return (
    side *
    data.physics.mass.payloadKg *
    G(data) *
    d.crew.armM[sit] *
    share *
    Math.cos(heelDeg * DEG)
  );
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

/**
 * M116: one step of a capsize. Upright, a heel of `atHeelDeg` either way (from the last step)
 * sends her over; the phases then run their timers (`dt` 0 in Held still and Pause: they stand still).
 */
export function stepCapsize(
  c: CapsizeState,
  heelDeg: number,
  dt: number,
  data: BoatData = boat,
): CapsizeState {
  const k = dinghyOf(data).capsize;
  switch (c.phase) {
    case 'upright':
      return Math.abs(heelDeg) >= k.atHeelDeg
        ? { phase: 'goingOver', side: heelDeg > 0 ? 1 : -1, t: 0 }
        : c;
    case 'goingOver': {
      const t = c.t + dt;
      return t >= k.goingOverS ? { phase: 'over', side: c.side, t: 0 } : dt > 0 ? { ...c, t } : c;
    }
    case 'over':
      return c;
    case 'swimming':
      return dt > 0 ? { ...c, t: c.t + dt } : c;
    case 'righting': {
      const t = c.t + dt;
      return t >= k.rightingS ? UPRIGHT : dt > 0 ? { ...c, t } : c;
    }
  }
}

/** M116: the learner's capsize commands. A command that does not apply changes nothing. */
export function capsizeCommand(
  c: CapsizeState,
  cmd: CapsizeCommand,
  boardPct: number,
  data: BoatData = boat,
): { capsize: CapsizeState; boardPct: number } {
  const k = dinghyOf(data).capsize;
  const same = { capsize: c, boardPct };
  switch (cmd) {
    case 'swim':
      return c.phase === 'over' ? { capsize: { ...c, phase: 'swimming', t: 0 }, boardPct } : same;
    case 'boardDown':
      return c.phase === 'goingOver' || c.phase === 'over' || c.phase === 'swimming'
        ? { capsize: c, boardPct: 100 }
        : same;
    case 'stand':
      return c.phase === 'swimming' && atBoard(c, data) && boardPct >= k.minBoardPct
        ? { capsize: { ...c, phase: 'righting', t: 0 }, boardPct }
        : same;
  }
}

/** M116: the sailor has swum round to the centreboard. */
export function atBoard(c: CapsizeState, data: BoatData = boat): boolean {
  return c.phase === 'swimming' && c.t >= dinghyOf(data).capsize.swimS - 1e-9;
}

/** M116: the heel she is drawn and moved at while not upright, else null. */
export function capsizeHeelDeg(c: CapsizeState, data: BoatData = boat): number | null {
  if (c.phase === 'upright') return null;
  const k = dinghyOf(data).capsize;
  switch (c.phase) {
    case 'goingOver':
      return (
        c.side * (k.atHeelDeg + (k.lyingHeelDeg - k.atHeelDeg) * smoothstep(0, k.goingOverS, c.t))
      );
    case 'righting':
      return c.side * k.lyingHeelDeg * (1 - smoothstep(0, k.rightingS, c.t));
    default:
      return c.side * k.lyingHeelDeg;
  }
}

/** M116: the sailor's position in the heading frame (hip, forward/up/across), or null while upright. */
export function capsizeSailorHip(
  c: CapsizeState,
  data: BoatData = boat,
): [number, number, number] | null {
  if (c.phase === 'upright') return null;
  const k = dinghyOf(data).capsize;
  const s = k.sailor;
  type P = [number, number, number];
  const at = (p: P): P => [p[0], p[1], p[2] * c.side];
  if (c.phase === 'righting') return at(s.standHip);
  if (c.phase === 'swimming') {
    // Round the stern at a constant speed: inWater → astern → atBoard over `swimS`.
    const legA = Math.hypot(s.astern[0] - s.inWater[0], s.astern[2] - s.inWater[2]);
    const legB = Math.hypot(s.atBoard[0] - s.astern[0], s.atBoard[2] - s.astern[2]);
    const d = Math.min(1, c.t / k.swimS) * (legA + legB);
    const from = d <= legA ? s.inWater : s.astern;
    const to = d <= legA ? s.astern : s.atBoard;
    const f = d <= legA ? d / legA : (d - legA) / legB;
    return at([
      from[0] + (to[0] - from[0]) * f,
      from[1] + (to[1] - from[1]) * f,
      from[2] + (to[2] - from[2]) * f,
    ]);
  }
  return at(s.inWater);
}

/** M114: the sailor takes the side opposite the boom (he moves across at once; M115 draws the walk). M116: and steps the capsize from the heel of the last step. */
export function stepDinghy(
  state: DinghyState,
  rig: Pick<RigState, 'solution'>,
  boatState: Pick<BoatState, 'heelDeg'>,
  dt: number,
): DinghyState {
  const side = nextSailorSide(rig.solution.side);
  const capsize = stepCapsize(state.capsize, boatState.heelDeg, dt);
  return side === state.sailorSide && capsize === state.capsize
    ? state
    : { ...state, sailorSide: side, capsize };
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
    capsize: UPRIGHT,
  };
}

/**
 * PT-75: the tiller is drawn on the opposite side to the rudder's back edge, so its angle is
 * the negative of the rudder's (+ = the boat turns to starboard = the tiller to port).
 */
export function tillerAngleDeg(rudderDeg: number): number {
  return -rudderDeg;
}
