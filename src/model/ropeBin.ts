import { boat, type BoatData } from './boat';
import { DECK_EPS } from './deckVolumes';
import { sheerAt } from './hullShape';
import type { Vec3 } from './vec3';

/**
 * The rope tail box behind a winch (M5, redrawn in M34, owner on PR #81): a solid block as wide
 * as the coaming under the winch, from the deck up to the coaming top, from `ropeBin.gap` behind
 * the coaming's end to the transom. Starboard is `+1`, port `-1`.
 */
export interface RopeBinBox {
  side: 1 | -1;
  /** Front (towards the bow) and aft faces. */
  frontX: number;
  aftX: number;
  /** The inboard and outboard faces, as signed z. */
  innerZ: number;
  outerZ: number;
  /** The box's centre in plan. */
  centre: { x: number; z: number };
  /** Top of the box (flush with the coaming top). */
  topY: number;
  /** Where the coaming ends: the gap lies between this and `frontX`. */
  bodyEndX: number;
}

export function ropeBinBox(side: 1 | -1, data: BoatData = boat): RopeBinBox {
  const box = data.cockpitHardware.ropeBins.boxes.find((b) => Math.sign(b.z) === side);
  if (!box) throw new Error('No rope tail box on this side in hanse508.json.');
  const size = data.modelDetail.ropeBin;
  const innerZ = box.z - (side * size.width) / 2;
  const frontX = box.x + size.length / 2;
  return {
    side,
    frontX,
    aftX: box.x - size.length / 2,
    innerZ,
    outerZ: box.z + (side * size.width) / 2,
    centre: { x: box.x, z: box.z },
    topY: data.deck.cockpit.coamingTopY,
    bodyEndX: frontX + size.gap,
  };
}

/** The lane's z beside the winch on its inboard side: lane 0 is closest to the drum. */
export function tailLaneZ(side: 1 | -1, lane: number, data: BoatData = boat): number {
  const winch = data.cockpitHardware.winches.find(
    (w) => Math.sign(w.z) === side && (!('present' in w) || w.present !== false),
  );
  if (!winch) throw new Error('No winch on this side in hanse508.json.');
  const size = data.modelDetail.ropeBin;
  return (
    winch.z -
    side *
      (data.modelDetail.winch.diameter / 2 +
        data.visual.ropeRenderRadius +
        size.passClearance +
        lane * size.laneSpacing)
  );
}

/** The deck at the bottom of the gap, where a line runs to the box's entry. */
export function gapFloorY(x: number, data: BoatData = boat): number {
  return sheerAt(x, data) + DECK_EPS;
}

/**
 * M34: a rope held in the hand (no turns on the winch) ends in a flat spiral on top of the box.
 * The spiral starts at its inboard point, travelling aft, so the rope that crosses the gap
 * joins it smoothly, and winds inwards (turning outboard) to the centre. The rope lies on the
 * box top at its drawn radius.
 */
export function inHandCoil(side: 1 | -1, data: BoatData = boat): Vec3[] {
  const coil = data.modelDetail.ropeBin.inHandCoil;
  const box = ropeBinBox(side, data);
  const y = box.topY + data.visual.ropeRenderRadius + DECK_EPS;
  const steps = Math.round(coil.turns * coil.pointsPerTurn);
  const total = 2 * Math.PI * coil.turns;
  const points: Vec3[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const theta = (total * i) / steps;
    const r = coil.outerRadius - ((coil.outerRadius - coil.innerRadius) * theta) / total;
    const phi = -Math.PI / 2 + theta;
    // `aft` and `outboard` are distances from the box centre.
    const aft = r * Math.cos(phi);
    const outboard = r * Math.sin(phi);
    points.push([box.centre.x - aft, y, box.centre.z + side * outboard]);
  }
  return points;
}

/**
 * The dark entry in the box's front face where the lines go in: the span of the lanes (lane 0
 * beside the drum to the last clutch's lane) plus a margin, as signed z, and its bottom and top
 * height (just above the deck at the foot of the gap).
 */
export function ropeBinEntry(
  side: 1 | -1,
  data: BoatData = boat,
): { innerZ: number; outerZ: number; bottomY: number; topY: number } {
  const box = ropeBinBox(side, data);
  const { entry } = data.modelDetail.ropeBin;
  const lanes = Math.max(...data.cockpitHardware.clutchBanks.map((bank) => bank.clutches.length));
  const bottomY = gapFloorY(box.frontX, data);
  return {
    innerZ: tailLaneZ(side, lanes, data) - side * entry.margin,
    outerZ: tailLaneZ(side, 0, data) + side * entry.margin,
    bottomY,
    topY: bottomY + entry.height,
  };
}
