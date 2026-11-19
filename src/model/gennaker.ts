import { DEG, smoothstep } from './angles';
import { boat, type BoatData } from './boat';
import { halfBeamAt, sheerAt } from './hullShape';
import { add, length, normalize, scale, sub, vec3, type Vec3 } from './vec3';

/**
 * The gennaker (an asymmetric spinnaker, a brochure option of the Hanse 508): how it is rigged,
 * step by step, and where each line runs (PHASE_RIGGING_SPEC 7). Pure: no DOM, no three.js.
 * Boat frame: x forward, y up, z to starboard. Side: 1 = starboard, −1 = port.
 */

/** Stowed, tack line on, sheets led, halyard on, hoisted in its sock. */
export type GennakerStage = 0 | 1 | 2 | 3 | 4;

export interface GennakerSetup {
  stage: GennakerStage;
  /** The clew's side and so the working sheet's: 1 starboard, −1 port. */
  side: 1 | -1;
  /** M106: seconds left of a gybe of the gennaker (the clew crossing in front of the boat); 0 = none. */
  crossS: number;
  /** M106: |θ| (degrees) of the clew when the crossing started; 0 when none. */
  crossFromDeg: number;
}

export const STOWED: GennakerSetup = { stage: 0, side: 1, crossS: 0, crossFromDeg: 0 };

export type GennakerCommand = 'next' | 'back' | 'rig' | 'stow' | 'gybe';

/** The side away from the wind: `awaDeg > 0` (wind over starboard) → port (−1), otherwise starboard. */
export function leewardSide(awaDeg: number): 1 | -1 {
  return awaDeg > 0 ? -1 : 1;
}

/**
 * One step of the rigging. `next` and `back` move one stage (`back` from stage 4 only while the
 * sock is down); reaching stage 2 fixes the side to the leeward one; `rig` goes straight to 4;
 * `stow` returns to `STOWED`. Anything that changes nothing returns the same object.
 */
export function gennakerCommand(
  setup: GennakerSetup,
  command: GennakerCommand,
  awaDeg: number,
  sockPct: number,
  phiNowDeg = 0,
  data: BoatData = boat,
): GennakerSetup {
  switch (command) {
    case 'gybe': {
      // Only a hoisted sail with no crossing under way. A snuffed sail just swaps its sheets.
      if (setup.stage !== 4 || setup.crossS > 0) return setup;
      const side = (setup.side === 1 ? -1 : 1) as 1 | -1;
      if (sockPct <= 0) return { ...setup, side };
      return {
        ...setup,
        side,
        crossS: data.sails.gennaker.gybeCrossS,
        crossFromDeg: phiNowDeg,
      };
    }
    case 'next': {
      if (setup.stage >= 4) return setup;
      const stage = (setup.stage + 1) as GennakerStage;
      return {
        stage,
        side: stage === 2 ? leewardSide(awaDeg) : setup.side,
        crossS: 0,
        crossFromDeg: 0,
      };
    }
    case 'back': {
      if (setup.stage <= 0) return setup;
      if (setup.stage === 4 && sockPct > 0) return setup;
      return {
        stage: (setup.stage - 1) as GennakerStage,
        side: setup.side,
        crossS: 0,
        crossFromDeg: 0,
      };
    }
    case 'rig':
      if (setup.stage === 4) return setup;
      return { stage: 4, side: leewardSide(awaDeg), crossS: 0, crossFromDeg: 0 };
    case 'stow':
      return setup.stage === 0 && setup.side === 1 ? setup : STOWED;
    default:
      return setup;
  }
}

/**
 * The route of one sheet from the first deck-edge point to the winch's foot, outside the
 * stanchions and lifelines (PT-69): the `sheetVia` points along the deck edge, the block near the
 * stern, then the primary winch on that side. Nine points.
 */
