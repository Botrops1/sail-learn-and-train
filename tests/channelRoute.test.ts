import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import { defaultControls } from '../src/model/controls';
import {
  channelCentre,
  channelPath,
  coachroofHalfOutline,
  laneOffset,
  roofAftLip,
  sprayhoodBaseY,
  sprayhoodHalfWidth,
} from '../src/model/deckVolumes';
import {
  guideBlockCentre,
  guideBlockCorner,
  ropeDrawings,
  turningBlockPoint,
} from '../src/model/ropePaths';
import { initialRig } from '../src/model/sim';
import { distance, sub, type Vec3 } from '../src/model/vec3';

type Line = (typeof boat.rig.lineLead.lines)[number];

const channel = boat.rig.lineLead.channel;
const SIDES = [1, -1] as const;
const ropes = ropeDrawings(initialRig(defaultControls()));
const sideOf = (line: Line): 1 | -1 => (line.bank === 'clutch_bank_a' ? 1 : -1);
const linesOf = (side: 1 | -1): Line[] => boat.rig.lineLead.lines.filter((l) => sideOf(l) === side);
const frontLaneOf = (line: Line): number =>
  'frontLane' in line && line.frontLane ? line.frontLane : line.slot;

/** The drawn line of one rope end from its turning block to the clutch's front face (boat frame). */
function leadOf(line: Line): Vec3[] {
  const rope = ropes.find((r) => r.id === line.rope);
  const block = turningBlockPoint(line);
  const strand = rope?.strands.find((s) => s.points.some((p) => distance(p, block) < 1e-9));
  const points = strand?.points ?? [];
  const at = points.findIndex((p) => distance(p, block) < 1e-9);
  const bank = boat.cockpitHardware.clutchBanks.find((b) => b.id === line.bank);
  const clutchFront = (bank?.x ?? 0) + boat.modelDetail.clutchBank.length / 2;
  const end = points.findIndex((p, k) => k > at && Math.abs(p[0] - clutchFront) < 1e-9);
  return points.slice(at, end + 1);
}

/** z of a line (running aft) at station x; interpolated on the segment that spans it. */
function zAt(points: Vec3[], x: number): number {
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1] as Vec3;
    const b = points[i] as Vec3;
    if (x <= a[0] + 1e-9 && x >= b[0] - 1e-9) {
      return a[0] === b[0] ? a[2] : a[2] + ((b[2] - a[2]) * (a[0] - x)) / (a[0] - b[0]);
    }
  }
  return NaN;
}

/** x where two plan-view (x, z) segments cross, or null (touching at an end does not count). */
function crossingX(a: Vec3, b: Vec3, c: Vec3, d: Vec3): number | null {
  const r = [b[0] - a[0], b[2] - a[2]] as const;
  const s = [d[0] - c[0], d[2] - c[2]] as const;
  const denom = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(denom) < 1e-12) return null;
  const t = ((c[0] - a[0]) * s[1] - (c[2] - a[2]) * s[0]) / denom;
  const u = ((c[0] - a[0]) * r[1] - (c[2] - a[2]) * r[0]) / denom;
  const e = 1e-6;
  return t > e && t < 1 - e && u > e && u < 1 - e ? a[0] + t * r[0] : null;
}

function crossings(p: Vec3[], q: Vec3[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < p.length; i += 1) {
    for (let j = 1; j < q.length; j += 1) {
      const x = crossingX(p[i - 1] as Vec3, p[i] as Vec3, q[j - 1] as Vec3, q[j] as Vec3);
      if (x !== null) out.push(x);
    }
  }
  return out;
}

/** The roof's half-width at x (the outline is linear between its points). */
function roofHalf(x: number): number {
  const outline = coachroofHalfOutline(boat.deck.coachroof.frontX);
  for (let i = 1; i < outline.length; i += 1) {
    const [x0, w0] = outline[i - 1] as [number, number];
    const [x1, w1] = outline[i] as [number, number];
    if (x <= x1) return w0 + ((w1 - w0) * (x - x0)) / (x1 - x0);
  }
  return (outline[outline.length - 1] as [number, number])[1];
}

