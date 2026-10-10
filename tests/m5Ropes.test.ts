import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import { defaultControls } from '../src/model/controls';
import { initialRealistic, winchWraps, type RealisticState } from '../src/model/realistic';
import {
  lineSpec,
  mastExitPoint,
  ropeDrawings,
  turningBlockPoint,
  WINCH_WRAP_POINTS_PER_TURN,
  winchWrapPoints,
  type RopeDrawing,
  type WinchWrap,
} from '../src/model/ropePaths';
import { initialRig } from '../src/model/sim';
import { sub, type Vec3 } from '../src/model/vec3';
import { buildBoat } from '../src/render3d/boat';

const RADIUS = boat.visual.ropeRenderRadius;
const DRUM = boat.modelDetail.winch.diameter / 2;
const rig = initialRig(defaultControls());

function winch(id: string) {
  const found = boat.cockpitHardware.winches.find((w) => w.id === id);
  if (!found) throw new Error(id);
  return found;
}
const PORT = winch('winch_primary_port');
const STARBOARD = winch('winch_primary_starboard');

function rope(drawings: RopeDrawing[], id: string): RopeDrawing {
  const found = drawings.find((r) => r.id === id);
  if (!found) throw new Error(id);
  return found;
}

/** Signed angle turned round the winch axis by the points on the drum (+ = clockwise from above). */
function turned(points: Vec3[], w: { x: number; z: number }): number {
  const onDrum = points.filter(
    (p) => Math.abs(Math.hypot(p[0] - w.x, p[2] - w.z) - (DRUM + RADIUS)) < 1e-6,
  );
  const angle = (p: Vec3) => Math.atan2(p[2] - w.z, p[0] - w.x);
  let sum = 0;
  for (let i = 1; i < onDrum.length; i += 1) {
    let d = angle(onDrum[i] as Vec3) - angle(onDrum[i - 1] as Vec3);
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    sum += d;
  }
  return sum;
}

/** Samples along a polyline, every 1 cm. */
function samples(points: readonly Vec3[]): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1] as Vec3;
    const b = points[i] as Vec3;
    const n = Math.max(1, Math.ceil(Math.hypot(...sub(b, a)) / 0.01));
    for (let k = 0; k <= n; k += 1) {
      const t = k / n;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
    }
  }
  return out;
}

function realisticWith(
  winchId: string,
  setup: { tail: string; turns: number; selfTailer: boolean },
): RealisticState {
  const state = initialRealistic();
  const current = state.winches[winchId];
  if (!current) throw new Error(winchId);
  return { ...state, winches: { ...state.winches, [winchId]: { ...current, ...setup } } };
}

describe('M5: halyards in 3D', () => {
  it('the main halyard comes out of the mast foot, drops to its block and runs aft to "Main halyard" (bank A, slot 4)', () => {
    const halyard = rope(ropeDrawings(rig), 'rope_main_halyard');
    expect(halyard.state).toBe('taut');
    const points = halyard.strands[0]?.points ?? [];
    const spec = lineSpec('rope_main_halyard');
    expect(points[0]).toEqual(mastExitPoint(spec));
    expect(points[1]).toEqual(turningBlockPoint(spec));
    const end = points[points.length - 1] as Vec3;
    const bank = boat.cockpitHardware.clutchBanks.find((b) => b.id === 'clutch_bank_a');
    expect(end[2]).toBeGreaterThan(0);
    expect(Math.abs(end[0] - (bank?.x ?? 0))).toBeLessThan(boat.modelDetail.clutchBank.length);
  });

  it('the gennaker halyard is parked down the front of the mast and its tail runs to "SPI HALYARD" (bank B, slot 1)', () => {
    const halyard = rope(ropeDrawings(rig), 'rope_spi_halyard');
    const [parked, tail] = halyard.strands;
    const top = parked?.points[0] as Vec3;
    const bottom = parked?.points[parked.points.length - 1] as Vec3;
    // From above the forestay down to the mast foot, in front of the mast, outside it.
    expect(top[1]).toBeGreaterThan(boat.rig.forestay.top[1] ?? Infinity);
    expect(top[1]).toBeLessThan(boat.rig.mast.topY);
    expect(bottom[1]).toBeGreaterThan(boat.rig.mast.footY);
    for (const p of [top, bottom]) {
      expect(p[0] - RADIUS).toBeGreaterThanOrEqual(boat.rig.mast.sectionForeAft / 2);
    }
    // Clear of the forestay, which meets the mast on the centreline.
    expect(Math.abs(top[2])).toBeGreaterThanOrEqual(RADIUS + boat.modelDetail.wireRenderRadius);
    const end = tail?.points[tail.points.length - 1] as Vec3;
    expect(end[2]).toBeLessThan(0);
    expect(tail?.points[0]).toEqual(mastExitPoint(lineSpec('rope_spi_halyard')));
  });

  it('every rope in the boat file has a drawing, and every drawing a registry rope', () => {
    const drawn = ropeDrawings(rig)
      .map((r) => r.id)
      .sort();
    expect(drawn).toEqual(boat.ropes.list.map((r) => r.id).sort());
  });
});

