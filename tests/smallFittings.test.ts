import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import { halfBeamAt, sectionPoint, sheerAt } from '../src/model/hullShape';
import {
  contactShadowSpots,
  hatchBoxes,
  hullHalfWidthAt,
  portlightGrid,
  shroudFoot,
  stanchionBases,
} from '../src/model/smallFittings';
import type { Vec3 } from '../src/model/vec3';
import { SCENE } from '../src/render3d/sceneConfig';

const pt = (row: readonly Vec3[], k: number): Vec3 => row[k] as Vec3;
const length = (a: Vec3, b: Vec3): number => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);

describe('M65: hullHalfWidthAt', () => {
  it('finds the width at a height on the hull section', () => {
    const y = sheerAt(0.4) - 0.28;
    const z = hullHalfWidthAt(0.4, y);
    let found = false;
    for (let s = 0; s <= 1; s += 0.0005) {
      const [sy, sz] = sectionPoint(0.4, s);
      if (Math.abs(sz - z) < 1e-3 && Math.abs(sy - y) < 1e-3) found = true;
    }
    expect(found).toBe(true);
    expect(z).toBeLessThan(halfBeamAt(0.4));
    expect(z).toBeGreaterThan(halfBeamAt(0.4) - 0.2);
    expect(hullHalfWidthAt(0.4, sheerAt(0.4) + 0.1)).toBe(halfBeamAt(0.4));
    expect(hullHalfWidthAt(0.4, -10)).toBe(0);
  });
});

describe('M65: portlightGrid', () => {
  const p = boat.deckFittings.portlights;
  const light = p.list[1] as { x: number; lengthM: number };
  const [top, bottom] = portlightGrid(light, 1);
  it('has two rows of columns + 1 points on the right heights', () => {
    expect(top).toHaveLength(p.columns + 1);
    expect(bottom).toHaveLength(p.columns + 1);
    top.forEach((point, k) => {
      expect(point[2]).toBeGreaterThan(0);
      expect(point[1]).toBeCloseTo(sheerAt(point[0]) - p.belowSheerM, 9);
      expect(pt(bottom, k)[1]).toBeCloseTo(point[1] - p.heightM, 9);
    });
  });
  it('mirrors for side -1', () => {
    const [mirrored] = portlightGrid(light, -1);
    mirrored.forEach((point, k) => expect(point[2]).toBeCloseTo(-pt(top, k)[2], 12));
  });
  it('lies outside the hull between points', () => {
    for (const row of [top, bottom]) {
      for (let k = 0; k < row.length - 1; k += 1) {
        const a = pt(row, k);
        const b = pt(row, k + 1);
        const z = (a[2] + b[2]) / 2;
        expect(z).toBeGreaterThan(hullHalfWidthAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) - 0.0005);
      }
    }
  });
});

describe('M65: shroudFoot', () => {
  const foot = shroudFoot(1);
  it('has the strap and two fittings', () => {
    expect(foot.fittings).toHaveLength(2);
    expect(foot.strap.centre[0]).toBeCloseTo(-0.865, 9);
    expect(foot.strap.centre[1]).toBeCloseTo(1.59, 9);
    expect(foot.strap.centre[2]).toBeCloseTo(2.18, 9);
  });
  it('runs each turnbuckle from c + dir * 0.05 for 0.16 m along its shroud', () => {
    const cp = boat.rig.shrouds.chainplate;
    const c: Vec3 = [cp.x, cp.y, cp.halfZ];
    for (const { toggle, turnbuckle } of foot.fittings) {
      expect(toggle[0]).toEqual(c);
      expect(turnbuckle[0]).toEqual(toggle[1]);
      expect(length(toggle[0], toggle[1])).toBeCloseTo(0.05, 9);
      expect(length(turnbuckle[0], turnbuckle[1])).toBeCloseTo(0.16, 9);
      // One straight line: the end is 0.21 m from the chainplate.
      expect(length(c, turnbuckle[1])).toBeCloseTo(0.21, 9);
    }
  });
  it('mirrors for side -1', () => {
    const port = shroudFoot(-1);
    expect(port.strap.centre[2]).toBeCloseTo(-foot.strap.centre[2], 12);
    port.fittings.forEach((f, i) => {
      const other = foot.fittings[i];
      expect(f.turnbuckle[1][2]).toBeCloseTo(-(other?.turnbuckle[1][2] ?? 0), 12);
    });
  });
});

describe('M65: stanchionBases', () => {
  const bases = stanchionBases();
  it('has 14 points, starboard first, the first at the aft end', () => {
    expect(bases).toHaveLength(14);
    expect(bases[0]?.[0]).toBeCloseTo(-8.2, 9);
    expect(bases[0]?.[1]).toBeCloseTo(1.3904, 3);
    expect(bases[0]?.[2]).toBeCloseTo(1.9753, 3);
    expect(bases[7]?.[0]).toBeCloseTo(-8.2, 9);
    expect(bases[7]?.[2] as number).toBeLessThan(0);
    for (const b of bases) expect(Math.abs(b[2])).toBeLessThan(halfBeamAt(b[0]));
  });
});

describe('M65: hatchBoxes', () => {
  const hatches = hatchBoxes();
  it('has 3 hatches of 4 frame bars with the lids at the right heights', () => {
    expect(hatches).toHaveLength(3);
    for (const h of hatches) expect(h.frame).toHaveLength(4);
    const top = (i: number) =>
      (hatches[i]?.lid.centre[1] as number) + (hatches[i]?.lid.size[1] as number) / 2;
    expect(top(0)).toBeCloseTo(1.99, 9);
    expect(top(1)).toBeCloseTo(1.99, 9);
    expect(top(2)).toBeCloseTo(sheerAt(3.6) + 0.03, 9);
  });
  it('keeps clear of the track and ends where the spec says', () => {
    const left = (i: number) =>
      Math.min(...(hatches[i]?.frame.map((b) => b.centre[0] - b.size[0] / 2) as number[]));
    const right = (i: number) =>
      Math.max(...(hatches[i]?.frame.map((b) => b.centre[0] + b.size[0] / 2) as number[]));
    expect(left(0)).toBeCloseTo(0.775, 9);
    expect(left(0)).toBeGreaterThan(0.28);
    expect(right(1)).toBeCloseTo(-1.35, 9);
  });
});

describe('M65: contactShadowSpots', () => {
  it('has 26 spots', () => {
    expect(contactShadowSpots(SCENE.contactShadow)).toHaveLength(26);
  });
});
