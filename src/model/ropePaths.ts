import { boat, type BoatData } from './boat';
import type { RopeState } from './boomSolver';
import { mainFurlLengths } from './mainFurl';
import { availableSheetLength, deckBlocks, mainsheetBlocks, mainsheetPaidOut } from './mainsheet';
import {
  toppingLiftLimit,
  toppingLiftPaidOut,
  vangLimit,
  vangPaidOut,
  vangStrutLength,
} from './pitchLimits';
import { boomLocalToWorld, type BoomPose } from './rigGeometry';
import type { RigState } from './sim';
import { add, distance, length, scale, sub, vec3, type Vec3 } from './vec3';

/**
 * Where the M2 ropes run, as polylines in boat coordinates (PHASE1_SPEC 8.7). Pure maths, so
 * the renderer only copies points into buffers.
 *
 * Each rope is drawn as one or more strands, from the working end towards the clutch. Only the
 * working segment of a rope can sag; the lead to the clutch is straight. Every strand of a rope
 * always has the same number of points, so the renderer can reuse its buffers.
 */

export type M2RopeId =
  'rope_mainsheet' | 'rope_vang' | 'rope_topping_lift' | 'rope_outhaul' | 'rope_main_furling_line';

export interface RopeStrand {
  points: Vec3[];
  /**
   * Metres of rope that have gone out through the clutch end of this strand since fully hauled.
   * The renderer slides the rope's stripe pattern by it, so a hauled rope visibly moves.
   */
  feed: number;
}

export interface RopeDrawing {
  id: M2RopeId;
  state: RopeState;
  strands: RopeStrand[];
}

/** Direction the middle of a rope sags: gravity, at right angles to the rope. */
function sagDirection(a: Vec3, b: Vec3): Vec3 {
  const chord = sub(b, a);
  const d = length(chord);
  if (d < 1e-9) return [0, -1, 0];
  const c = scale(chord, 1 / d);
  // Gravity minus its part along the rope; straight down for a level rope.
  const across: Vec3 = sub([0, -1, 0], scale(c, -c[1]));
  const size = length(across);
  // A vertical rope has no "down" across it: let it fall aft.
  return size > 1e-6 ? scale(across, 1 / size) : [-1, 0, 0];
}

/**
 * Points of a rope hanging between a and b with `slack` metres of spare rope: a parabola with
 * mid-sag f = sqrt(3 · d · s / 8), capped at `visual.ropeMaxSagM` (PHASE1_SPEC 8.7). The sag
 * points down, at right angles to the rope: the same as straight down for a level rope, and
 * still visible on a steep one (a mainsheet part is almost vertical). Nothing hangs below
 * `floorY` (the deck under it).
 */
export function sagCurve(
  a: Vec3,
  b: Vec3,
  slack: number,
  segments: number,
  data: BoatData = boat,
  floorY = -Infinity,
): Vec3[] {
  const d = distance(a, b);
  const sag = Math.min(data.visual.ropeMaxSagM, Math.sqrt((3 * d * Math.max(0, slack)) / 8));
  const direction = sagDirection(a, b);
  const points: Vec3[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const p = add(add(a, scale(sub(b, a), t)), scale(direction, 4 * sag * t * (1 - t)));
    const floor = Math.min(floorY, a[1], b[1]);
    points.push([p[0], Math.max(p[1], floor), p[2]]);
  }
  return points;
}

type BankId = 'clutch_bank_a' | 'clutch_bank_b';

/** Where a rope enters its clutch: the front face of the bank, slot 1 most to port. */
function clutchPoint(bankId: BankId, slot: number, data: BoatData): Vec3 {
  const bank = data.cockpitHardware.clutchBanks.find((b) => b.id === bankId);
  if (!bank) throw new Error(`Clutch bank ${bankId} is missing from hanse508.json.`);
  const size = data.modelDetail.clutchBank;
  const slots = bank.clutches.length;
  const baseY = Math.max(bank.y, data.deck.cockpit.coamingTopY);
  return [
    bank.x + size.length / 2,
    baseY + size.height / 2,
    bank.z + ((slot - (slots + 1) / 2) * size.width) / slots,
  ];
}