describe('M5: Realistic mode in 3D, the rope on a winch is wrapped on that winch', () => {
  it('Easy mode (no winch setup) keeps the M3b drawing: only JIB ROLL on the port winch', () => {
    const easy = ropeDrawings(rig);
    const realisticEmpty = ropeDrawings(rig, boat, []);
    const roll = (d: RopeDrawing[]) => rope(d, 'rope_jib_furling_line').strands[0]?.points ?? [];
    expect(turned(roll(easy), PORT)).toBeGreaterThan(2 * 2 * Math.PI - 0.1);
    // Realistic mode with nothing on the winch: the line ends just past its clutch.
    const clutch = boat.cockpitHardware.jibRollClutch;
    const end = roll(realisticEmpty).at(-1) as Vec3;
    expect(end[0]).toBeLessThan(clutch.x);
    expect(end[0]).toBeGreaterThan(clutch.x - 0.5);
    expect(turned(roll(realisticEmpty), PORT)).toBe(0);
    // Every other rope is the same as in Easy mode.
    for (const drawing of easy) {
      if (drawing.id === 'rope_jib_furling_line') continue;
      expect(rope(realisticEmpty, drawing.id)).toEqual(drawing);
    }
  });

  it('the jib sheet on the starboard winch, 3 turns, tail in the self-tailer: wrapped 3 times clockwise and ends in the jaw', () => {
    const wraps = winchWraps(
      realisticWith('winch_primary_starboard', { tail: 'a5', turns: 3, selfTailer: true }),
    );
    expect(wraps).toEqual([
      {
        winchId: 'winch_primary_starboard',
        ropeId: 'rope_jib_sheet',
        tail: null,
        turns: 3,
        selfTailer: true,
      },
    ]);
    const sheet = rope(ropeDrawings(rig, boat, wraps), 'rope_jib_sheet');
    const points = sheet.strands.at(-1)?.points ?? [];
    const angle = turned(points, STARBOARD);
    expect(angle).toBeGreaterThan(3 * 2 * Math.PI - 0.01);
    expect(angle).toBeLessThan(3 * 2 * Math.PI + 0.01);
    const last = points.at(-1) as Vec3;
    expect(Math.hypot(last[0] - STARBOARD.x, last[2] - STARBOARD.z)).toBeLessThan(DRUM);
    expect(last[1]).toBeGreaterThan(STARBOARD.y + boat.modelDetail.winch.height * 0.8);
    // Nothing else is on a winch.
    expect(
      turned(rope(ropeDrawings(rig, boat, wraps), 'rope_vang').strands.at(-1)?.points ?? [], PORT),
    ).toBe(0);
  });

  it('PT-17 a rope wrapped the wrong way is drawn anticlockwise (seen from above), the tail in the hand', () => {
    const wraps = winchWraps(
      realisticWith('winch_primary_port', { tail: 'b5', turns: -2, selfTailer: false }),
    );
    const vang = rope(ropeDrawings(rig, boat, wraps), 'rope_vang');
    const points = vang.strands.at(-1)?.points ?? [];
    expect(turned(points, PORT)).toBeLessThan(-2 * 2 * Math.PI + 0.01);
    // The tail goes to the hand: inboard of the winch, above the coaming.
    const hand = points.at(-1) as Vec3;
    expect(Math.abs(hand[2])).toBeLessThan(Math.abs(PORT.z));
    expect(hand[1]).toBeGreaterThan(boat.deck.cockpit.coamingTopY);
  });

  it('each end of a two-ended rope goes on the winch on its own; JIB ROLL goes to the port winch only when put on it', () => {
    const port = winchWraps(
      realisticWith('winch_primary_port', { tail: 'b4', turns: 4, selfTailer: true }),
    );
    const sheet = rope(ropeDrawings(rig, boat, port), 'rope_mainsheet');
    const portTail = sheet.strands.find((s) => turned(s.points, PORT) > 0);
    expect(turned(portTail?.points ?? [], PORT)).toBeGreaterThan(4 * 2 * Math.PI - 0.01);
    for (const strand of sheet.strands) expect(turned(strand.points, STARBOARD)).toBe(0);

    const roll = winchWraps(
      realisticWith('winch_primary_port', { tail: 'r1', turns: 1, selfTailer: false }),
    );
    const line = rope(ropeDrawings(rig, boat, roll), 'rope_jib_furling_line');
    const angle = turned(line.strands[0]?.points ?? [], PORT);
    expect(angle).toBeGreaterThanOrEqual(2 * Math.PI - 0.01);
    expect(angle).toBeLessThan(2 * 2 * Math.PI);
  });

  it('the rope runs onto and off the drum without cutting through it or the coaming, for every clutch, turns and tail', () => {
    for (const [winchId, keys] of [
      ['winch_primary_port', ['b2', 'b3', 'b4', 'b5', 'r1']],
      ['winch_primary_starboard', ['a1', 'a2', 'a3', 'a5']],
    ] as const) {
      const w = winch(winchId);
      for (const key of keys) {
        for (const turns of [-3, -1, 0, 1, 2, 5]) {
          for (const selfTailer of [true, false]) {
            if (turns <= 0 && selfTailer) continue;
            const wraps = winchWraps(realisticWith(winchId, { tail: key, turns, selfTailer }));
            const wrap = wraps[0] as WinchWrap;
            const drawing = rope(ropeDrawings(rig, boat, wraps), wrap.ropeId);
            const strand = drawing.strands.find((s) =>
              s.points.some((p) => Math.abs(p[0] - w.x) < 0.5 && Math.abs(p[2] - w.z) < 0.5),
            );
            const points = strand?.points ?? [];
            const name = `${key} on ${winchId}, ${turns} turns, ${selfTailer ? 'self-tailer' : 'hand'}`;
            // Into the jaw the rope goes over the top of the drum: leave that last piece out.
            const checked = selfTailer ? points.slice(0, -1) : points;
            for (const p of samples(checked)) {
              if (p[1] < w.y + boat.modelDetail.winch.height && p[1] > w.y) {
                // The drawn wrap is a polygon: its straight pieces cut the circle by a hair.
                expect(Math.hypot(p[0] - w.x, p[2] - w.z), name).toBeGreaterThan(
                  (DRUM + RADIUS) * Math.cos(Math.PI / WINCH_WRAP_POINTS_PER_TURN) - 1e-6,
                );
              }
              const { cockpit } = boat.deck;
              const onCoaming =
                Math.abs(p[2]) <= cockpit.wellHalfWidth + boat.modelDetail.coamingWidth &&
                Math.abs(p[2]) >= cockpit.wellHalfWidth &&
                p[0] <= cockpit.frontX &&
                p[0] >= cockpit.aftX;
              if (onCoaming) {
                expect(p[1] - RADIUS, name).toBeGreaterThanOrEqual(cockpit.coamingTopY - 1e-6);
              }
            }
          }
        }
      }
    }
  });

  it('wraps rise up the drum between the data heights, one rope width a turn', () => {
    const points = winchWrapPoints(
      { winchId: PORT.id, ropeId: 'rope_vang', tail: null, turns: 5, selfTailer: true },
      [PORT.x + 0.4, PORT.y + 0.04, PORT.z],
    );
    const onDrum = points.slice(0, -1);
    const ys = onDrum.map((p) => p[1]);
    expect(Math.min(...ys)).toBeCloseTo(PORT.y + boat.modelDetail.winchRope.wrapBottomAboveBase, 6);
    expect(Math.max(...ys)).toBeCloseTo(PORT.y + boat.modelDetail.winchRope.wrapTopAboveBase, 6);
    // One turn rises by about a rope's width, not over the whole drum.
    const one = winchWrapPoints(
      { winchId: PORT.id, ropeId: 'rope_vang', tail: null, turns: 1, selfTailer: true },
      [PORT.x + 0.4, PORT.y + 0.04, PORT.z],
    ).slice(0, -1);
    const rise = Math.max(...one.map((p) => p[1])) - Math.min(...one.map((p) => p[1]));
    expect(rise).toBeCloseTo(2 * RADIUS, 6);
  });

  it('the 3D rope gets new buffers when it goes on the winch, and keeps working after', () => {
    const controls = defaultControls();
    const model = buildBoat(controls, rig);
    const mesh = () => {
      let found: THREE.Mesh | undefined;
      model.root.traverse((o) => {
        if (o instanceof THREE.Mesh && o.userData.partId === 'rope_jib_sheet') found = o;
      });
      return found as THREE.Mesh;
    };
    const before = mesh().geometry.getAttribute('position').count;
    const wraps = winchWraps(
      realisticWith('winch_primary_starboard', { tail: 'a5', turns: 4, selfTailer: true }),
    );
    model.update(rig, controls, undefined, undefined, wraps);
    const after = mesh().geometry.getAttribute('position').count;
    expect(after).toBeGreaterThan(before);
    model.update(rig, controls, undefined, undefined, []);
    expect(mesh().geometry.getAttribute('position').count).toBe(before);
    for (const v of mesh().geometry.getAttribute('position').array) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});