describe('M60c: the channel follows the roof', () => {
  it('on the roof the starboard channel runs along its flared side, edgeInset inside it', () => {
    let checked = 0;
    for (const point of channel.path) {
      const x = point[0] as number;
      const z = point[2] as number;
      if (x > boat.deck.coachroof.aftX + 0.1) {
        expect(z, `x ${x}`).toBeCloseTo(roofHalf(x) - channel.width / 2 - channel.edgeInset, 2);
        checked += 1;
      }
    }
    expect(checked).toBe(5);
  });

  it('with no sideways step: on the roof it is never more than 12° out of line with the boat', () => {
    // The old channel jumped 0.5 m outwards in 0.36 m behind the roof (54°).
    const path = channel.path;
    for (let i = 1; i < path.length; i += 1) {
      const a = path[i - 1] as number[];
      const b = path[i] as number[];
      const slope =
        Math.abs((b[2] as number) - (a[2] as number)) /
        Math.abs((b[0] as number) - (a[0] as number));
      expect((Math.atan(slope) * 180) / Math.PI, `point ${i}`).toBeLessThan(12);
    }
  });

  it('the port channel is the mirror image of the starboard one', () => {
    const star = channelPath(1);
    const port = channelPath(-1);
    star.forEach((p, i) => {
      const q = port[i] as Vec3;
      expect(q[0]).toBeCloseTo(p[0], 12);
      expect(q[1]).toBeCloseTo(p[1], 12);
      expect(q[2]).toBeCloseTo(-p[2], 12);
    });
  });
});

describe('M60c: lines run side by side and overlap in one place', () => {
  it('the swap happens under the cover', () => {
    const first = (channel.path[0] as number[])[0] as number;
    const last = (channel.path[channel.path.length - 1] as number[])[0] as number;
    expect(channel.swap.startX).toBeLessThanOrEqual(first);
    expect(channel.swap.startX - channel.swap.length).toBeGreaterThanOrEqual(last);
  });

  it('before and after the swap, two lines are as far apart as their lanes (parallel)', () => {
    for (const side of SIDES) {
      const lines = linesOf(side);
      const swapEnd = channel.swap.startX - channel.swap.length;
      for (const a of lines) {
        for (const b of lines) {
          if (a.rope + String('tail' in a && a.tail) >= b.rope + String('tail' in b && b.tail)) {
            continue;
          }
          const pa = leadOf(a);
          const pb = leadOf(b);
          for (const x of [-0.95, -1.1, -1.3]) {
            const d = Math.abs(zAt(pa, x) - zAt(pb, x));
            expect(d, `${a.rope}/${b.rope} at ${x}`).toBeCloseTo(
              Math.abs(laneOffset(frontLaneOf(a)) - laneOffset(frontLaneOf(b))),
              2,
            );
          }
          for (const x of [swapEnd - 0.1, swapEnd - 0.5, -3.0, -4.5, -6.0]) {
            const d = Math.abs(zAt(pa, x) - zAt(pb, x));
            expect(d, `${a.rope}/${b.rope} at ${x}`).toBeCloseTo(
              Math.abs(laneOffset(a.slot) - laneOffset(b.slot)),
              2,
            );
          }
        }
      }
    }
  });

  it('from the guide blocks to the clutches the lines cross only where lanes swap, once, under the cover', () => {
    for (const side of SIDES) {
      const lines = linesOf(side);
      const swapping = lines.filter((l) => frontLaneOf(l) !== l.slot).length;
      // Two lines swapping lanes cross once.
      const expected = swapping === 2 ? 1 : 0;
      let pairs = 0;
      lines.forEach((a, i) => {
        lines.slice(i + 1).forEach((b) => {
          const xs = crossings(leadOf(a).slice(1), leadOf(b).slice(1));
          if (xs.length === 0) return;
          pairs += 1;
          expect(xs, `${a.rope}/${b.rope}`).toHaveLength(1);
          const x = xs[0] as number;
          expect(x).toBeLessThanOrEqual(channel.swap.startX);
          expect(x).toBeGreaterThanOrEqual(channel.swap.startX - channel.swap.length);
        });
      });
      expect(pairs, `side ${side}`).toBe(expected);
    }
    // The boat does have such a pair (the port main sheet tail and the vang).
    expect(linesOf(-1).filter((l) => frontLaneOf(l) !== l.slot)).toHaveLength(2);
  });

  it('the straight runs from the turning blocks to the guide blocks cross nothing', () => {
    for (const side of SIDES) {
      const lines = linesOf(side);
      lines.forEach((a, i) => {
        const run = leadOf(a).slice(0, 2);
        lines.forEach((b, j) => {
          if (i === j) {
            // Its own channel part starts at the corner: nothing to cross.
            return;
          }
          expect(crossings(run, leadOf(b).slice(0, 2)), `${a.rope}/${b.rope} runs`).toEqual([]);
          expect(crossings(run, leadOf(b).slice(1)), `${a.rope} run / ${b.rope} channel`).toEqual(
            [],
          );
        });
      });
    }
  });
});

