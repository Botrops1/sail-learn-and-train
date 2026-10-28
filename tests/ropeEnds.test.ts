import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import { defaultControls } from '../src/model/controls';
import { DECK_EPS } from '../src/model/deckVolumes';
import { initialRealistic, winchWraps, type RealisticState } from '../src/model/realistic';
import { gapFloorY, inHandCoil, ropeBinBox, ropeBinEntry } from '../src/model/ropeBin';
import {
  onWinchDrum,
  ropeDrawings,
  tailToBin,
  WINCH_WRAP_POINTS_PER_TURN,
} from '../src/model/ropePaths';
import { smoothDrawings } from '../src/model/ropeSmooth';
import { initialRig } from '../src/model/sim';
import type { Vec3 } from '../src/model/vec3';
import { buildRopes } from '../src/render3d/boat/ropes';
import { SCENE } from '../src/render3d/sceneConfig';

/**
 * M34 (PHASE6_SPEC 10.5, changed on PR #81 by the owner): sealed rope ends, thinner rope on the
 * winch drums, the rope tail boxes, ropes held in the hand and on a winch. Drawing only: no
 * sailing rule is tested.
 */
const rig = initialRig(defaultControls());
const DRUM = boat.modelDetail.winch.diameter / 2;
const DRUM_ROPE = boat.modelDetail.winchRope.drumRenderRadius;
const LYING = boat.deck.cockpit.coamingTopY + boat.visual.ropeRenderRadius;
const RADIAL = SCENE.ropes.radialSegmentsHigh;
const SIDES = [1, -1] as const;

function realisticWith(
  winchId: string,
  setup: { tail: string; turns: number; selfTailer: boolean },
): RealisticState {
  const state = initialRealistic();
  const current = state.winches[winchId];
  if (!current) throw new Error(winchId);
  return { ...state, winches: { ...state.winches, [winchId]: { ...current, ...setup } } };
}

const SETUPS = [
  ['winch_primary_port', ['b2', 'b3', 'b4', 'b5', 'r1']],
  ['winch_primary_starboard', ['a1', 'a2', 'a3', 'a5']],
] as const;

/** The strand of the rope on a winch that runs to the box, for one setup. */
function strandOf(winchId: string, tail: string, turns: number, selfTailer: boolean): Vec3[] {
  const wraps = winchWraps(realisticWith(winchId, { tail, turns, selfTailer }));
  const ropeId = wraps[0]?.ropeId ?? '';
  const drawing = ropeDrawings(rig, boat, wraps).find((d) => d.id === ropeId);
  // The end that lies on top of the box (the other end of a two-ended rope sits inside it).
  const strand = drawing?.strands.find(
    (s) =>
      (s.points.at(-1)?.[1] ?? 0) > boat.deck.cockpit.coamingTopY &&
      (s.points.at(-1)?.[0] ?? 0) < ropeBinBox(1).frontX,
  );
  return strand?.points ?? [];
}

const inBoxPlan = (p: Vec3, side: 1 | -1) => {
  const box = ropeBinBox(side);
  return (
    p[0] <= box.frontX &&
    p[0] >= box.aftX &&
    Math.abs(p[2]) >= Math.min(Math.abs(box.innerZ), Math.abs(box.outerZ)) &&
    Math.abs(p[2]) <= Math.max(Math.abs(box.innerZ), Math.abs(box.outerZ))
  );
};

