import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import { halfBeamAt, keelLineAt, sectionPoint, sheerAt } from '../src/model/hullShape';

describe('hull shape', () => {
  const { hull } = boat;

  it('keel line meets the waterline at both waterline ends and is deepest at deepestX', () => {
    expect(keelLineAt(hull.waterline.fwdX)).toBeCloseTo(0, 6);
    expect(keelLineAt(hull.waterline.aftX)).toBeCloseTo(0, 6);
    expect(keelLineAt(hull.canoeBody.deepestX)).toBeCloseTo(-hull.canoeBody.maxDepthBelowWL, 6);
    expect(keelLineAt(hull.transomX)).toBeCloseTo(hull.waterline.transomBottomY, 6);
    for (let x = hull.transomX; x <= hull.stemX; x += 0.1) {
      expect(keelLineAt(x)).toBeGreaterThanOrEqual(-hull.canoeBody.maxDepthBelowWL - 1e-9);
    }
  });

  it('section runs from the keel line on the centreline to the deck edge', () => {
    for (const x of [-8, -4, -1, 2, 5]) {
      const [y0, z0] = sectionPoint(x, 0);
      const [y1, z1] = sectionPoint(x, 1);
      expect(z0).toBeCloseTo(0, 6);
      expect(y0).toBeCloseTo(Math.min(keelLineAt(x), sheerAt(x)), 6);
      expect(z1).toBeCloseTo(halfBeamAt(x), 6);
      expect(y1).toBeCloseTo(sheerAt(x), 6);
    }
  });

  it('maximum half-beam is half the official beam', () => {
    let max = 0;
    for (let x = hull.transomX; x <= hull.stemX; x += 0.01) max = Math.max(max, halfBeamAt(x));
    expect(max * 2).toBeCloseTo(boat.dimensions.beam, 2);
    expect(halfBeamAt(hull.stemX + 0.1)).toBe(0);
  });
});