describe('M60c: flat guide blocks', () => {
  it('each line turns on its front lane, on the channel line, in front of the cover', () => {
    const front = (channel.path[0] as number[])[0] as number;
    for (const line of boat.rig.lineLead.lines) {
      const side = sideOf(line);
      const corner = guideBlockCorner(line);
      const centre = channelCentre(side, corner[0]);
      expect(corner[0], line.rope).toBeLessThan(boat.rig.mast.x);
      expect(corner[0], line.rope).toBeGreaterThan(front);
      expect(corner[2], line.rope).toBeCloseTo(centre[2] + laneOffset(frontLaneOf(line)), 9);
      expect(corner[1], line.rope).toBeCloseTo(centre[1] + boat.visual.ropeRenderRadius, 9);
      // On the roof, not past its edge.
      expect(
        Math.abs(corner[2]) + boat.modelDetail.mastBaseTurningBlocks.blockDiameter,
      ).toBeLessThan(roofHalf(corner[0]));
    }
  });

  it('the outermost lane turns first (nearest the mast), the blocks of one side do not touch', () => {
    const diameter = boat.modelDetail.mastBaseTurningBlocks.blockDiameter;
    for (const side of SIDES) {
      const lines = linesOf(side);
      const byOuter = [...lines].sort(
        (a, b) => side * laneOffset(frontLaneOf(b)) - side * laneOffset(frontLaneOf(a)),
      );
      byOuter.slice(1).forEach((line, i) => {
        const before = byOuter[i] as Line;
        expect(guideBlockCorner(line)[0]).toBeLessThan(guideBlockCorner(before)[0]);
      });
      lines.forEach((a, i) => {
        lines.slice(i + 1).forEach((b) => {
          const gap = distance(guideBlockCentre(a), guideBlockCentre(b));
          expect(gap, `${a.rope}/${b.rope}`).toBeGreaterThanOrEqual(diameter - 1e-9);
        });
      });
    }
  });

  it('both sides use the same stations from the mast, and the same height', () => {
    const xs = (side: 1 | -1): number[] =>
      linesOf(side)
        .map((l) => guideBlockCorner(l)[0])
        .sort((a, b) => a - b);
    expect(xs(-1)).toEqual(xs(1));
    for (const line of boat.rig.lineLead.lines) {
      expect(guideBlockCentre(line)[1]).toBeCloseTo(guideBlockCorner(line)[1], 9);
    }
  });

  it('the rope wraps its block: the corner lies one radius from the block centre', () => {
    const r = boat.modelDetail.mastBaseTurningBlocks.blockDiameter / 2;
    for (const line of boat.rig.lineLead.lines) {
      expect(distance(guideBlockCentre(line), guideBlockCorner(line)), line.rope).toBeCloseTo(r, 9);
      // The block is on the inside of the turn: nearer the centre line than the rope.
      const d = sub(guideBlockCentre(line), guideBlockCorner(line));
      expect(Math.sign(d[2]), line.rope).toBe(-sideOf(line));
    }
  });
});

describe('M60c: no slit between the roof and the sprayhood', () => {
  it('the roof top reaches over the cockpit front to behind the hood front, as wide as the roof end', () => {
    const lip = roofAftLip();
    const roof = boat.deck.coachroof;
    const hood = boat.modelDetail.sprayhood;
    // It joins the roof's aft face (overlapping it) and runs past the hood's front edge.
    expect(lip.frontX).toBeGreaterThan(roof.aftX);
    expect(lip.aftX).toBeLessThan(hood.frontX);
    expect(lip.aftX).toBeLessThan(boat.deck.cockpit.frontX);
    expect(lip.halfWidth).toBe(roof.halfWidth);
    expect(lip.topY).toBe(roof.topY);
    expect(lip.bottomY).toBeLessThan(boat.deck.cockpit.coamingTopY);
  });

  it('the hood sits on it: its front edge is at the roof top, within its width', () => {
    const hood = boat.modelDetail.sprayhood;
    const lip = roofAftLip();
    expect(sprayhoodBaseY(hood.frontX)).toBeCloseTo(lip.topY, 1);
    expect(sprayhoodHalfWidth(hood.frontX)).toBeLessThan(lip.halfWidth);
  });
});
