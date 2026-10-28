import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import { defaultControls } from '../src/model/controls';
import { ropeBinBox } from '../src/model/ropeBin';
import { ropeDrawings, type WinchWrap } from '../src/model/ropePaths';
import {
  insertWhipping,
  roundCorners,
  smoothDrawings,
  transportFrames,
} from '../src/model/ropeSmooth';
import { initialRig } from '../src/model/sim';
import { cross, distance, dot, length, sub, type Vec3 } from '../src/model/vec3';

/**
 * M60 (PHASE9_SPEC 6.3, 6.7): ropes drawn with rounded corners and whipped tails. Drawing only:
 * no sailing rule is tested, and `ropeDrawings` itself is not changed.
 */
const R = 0.045;
const K = 4;
const SHARE = 0.45;

const rig = initialRig(defaultControls());
const easy = ropeDrawings(rig);
const winches: WinchWrap[] = [
  {
    winchId: 'winch_primary_starboard',
    ropeId: 'rope_mainsheet',
    tail: 'starboard',
    turns: 3,
    selfTailer: true,
  },
  {
    winchId: 'winch_primary_port',
    ropeId: 'rope_mainsheet',
    tail: 'port',
    turns: 0,
    selfTailer: false,
  },
];
const realistic = ropeDrawings(rig, boat, winches);

const lineLength = (points: readonly Vec3[]) =>
  points.slice(1).reduce((sum, p, i) => sum + distance(p, points[i] as Vec3), 0);

function expectPoint(actual: Vec3 | undefined, expected: Vec3): void {
  expect(actual).toBeDefined();
  for (let i = 0; i < 3; i += 1) {
    expect((actual as Vec3)[i]).toBeCloseTo(expected[i] as number, 9);
  }
}

describe('roundCorners', () => {
  it('keeps 2 points and turns each interior point into K points', () => {
    expect(
      roundCorners(
        [
          [0, 0, 0],
          [1, 0, 0],
        ],
        R,
        K,
        SHARE,
      ),
    ).toEqual([
      [0, 0, 0],
      [1, 0, 0],
    ]);
    const five: Vec3[] = [
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
      [2, 1, 0],
      [2, 1, 1],
    ];
    expect(roundCorners(five, R, K, SHARE)).toHaveLength(14);
  });

  it('a 90° corner is an arc of the radius whose middle passes through the corner', () => {
    const out = roundCorners(
      [
        [0, 0, 0],
        [1, 0, 0],
        [1, 1, 0],
      ],
      R,
      K,
      SHARE,
    );
    expect(out).toHaveLength(6);
    expectPoint(out[0], [0, 0, 0]);
    expectPoint(out[5], [1, 1, 0]);
    // The plain fillet's centre is (1 − R, R); moving the arc outwards by R(1 − √2/2) along the
    // diagonal puts the corner (1, 0) on the arc itself (owner, PR #135).
    const half = (R * Math.SQRT2) / 2;
    const centre: Vec3 = [1 - half, half, 0];
    const s = R - half;
    expectPoint(out[1], [1 - R + s, -s, 0]);
    expectPoint(out[4], [1 + s, R - s, 0]);
    for (let k = 1; k <= 4; k += 1) {
      expect(distance(out[k] as Vec3, centre)).toBeCloseTo(R, 9);
    }
    expect(distance([1, 0, 0], centre)).toBeCloseTo(R, 9);
  });

  it('a sharp 128° corner is never sunk into the corner: the arc passes within 4 mm of it', () => {
    const turn = (128 * Math.PI) / 180;
    const out = roundCorners(
      [
        [0, 0, 0],
        [1, 0, 0],
        [1 + Math.cos(turn), Math.sin(turn), 0],
      ],
      R,
      K,
      SHARE,
    );
    const chordMiddle: Vec3 = [
      ((out[2] as Vec3)[0] + (out[3] as Vec3)[0]) / 2,
      ((out[2] as Vec3)[1] + (out[3] as Vec3)[1]) / 2,
      0,
    ];
    expect(distance(chordMiddle, [1, 0, 0])).toBeLessThan(0.004);
  });

  it('shrinks the arc on a short segment (at most the share of it)', () => {
    const out = roundCorners(
      [
        [0, 0, 0],
        [0.05, 0, 0],
        [0.05, 1, 0],
      ],
      R,
      K,
      SHARE,
    );
    // t = 0.45 · 0.05 = 0.0225 (so r = 0.0225), then moved outwards by r(1 − √2/2).
    const s = 0.0225 * (1 - Math.SQRT2 / 2);
    expectPoint(out[1], [0.0275 + s, -s, 0]);
    expectPoint(out[4], [0.05 + s, 0.0225 - s, 0]);
  });

  it('a straight corner still gets K points along the line', () => {
    const out = roundCorners(
      [
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
      ],
      R,
      K,
      SHARE,
    );
    [0.955, 0.985, 1.015, 1.045].forEach((x, i) => expectPoint(out[i + 1], [x, 0, 0]));
  });

  it('copies a degenerate corner and a doubling back, without NaN', () => {
    const degenerate = roundCorners(
      [
        [0, 0, 0],
        [0, 0, 0],
        [1, 0, 0],
      ],
      R,
      K,
      SHARE,
    );
    expect(degenerate).toHaveLength(6);
    for (let k = 1; k <= 4; k += 1) expectPoint(degenerate[k], [0, 0, 0]);
    const back = roundCorners(
      [
        [0, 0, 0],
        [1, 0, 0],
        [0, 0, 0],
      ],
      R,
      K,
      SHARE,
    );
    for (let k = 1; k <= 4; k += 1) expectPoint(back[k], [1, 0, 0]);
  });
});

