import { boat, type BoatData } from './boat';
import { halfBeamAt, sheerAt } from './hullShape';
import { add, normalize, scale, sub, vec3, type Vec3 } from './vec3';

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

export type GennakerCommand = 'next' | 'back' | 'rig' | 'stow'; // M106 adds 'gybe'

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
): GennakerSetup {
  switch (command) {
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
export function gennakerDrawing(setup: GennakerSetup, data: BoatData = boat): GennakerDrawing {
  const g = data.sails.gennaker;
  const stage = setup.stage;
  if (stage <= 0) {
    return { bag: false, tackLine: null, sheets: null, halyard: null, sock: null, sockLine: null };
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
    };
  }
  const along = normalize(sub(head, tack));
  return {
    bag: false,
    tackLine: [fitting, tack],
    sheets: sheetsFrom(clew0, []),
    halyard: [masthead, head],
    sock: { from: tack, to: head },
    sockLine: [add(tack, scale(along, g.sock.lineFromTackM)), vec3(g.sock.lineEnd)],
  };
}

/**
 * The rigging stage a Learn entry's part needs to be on the boat: the tack line from 1, the sheets
 * and their blocks from 2, the sock and its line at 4; the bag only while it is not yet hoisted
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
      return 4;
    case 'part_gennaker_bag':
      return stage >= 1 && stage <= 3 ? stage : 3;
    default:
      return null;
  }
}