export function sheetLead(side: 1 | -1, data: BoatData = boat): Vec3[] {
  const g = data.sails.gennaker;
  const via = g.sheetVia.map(([x = 0, lift = 0, out = 0]): Vec3 => [
    x,
    sheerAt(x, data) + lift,
    side * (halfBeamAt(x, data) + out),
  ]);
  const block: Vec3 = [g.sheetBlock.x, g.sheetBlock.y, side * g.sheetBlock.z];
  const winchId = side === 1 ? 'winch_primary_starboard' : 'winch_primary_port';
  const winch = data.cockpitHardware.winches.find((w) => w.id === winchId);
  if (!winch) throw new Error(`Winch ${winchId} is missing from hanse508.json.`);
  return [...via, block, [winch.x, winch.y + 0.05, winch.z]];
}

export interface GennakerDrawing {
  bag: boolean;
  tackLine: Vec3[] | null;
  sheets: { port: Vec3[]; starboard: Vec3[] } | null;
  /** The halyard from the masthead; null while it is parked (the existing parked drawing stays). */
  halyard: Vec3[] | null;
  /** The sock's tube, bottom to top (the snuffed sail inside it). */
  sock: { from: Vec3; to: Vec3 } | null;
  sockLine: Vec3[] | null;
  /**
   * M106: the side of the working (taut) sheet while the sail is set and not crossing the boat;
   * null otherwise, and both sheets hang slack.
   */
  workingSide: 1 | -1 | null;
}

/** Where the spi halyard leaves the mast while parked: the top of its run (the masthead). */
function halyardMasthead(data: BoatData): Vec3 {
  const spec = data.rig.lineLead.lines.find((line) => line.rope === 'rope_spi_halyard');
  if (!spec || !('parked' in spec) || !spec.parked) {
    throw new Error('No parked run for the gennaker halyard in hanse508.json.');
  }
  return vec3(spec.parked.masthead);
}

/** What is drawn at a rigging stage (PHASE_RIGGING_SPEC 7.3 table). */
export function gennakerDrawing(
  setup: GennakerSetup,
  sol?: GennakerSolution,
  data: BoatData = boat,
): GennakerDrawing {
  const g = data.sails.gennaker;
  const stage = setup.stage;
  if (stage <= 0) {
    return {
      bag: false,
      tackLine: null,
      sheets: null,
      halyard: null,
      sock: null,
      sockLine: null,
      workingSide: null,
    };
  }
  const mouth = vec3(g.bag.mouth);
  const fitting = vec3(g.tackFitting);
  const tack = vec3(g.tack);
  const head = vec3(g.head);
  const masthead = halyardMasthead(data);
  const clew0 = add(tack, vec3(g.snuffedClewOffset));
  // From the bag the sheets go round ahead of the forestay (`sheetBowVia`) before they run aft
  // outside everything (PT-69); from the hoisted clew, which is already ahead of it, they do not.
  const bowVia = vec3(g.sheetBowVia);
  const sheetsFrom = (from: Vec3, via: readonly Vec3[]) => ({
    port: [from, ...via, ...sheetLead(-1, data)],
    starboard: [from, ...via, ...sheetLead(1, data)],
  });
  if (stage === 1) {
    return {
      bag: true,
      tackLine: [fitting, mouth],
      sheets: null,
      halyard: null,
      sock: null,
      sockLine: null,
      workingSide: null,
    };
  }
  if (stage === 2) {
    return {
      bag: true,
      tackLine: [fitting, mouth],
      sheets: sheetsFrom(mouth, [bowVia]),
      halyard: null,
      sock: null,
      sockLine: null,
      workingSide: null,
    };
  }
  if (stage === 3) {
    return {
      bag: true,
      tackLine: [fitting, mouth],
      sheets: sheetsFrom(mouth, [bowVia]),
      halyard: [masthead, mouth],
      sock: null,
      sockLine: null,
      workingSide: null,
    };
  }
  const along = normalize(sub(head, tack));
  const luffM = length(sub(head, tack));
  // The sock's mouth rides up the luff with the sock line (0 = down at the tack).
  const sockUp = sol ? sol.sockUp : 0;
  const mouthM = sockUp * (luffM - g.look.sockBunchM);
  const mouth4 = add(tack, scale(along, mouthM));
  const set = sol !== undefined && sol.sockUp > 0.05;
  const working = set && setup.crossS <= 0 ? setup.side : null;
  const sheetsAt = set ? sheetsFrom(gennakerClew(sol.thetaDeg, data), []) : sheetsFrom(clew0, []);
  let sheets = sheetsAt;
  if (set && working !== null) {
    // The working sheet runs straight from the clew to its block and on to the winch; the lazy one
    // goes round the front of the forestay and back along the windward side (PT-69).
    const clew = gennakerClew(sol.thetaDeg, data);
    const block: Vec3 = [g.sheetBlock.x, g.sheetBlock.y, working * g.sheetBlock.z];
    const lead = (side: 1 | -1) => sheetLead(side, data);
    const workingPoints = [clew, block, lead(working).at(-1) as Vec3];
    const lazyVia = g.lazySheetVia.map(([x = 0, y = 0, out = 0]): Vec3 => [x, y, -working * out]);
    const lazyPoints = [clew, ...lazyVia, ...lead(-working as 1 | -1).slice(1)];
    sheets =
      working === 1
        ? { starboard: workingPoints, port: lazyPoints }
        : { port: workingPoints, starboard: lazyPoints };
  }
  return {
    bag: false,
    tackLine: [fitting, tack],
    sheets,
    halyard: [masthead, head],
    sock: { from: mouth4, to: head },
    sockLine: [add(mouth4, scale(along, g.sock.lineFromTackM)), vec3(g.sock.lineEnd)],
    workingSide: working,
  };
}