describe('insertWhipping', () => {
  it('puts two points near the end and says where the whipping starts', () => {
    const out = insertWhipping(
      [
        [0, 0, 0],
        [0.5, 0, 0],
        [1, 0, 0],
      ],
      0.03,
      0.001,
    );
    expect(out.points).toHaveLength(5);
    [0, 0.5, 0.969, 0.97, 1].forEach((x, i) => expectPoint(out.points[i], [x, 0, 0]));
    expect(out.whipFrom).toBe(3);
  });

  it('a line shorter than the whipping gets them at 25 % and 50 %', () => {
    const out = insertWhipping(
      [
        [0, 0, 0],
        [0.02, 0, 0],
      ],
      0.03,
      0.001,
    );
    expectPoint(out.points[1], [0.005, 0, 0]);
    expectPoint(out.points[2], [0.01, 0, 0]);
    expect(out.whipFrom).toBe(2);
  });
});

describe('smoothDrawings', () => {
  const drawn = smoothDrawings(easy);
  const strands = drawn.flatMap((rope) => rope.strands);

  it('in Easy mode: 22 strands, 958 points, 11 whipped tails ending in a rope box', () => {
    expect(strands).toHaveLength(22);
    expect(strands.reduce((sum, s) => sum + s.points.length, 0)).toBe(958);
    expect(strands.filter((s) => s.whipFrom !== null)).toHaveLength(11);
    const raw = easy.flatMap((rope) => rope.strands);
    raw.forEach((strand, index) => {
      expect(strands[index]?.whipFrom !== null, `strand ${index}`).toBe(strand.tailEnd === true);
      if (!strand.tailEnd) return;
      const end = strand.points.at(-1) as Vec3;
      const box = ropeBinBox(Math.sign(end[2]) as 1 | -1);
      expect(end[0]).toBeCloseTo(box.frontX - boat.modelDetail.ropeBin.entry.depthM, 6);
    });
  });

  it('stays close to the raw line: at most 4 cm longer, every corner within a block radius, turns under 45°', () => {
    const raw = easy.flatMap((rope) => rope.strands);
    raw.forEach((strand, index) => {
      const rb = boat.visual.ropeBend;
      const rounded = roundCorners(strand.points, rb.radiusM, rb.arcPoints, rb.maxShareOfSegment);
      const rawLength = lineLength(strand.points);
      const drawnLength = lineLength(rounded);
      expect(drawnLength, `strand ${index}`).toBeLessThanOrEqual(rawLength + 0.04);
      expect(drawnLength, `strand ${index}`).toBeGreaterThanOrEqual(rawLength - 0.14);
      for (let i = 1; i < strand.points.length - 1; i += 1) {
        const near = Math.min(
          ...rounded
            .slice(1 + (i - 1) * K, 1 + i * K)
            .map((p) => distance(p, strand.points[i] as Vec3)),
        );
        expect(near, `strand ${index} point ${i}`).toBeLessThanOrEqual(
          boat.modelDetail.block.radius,
        );
      }
      for (let i = 1; i < rounded.length - 1; i += 1) {
        const a = sub(rounded[i] as Vec3, rounded[i - 1] as Vec3);
        const b = sub(rounded[i + 1] as Vec3, rounded[i] as Vec3);
        if (length(a) < 1e-6 || length(b) < 1e-6) continue;
        const turn = Math.acos(Math.min(1, dot(a, b) / (length(a) * length(b))));
        expect((turn * 180) / Math.PI, `strand ${index} point ${i}`).toBeLessThanOrEqual(45);
      }
    });
  });

  it('with ropes on the winches: 1,370 finite points', () => {
    const points = smoothDrawings(realistic).flatMap((rope) =>
      rope.strands.flatMap((s) => s.points),
    );
    expect(points).toHaveLength(1370);
    expect(points.every((p) => p.every(Number.isFinite))).toBe(true);
  });

  it('leaves its input unchanged', () => {
    const before = structuredClone(easy);
    smoothDrawings(easy);
    expect(easy).toEqual(before);
  });
});

describe('transportFrames', () => {
  it('gives steady frames along every drawn strand, Easy and with winches', () => {
    for (const drawings of [easy, realistic]) {
      for (const strand of smoothDrawings(drawings).flatMap((rope) => rope.strands)) {
        const frames = transportFrames(strand.points);
        expect(frames).toHaveLength(strand.points.length);
        frames.forEach((frame, i) => {
          expect(length(frame.normal)).toBeCloseTo(1, 9);
          expect(Math.abs(dot(frame.normal, frame.tangent))).toBeLessThan(1e-9);
          const previous = frames[i - 1];
          if (!previous) return;
          const angle = (a: Vec3, b: Vec3) => Math.atan2(length(cross(a, b)), dot(a, b));
          expect(angle(previous.normal, frame.normal)).toBeLessThanOrEqual(
            angle(previous.tangent, frame.tangent) + 1e-6 * (Math.PI / 180),
          );
        });
      }
    }
  });

  it('handles an empty line and a single point', () => {
    expect(transportFrames([])).toEqual([]);
    expect(transportFrames([[1, 2, 3]])[0]?.tangent).toEqual([1, 0, 0]);
  });
});