/** A line-lead waypoint on one side (+1 starboard, −1 port), spread out by clutch slot. */
function leadPoint(point: readonly number[], side: 1 | -1, slot: number, data: BoatData): Vec3 {
  const p = vec3(point);
  return [p[0], p[1], side * p[2] + (slot - 3) * data.rig.lineLead.spacing];
}

/** From the mast foot aft along the coachroof to a clutch (straight segments). */
function leadToClutch(bankId: BankId, slot: number, data: BoatData): Vec3[] {
  const side = bankId === 'clutch_bank_a' ? 1 : -1;
  const lead = data.rig.lineLead;
  return [
    leadPoint(lead.mastFootTurn, side, slot, data),
    leadPoint(lead.coachroofAft, side, slot, data),
    leadPoint(lead.coamingFront, side, slot, data),
    clutchPoint(bankId, slot, data),
  ];
}

/** The pose the rig is drawn in (the smoothed boom). */
export function drawnPose(rig: RigState): BoomPose {
  return { thetaDeg: rig.theta.value, psiDeg: rig.psi.value };
}

export function ropeDrawings(rig: RigState, data: BoatData = boat): RopeDrawing[] {
  const pose = drawnPose(rig);
  const segments = data.visual.ropeSagSegments;
  const radius = data.visual.ropeRenderRadius;
  const boomTop = data.modelDetail.boomSection.height / 2 + radius;
  const blockRadius = data.modelDetail.block.radius;
  const boomBottom = -data.modelDetail.boomSection.height / 2 - blockRadius;
  const solution = rig.solution;
  const local = (p: Vec3) => boomLocalToWorld(p, pose, data);
  const lead = data.rig.lineLead;
  const mastExit = (side: 1 | -1, slot: number) => leadPoint(lead.mastExit, side, slot, data);

  // Mainsheet: two parts from each deck block up to the three boom blocks. Each tail runs
  // forward to the mast-foot organiser (manual lead plan), then aft to its clutch.
  const [deckPort, deckStarboard] = deckBlocks(data);
  const spacing = data.modelDetail.mainsheetBoomBlockSpacing;
  const boomBlock = (k: number) =>
    local([-(data.rig.mainsheet.boomDistance + k * spacing), boomBottom, 0]);
  const sheetUsed =
    distance(local([-data.rig.mainsheet.boomDistance, 0, 0]), deckPort) +
    distance(local([-data.rig.mainsheet.boomDistance, 0, 0]), deckStarboard);
  const sheetSpare =
    solution.mainsheet.state === 'fighting'
      ? 0
      : Math.max(0, availableSheetLength(rig.applied.mainsheet, data) - sheetUsed);
  // L counts one part per side; the rope's spare, partsPerSide · (L_avail − L), is shared by
  // the 2 · partsPerSide parts, so each part has (L_avail − L) / 2.
  const perPart = sheetSpare / 2;
  const sheetOut = mainsheetPaidOut(rig.applied.mainsheet, data) / 2;
  const blocks = mainsheetBlocks(data);
  const sheetPart = (k: number, deck: Vec3): RopeStrand => ({
    points: sagCurve(boomBlock(k), deck, perPart, segments, data, deck[1]),
    feed: 0,
  });
  const mainsheet: RopeDrawing = {
    id: 'rope_mainsheet',
    state: solution.mainsheet.state,
    strands: [
      ...blocks.port.map((k) => sheetPart(k, deckPort)),
      ...blocks.starboard.map((k) => sheetPart(k, deckStarboard)),
      {
        points: [deckPort, ...leadToClutch('clutch_bank_b', 4, data)],
        feed: sheetOut,
      },
      {
        points: [deckStarboard, ...leadToClutch('clutch_bank_a', 1, data)],
        feed: sheetOut,
      },
    ],
  };

  // Vang: the tackle runs alongside the rigid strut, then down to the mast foot and aft.
  const offset = data.modelDetail.vangTackleOffset;
  const vangTop = local([-data.rig.vang.boomDistance, 0, offset]);
  const theta = (pose.thetaDeg * Math.PI) / 180;
  const vangBottom = add(vec3(data.rig.vang.mastPoint), [
    offset * Math.sin(theta),
    0,
    offset * Math.cos(theta),
  ]);
  const vangSpare =
    solution.vang.state === 'fighting'
      ? 0
      : Math.max(
          0,
          vangStrutLength(vangLimit(rig.applied.vang, data), data) -
            vangStrutLength(pose.psiDeg, data),
        );
  const vang: RopeDrawing = {
    id: 'rope_vang',
    state: solution.vang.state,
    strands: [
      {
        points: sagCurve(vangTop, vangBottom, vangSpare, segments, data, data.rig.mast.footY),
        feed: 0,
      },
      {
        points: [vangBottom, ...leadToClutch('clutch_bank_b', 5, data)],
        feed: vangPaidOut(rig.applied.vang, data),
      },
    ],
  };

  // Topping lift: boom end up to the masthead, inside the mast, out at its foot and aft.
  const liftEnd = local([-data.rig.toppingLift.boomDistance, boomTop, 0]);
  const liftExit = vec3(data.rig.toppingLift.mastExit);
  const liftAvailable = distance(
    liftExit,
    boomLocalToWorld(
      [-data.rig.toppingLift.boomDistance, 0, 0],
      { thetaDeg: pose.thetaDeg, psiDeg: toppingLiftLimit(rig.applied.toppingLift, data) },
      data,
    ),
  );
  const liftSpare =
    solution.toppingLift.state === 'fighting'
      ? 0
      : Math.max(0, liftAvailable - distance(liftExit, liftEnd));
  const toppingLift: RopeDrawing = {
    id: 'rope_topping_lift',
    state: solution.toppingLift.state,
    strands: [
      {
        points: sagCurve(liftEnd, liftExit, liftSpare, segments, data, data.rig.mast.footY),
        feed: 0,
      },
      {
        points: [mastExit(-1, 2), ...leadToClutch('clutch_bank_b', 2, data)],
        feed: toppingLiftPaidOut(rig.applied.toppingLift, data),
      },
    ],
  };

  // Main furling: the clew, the outhaul and both tails of the furling line.
  const furl = mainFurlLengths(rig.applied.mainFurl, data);
  const part = data.modelDetail.outhaulPartSpacing / 2;
  const outhaul: RopeDrawing = {
    id: 'rope_outhaul',
    state: 'taut',
    strands: [
      {
        points: [
          local([-furl.clewDistance, boomTop, part]),
          local([-data.rig.outhaul.boomBlockDistance, boomTop, part]),
          local([-data.rig.outhaul.boomBlockDistance, boomTop, -part]),
          local([0, boomTop, -part]),
          mastExit(-1, 3),
          ...leadToClutch('clutch_bank_b', 3, data),
        ],
        feed: furl.outhaulPaidOut,
      },
    ],
  };

  const gearbox = vec3(data.rig.mainFurlingGearbox.position);
  const box = data.modelDetail.mainFurlingGearbox;
  const drum = (z: number): Vec3 => [
    gearbox[0] - box.foreAft / 2,
    gearbox[1] - box.height / 2,
    gearbox[2] + z,
  ];
  const furlingLine: RopeDrawing = {
    id: 'rope_main_furling_line',
    state: 'taut',
    strands: [
      {
        points: [drum(-box.athwart / 4), ...leadToClutch('clutch_bank_a', 2, data)],
        feed: furl.inTailPaidOut,
      },
      {
        points: [drum(box.athwart / 4), ...leadToClutch('clutch_bank_a', 3, data)],
        feed: furl.outTailPaidOut,
      },
    ],
  };

  return [mainsheet, vang, toppingLift, outhaul, furlingLine];
}