/**
 * The rigging stage a Learn entry's part needs to be on the boat: the tack line from 1, the sheets
 * and their blocks from 2, the sock and its line, and the sail itself (with its sock up), at 4; the bag only while it is not yet hoisted
 * (1 to 3). Null for a part that is not the gennaker's.
 */
export function stageToShow(partId: string, stage: GennakerStage): GennakerStage | null {
  switch (partId) {
    case 'rope_gennaker_tack_line':
      return stage >= 1 ? stage : 1;
    case 'rope_gennaker_sheet_port':
    case 'rope_gennaker_sheet_starboard':
    case 'fit_gennaker_block':
      return stage >= 2 ? stage : 2;
    case 'rope_gennaker_sock_line':
    case 'part_gennaker_sock':
    case 'sail_gennaker':
      return 4;
    case 'part_gennaker_bag':
      return stage >= 1 && stage <= 3 ? stage : 3;
    default:
      return null;
  }
}

/** The set sail's clew for the signed foot angle θ (degrees; + = to starboard, 0 = dead astern of the tack). */
export function gennakerClew(thetaDeg: number, data: BoatData = boat): Vec3 {
  const g = data.sails.gennaker;
  const t = thetaDeg * DEG;
  const e = g.footElevationDeg * DEG;
  const tack = vec3(g.tack);
  return [
    tack[0] - g.footM * Math.cos(t) * Math.cos(e),
    tack[1] + g.footM * Math.sin(e),
    tack[2] + g.footM * Math.sin(t) * Math.cos(e),
  ];
}

export type GennakerTrimState =
  'stowed' | 'snuffed' | 'crossing' | 'backed' | 'blanketed' | 'luffing' | 'good' | 'stalled';