describe('M34: the rope tail box (owner, PR #81)', () => {
  it('is as wide as the coaming, runs from 30 cm behind the coaming to the transom, flush with the coaming top', () => {
    for (const side of SIDES) {
      const box = ropeBinBox(side);
      expect(box.aftX).toBeCloseTo(boat.hull.transomX, 6);
      expect(box.frontX - box.aftX).toBeCloseTo(boat.modelDetail.ropeBin.length, 6);
      expect(Math.abs(box.outerZ - box.innerZ)).toBeCloseTo(boat.modelDetail.coamingWidth, 6);
      expect(Math.abs(box.innerZ)).toBeCloseTo(boat.deck.cockpit.wellHalfWidth, 6);
      expect(box.bodyEndX - box.frontX).toBeCloseTo(0.3, 6);
      expect(box.topY).toBe(boat.deck.cockpit.coamingTopY);
      // The coaming ends behind the winch's base (a hair of 4 cm).
      const winch = boat.cockpitHardware.winches.find((w) => Math.sign(w.z) === side);
      expect(box.bodyEndX).toBeLessThan((winch?.x ?? 0) - 1.2 * DRUM);
    }
    // The floor is flat to the transom.
    expect(boat.deck.cockpit.aftX).toBe(boat.hull.transomX);
  });

  it('the dark entry lies on the front face, over the span of the lanes, just above the deck', () => {
    for (const side of SIDES) {
      const box = ropeBinBox(side);
      const entry = ropeBinEntry(side);
      for (const z of [entry.innerZ, entry.outerZ]) {
        expect(Math.abs(z)).toBeGreaterThanOrEqual(Math.abs(box.innerZ));
        expect(Math.abs(z)).toBeLessThanOrEqual(Math.abs(box.outerZ));
      }
      expect(entry.bottomY).toBeCloseTo(gapFloorY(box.frontX), 9);
      expect(entry.topY - entry.bottomY).toBeCloseTo(boat.modelDetail.ropeBin.entry.height, 9);
    }
  });

  it('every tail not in use dives into the gap and ends inside the box, below its top, through the entry', () => {
    for (const side of SIDES) {
      const box = ropeBinBox(side);
      const entry = ropeBinEntry(side);
      for (let lane = 0; lane <= 5; lane += 1) {
        const points = tailToBin(side, lane, [-6.9, 1.6, 1.4 * side]);
        const name = `side ${side} lane ${lane}`;
        const last = points.at(-1) as Vec3;
        expect(inBoxPlan(last, side), name).toBe(true);
        expect(last[1], name).toBeLessThan(box.topY);
        // The way in: along the floor of the gap, through the entry on the front face.
        const [, , dive, inside] = points as [Vec3, Vec3, Vec3, Vec3];
        expect(dive[0], name).toBeGreaterThan(box.frontX);
        expect(dive[0], name).toBeLessThan(box.bodyEndX);
        expect(inside[0], name).toBeLessThan(box.frontX);
        expect(Math.abs(inside[2]), name).toBeGreaterThan(
          Math.min(Math.abs(entry.innerZ), Math.abs(entry.outerZ)),
        );
        expect(Math.abs(inside[2]), name).toBeLessThan(
          Math.max(Math.abs(entry.innerZ), Math.abs(entry.outerZ)),
        );
        expect(inside[1], name).toBeGreaterThan(entry.bottomY);
        expect(inside[1], name).toBeLessThan(entry.topY);
      }
    }
  });
});

describe('M34: a rope held in the hand ends in a coil on the box (owner, PR #81)', () => {
  it('the coil is a flat spiral on the box top, starting at its inboard point and winding inwards', () => {
    const coil = boat.modelDetail.ropeBin.inHandCoil;
    for (const side of SIDES) {
      const box = ropeBinBox(side);
      const points = inHandCoil(side);
      expect(points).toHaveLength(Math.round(coil.turns * coil.pointsPerTurn) + 1);
      const first = points[0] as Vec3;
      const second = points[1] as Vec3;
      expect(first[0]).toBeCloseTo(box.centre.x, 6);
      expect(first[2]).toBeCloseTo(box.centre.z - side * coil.outerRadius, 6);
      // Travelling aft to begin with.
      expect(second[0]).toBeLessThan(first[0]);
      const last = points.at(-1) as Vec3;
      expect(Math.hypot(last[0] - box.centre.x, last[2] - box.centre.z)).toBeCloseTo(
        coil.innerRadius,
        6,
      );
      for (const p of points) {
        expect(p[1]).toBeCloseTo(LYING + DECK_EPS, 9);
        expect(inBoxPlan(p, side)).toBe(true);
      }
      // Whole turns lie further apart than a rope is wide.
      const pitch = (coil.outerRadius - coil.innerRadius) / coil.turns;
      expect(pitch).toBeGreaterThanOrEqual(2 * boat.visual.ropeRenderRadius - 1e-9);
      expect(coil.outerRadius + boat.visual.ropeRenderRadius).toBeLessThan(
        boat.modelDetail.ropeBin.width / 2,
      );
    }
  });

  it('with no turns on the winch the rope runs past the drum, across the gap, and ends in that coil, for every tail', () => {
    for (const [winchId, keys] of SETUPS) {
      const side = winchId.includes('port') ? -1 : 1;
      const winch = boat.cockpitHardware.winches.find((w) => w.id === winchId);
      for (const key of keys) {
        const points = strandOf(winchId, key, 0, false);
        const name = `${key} on ${winchId}`;
        const tail = points.slice(-inHandCoil(side).length);
        expect(tail, name).toEqual(inHandCoil(side));
        for (const p of points) {
          expect(onWinchDrum(p), name).toBe(false);
          expect(Math.hypot(p[0] - (winch?.x ?? 0), p[2] - (winch?.z ?? 0)), name).toBeGreaterThan(
            DRUM * 1.2,
          );
        }
        // The rope lies on the coaming and the box: nowhere below the coaming top.
        const past = points.filter((p) => p[0] < (winch?.x ?? 0) + 1);
        for (const p of past) expect(p[1], name).toBeGreaterThanOrEqual(LYING - 1e-9);
      }
    }
  });
});

