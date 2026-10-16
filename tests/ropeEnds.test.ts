import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import { defaultControls } from '../src/model/controls';
import { initialRealistic, winchWraps, type RealisticState } from '../src/model/realistic';
import { coilLayers } from '../src/model/ropeCoil';
import { onWinchDrum, ropeDrawings, WINCH_WRAP_POINTS_PER_TURN } from '../src/model/ropePaths';
import { initialRig } from '../src/model/sim';
import { buildRopes } from '../src/render3d/boat/ropes';
import { SCENE } from '../src/render3d/sceneConfig';

/**
 * M34 (PHASE6_SPEC 10.5): sealed rope ends, thinner rope on the winch drums, coils in the rope
 * tail boxes. Drawing only: no sailing rule is tested.
 */
const rig = initialRig(defaultControls());
const DRUM = boat.modelDetail.winch.diameter / 2;
const DRUM_ROPE = boat.modelDetail.winchRope.drumRenderRadius;
const RADIAL = SCENE.ropes.radialSegments;

function realisticWith(
  winchId: string,
  setup: { tail: string; turns: number; selfTailer: boolean },
): RealisticState {
  const state = initialRealistic();
  const current = state.winches[winchId];
  if (!current) throw new Error(winchId);
  return { ...state, winches: { ...state.winches, [winchId]: { ...current, ...setup } } };
}

describe('M34: coiled tails in the rope tail boxes', () => {
  it('has the worked values of PHASE6_SPEC 10.4', () => {
    const layers = coilLayers({ x: -7.58, z: 1.6 }, 32);
    expect(layers).toHaveLength(2);
    for (const layer of layers) expect(layer).toHaveLength(81);
    const first = layers[0]?.[0] ?? [0, 0, 0];
    expect(first[0]).toBeCloseTo(-7.55, 3);
    expect(first[1]).toBeCloseTo(1.565, 3);
    expect(first[2]).toBeCloseTo(1.6, 3);
    const lastPoint = layers[0]?.at(-1) ?? [0, 0, 0];
    expect(Math.hypot(lastPoint[0] + 7.58, lastPoint[2] - 1.6)).toBeCloseTo(0.085, 3);
    expect(layers[1]?.[0]?.[1]).toBeCloseTo(1.587, 3);
    const { ropeBin } = boat.modelDetail;
    const coil = ropeBin.coil;
    expect(coil.outerRadius + coil.ropeRadius).toBeLessThan(
      Math.min(ropeBin.length, ropeBin.width) / 2 - ropeBin.rimWidth,
    );
  });
});

describe('M34: thinner rope on the winch drums', () => {
  const cases = [
    ['winch_primary_port', ['b2', 'b3', 'b4', 'b5', 'r1']],
    ['winch_primary_starboard', ['a1', 'a2', 'a3', 'a5']],
  ] as const;

  it('every turn on a drum lies on the drum at the thin rope radius, for 1 to 5 turns', () => {
    for (const [winchId, keys] of cases) {
      const winch = boat.cockpitHardware.winches.find((w) => w.id === winchId);
      if (!winch) throw new Error(winchId);
      for (const key of keys) {
        for (let turns = 1; turns <= 5; turns += 1) {
          for (const selfTailer of [true, false]) {
            const wraps = winchWraps(realisticWith(winchId, { tail: key, turns, selfTailer }));
            const name = `${key} on ${winchId}, ${turns} turns, ${selfTailer ? 'self-tailer' : 'hand'}`;
            const ropeId = wraps[0]?.ropeId ?? '';
            const drawing = ropeDrawings(rig, boat, wraps).find((d) => d.id === ropeId);
            const strand = drawing?.strands.find((s) => s.points.some((p) => onWinchDrum(p)));
            const points = strand?.points ?? [];
            // With a self-tailer the last point is the jaw point, inside the drum's radius.
            const helix = (selfTailer ? points.slice(0, -1) : points).filter((p) => onWinchDrum(p));
            for (const p of helix) {
              expect(Math.hypot(p[0] - winch.x, p[2] - winch.z), name).toBeCloseTo(
                DRUM + DRUM_ROPE,
                6,
              );
            }
            expect(helix.length, name).toBeGreaterThanOrEqual(
              Math.round(turns * WINCH_WRAP_POINTS_PER_TURN),
            );
            if (selfTailer) expect(onWinchDrum(points.at(-1) ?? [0, 0, 0]), name).toBe(true);
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
    const meshes = buildRopes(drawings);
    for (const drawing of drawings) {
      const mesh = meshes.objects.find(
        (m) => (m.userData as { partId?: string }).partId === drawing.id,
      );
      if (!mesh) throw new Error(drawing.id);
      const positions = mesh.geometry.getAttribute('position').count;
      const indices = mesh.geometry.getIndex()?.count ?? 0;
      expect(positions, drawing.id).toBe(
        drawing.strands.reduce((sum, s) => sum + s.points.length * RADIAL + 2, 0),
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