export interface GennakerSolution {
  /** Stage 4 and the sock up at all. */
  set: boolean;
  /** 0…1, the applied sock control / 100; 0 below stage 4. */
  sockUp: number;
  /** Signed foot angle: + = clew to starboard; |θ| = φ off the centreline, measured from astern. */
  thetaDeg: number;
  /** |θ|, outside a crossing too. */
  phiDeg: number;
  /** Angle of attack, 0…90. */
  aoaDeg: number;
  /** `factorAtFull`…1: how much of the wind the main leaves it. */
  blanket: number;
  backed: boolean;
  /** 0…1. */
  fill: number;
  side: 1 | -1;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

function wrap180(deg: number): number {
  let a = deg % 360;
  if (a > 180) a -= 360;
  if (a <= -180) a += 360;
  return a;
}

/**
 * The gennaker for a rigging setup, the two control values (% eased, % up) and the apparent wind
 * (PHASE_RIGGING_SPEC 8.3). Pure; no NaN for any input, `awaDeg` 0 included.
 */
export function solveGennaker(
  setup: GennakerSetup,
  sheetPct: number,
  sockPct: number,
  awaDeg: number,
  data: BoatData = boat,
): GennakerSolution {
  const g = data.sails.gennaker;
  const side = setup.side;
  if (setup.stage < 4) {
    return {
      set: false,
      sockUp: 0,
      thetaDeg: side * g.sheet.phiHauledDeg,
      phiDeg: 0,
      aoaDeg: 0,
      blanket: 1,
      backed: false,
      fill: 0,
      side,
    };
  }
  const b = Math.abs(awaDeg);
  const sockUp = clamp(sockPct / 100, 0, 1);
  const set = sockUp > 0;
  const { phiHauledDeg, phiEasedDeg } = g.sheet;
  const phiT = phiHauledDeg + ((phiEasedDeg - phiHauledDeg) * clamp(sheetPct, 0, 100)) / 100;
  // The wind cannot push the clew past where the sail lies along it.
  const phi = Math.min(phiT, Math.max(phiHauledDeg, b - g.aero.entryDeg));
  const aoaDeg = clamp(b - phi - g.aero.entryDeg, 0, 90);
  const blanket =
    1 - (1 - g.blanket.factorAtFull) * smoothstep(g.blanket.fromAwaDeg, g.blanket.fullAwaDeg, b);
  const crossing = setup.crossS > 0;
  const backed =
    set && !crossing && side === -leewardSide(awaDeg) && b > 0 && b < g.backedBelowAwaDeg;
  const fill =
    set && !backed && !crossing
      ? smoothstep(g.aero.fillStartAoaDeg, g.aero.fillFullAoaDeg, aoaDeg) * blanket
      : 0;
  let thetaDeg = side * phi;
  if (crossing) {
    // From where the clew was on the old side, round the front of the boat, to the new side
    // fully eased (the outside gybe).
    const u = clamp(1 - setup.crossS / g.gybeCrossS, 0, 1);
    const phi0 = setup.crossFromDeg;
    thetaDeg = wrap180(-side * (phi0 + (360 - phi0 - phiEasedDeg) * u));
  }
  return {
    set,
    sockUp,
    thetaDeg,
    phiDeg: Math.abs(thetaDeg),
    aoaDeg,
    blanket,
    backed,
    fill,
    side,
  };
}

/** What the sail is doing, first match (PHASE_RIGGING_SPEC 8.3). */
export function gennakerTrimState(
  setup: GennakerSetup,
  sol: GennakerSolution,
  data: BoatData = boat,
): GennakerTrimState {
  if (setup.stage < 4) return 'stowed';
  if (sol.sockUp <= 0.05) return 'snuffed';
  if (setup.crossS > 0) return 'crossing';
  if (sol.backed) return 'backed';
  if (sol.blanket < 0.5) return 'blanketed';
  if (sol.fill < 0.5) return 'luffing';
  if (sol.aoaDeg > data.sails.gennaker.aero.stallAboveAoaDeg) return 'stalled';
  return 'good';
}

/** Counts a gybe's crossing down. Nothing else moves. */
export function stepGennaker(setup: GennakerSetup, dt: number): GennakerSetup {
  if (setup.crossS <= 0) return setup;
  const crossS = Math.max(0, setup.crossS - dt);
  return { ...setup, crossS, crossFromDeg: crossS === 0 ? 0 : setup.crossFromDeg };
}