describe('M34: thinner rope on the winch drums, and its loose end on the box', () => {
  it('every turn on a drum lies on the drum at the thin rope radius, for 1 to 5 turns', () => {
    for (const [winchId, keys] of SETUPS) {
      const winch = boat.cockpitHardware.winches.find((w) => w.id === winchId);
      if (!winch) throw new Error(winchId);
      for (const key of keys) {
        for (let turns = 1; turns <= 5; turns += 1) {
          for (const selfTailer of [true, false]) {
            const points = strandOf(winchId, key, turns, selfTailer);
            const name = `${key} on ${winchId}, ${turns} turns, ${selfTailer ? 'self-tailer' : 'hand'}`;
            // The self-tailer's jaw, then the point over the aft edge, then the loose end (2).
            const wrapped = selfTailer ? points.slice(0, -4) : points.slice(0, -2);
            const helix = wrapped.filter((p) => onWinchDrum(p));
            for (const p of helix) {
              expect(Math.hypot(p[0] - winch.x, p[2] - winch.z), name).toBeCloseTo(
                DRUM + DRUM_ROPE,
                6,
              );
            }
            expect(helix.length, name).toBeGreaterThanOrEqual(
              Math.round(turns * WINCH_WRAP_POINTS_PER_TURN),
            );
            if (selfTailer) {
              expect(onWinchDrum(points.at(-4) as Vec3), name).toBe(true);
              expect(onWinchDrum(points.at(-3) as Vec3), name).toBe(false);
            }
          }
        }
      }
    }
  });

  it('whatever the turns, the rope ends in a short straight loose end lying on top of the box', () => {
    const { looseEndLengthM, looseEndIntoBoxM } = boat.modelDetail.winchRope;
    for (const [winchId, keys] of SETUPS) {
      const side = winchId.includes('port') ? -1 : 1;
      const box = ropeBinBox(side);
      for (const key of keys) {
        for (const turns of [-2, 1, 2, 3, 5]) {
          for (const selfTailer of turns > 0 ? [true, false] : [false]) {
            const points = strandOf(winchId, key, turns, selfTailer);
            const name = `${key} on ${winchId}, ${turns} turns, ${selfTailer ? 'self-tailer' : 'hand'}`;
            const start = points.at(-2) as Vec3;
            const tip = points.at(-1) as Vec3;
            expect(start[0], name).toBeCloseTo(box.frontX - looseEndIntoBoxM, 6);
            expect(tip[0], name).toBeCloseTo(start[0] - looseEndLengthM, 6);
            expect(tip[2], name).toBeCloseTo(start[2], 9);
            expect(start[1], name).toBeCloseTo(LYING, 9);
            expect(tip[1], name).toBeCloseTo(LYING, 9);
            expect(inBoxPlan(start, side), name).toBe(true);
            expect(inBoxPlan(tip, side), name).toBe(true);
            // Seen from above the way to it is clear of the coaming's end: it crosses the gap in the air.
            const into = points.at(-3) as Vec3;
            expect(into[1], name).toBeGreaterThanOrEqual(LYING - 1e-9);
          }
        }
      }
    }
  });

  it('in Easy mode no rope point is on a winch drum', () => {
    for (const drawing of ropeDrawings(rig)) {
      for (const strand of drawing.strands) {
        for (const p of strand.points) expect(onWinchDrum(p), drawing.id).toBe(false);
      }
    }
  });
});

describe('M34: sealed rope ends', () => {
  it('each rope mesh has two cap vertices and 2 × RADIAL cap triangles per strand', () => {
    const drawings = ropeDrawings(rig);
    const meshes = buildRopes(drawings, 'high');
    const drawn = smoothDrawings(drawings);
    for (const drawing of drawn) {
      const mesh = meshes.objects.find(
        (m) => (m.userData as { partId?: string }).partId === drawing.id,
      );
      if (!mesh) throw new Error(drawing.id);
      const positions = mesh.geometry.getAttribute('position').count;
      const indices = mesh.geometry.getIndex()?.count ?? 0;
      expect(positions, drawing.id).toBe(
        drawing.strands.reduce((sum, s) => sum + s.points.length * (RADIAL + 1) + 2, 0),
      );
      expect(indices, drawing.id).toBe(
        drawing.strands.reduce(
          (sum, s) => sum + (s.points.length - 1) * RADIAL * 6 + 2 * RADIAL * 3,
          0,
        ),
      );
    }
  });
});
