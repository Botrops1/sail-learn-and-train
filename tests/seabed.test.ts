import { describe, expect, it } from 'vitest';
import { area } from '../src/model/area';
import { boat as boatData } from '../src/model/boat';
import { insidePolygon } from '../src/model/marina';
import { initialBoat, type BoatState } from '../src/model/motion';
import {
  depthAt,
  depthGradient,
  groundForces,
  groundPoints,
  landObstacles,
  seabedAt,
} from '../src/model/seabed';

/** M45 (PHASE7_SPEC 11.7): the bay's depths, bottom and the bottom's push on the keel. */

const bay = area.bay;

describe('M45 depthAt', () => {
  it('gives the worked values of the spec', () => {
    expect(depthAt(-1650, 0)).toBeCloseTo(5.0, 6);
    expect(depthAt(0, 0)).toBeCloseTo(40, 6);
    expect(depthAt(-1480, -60)).toBeCloseTo(1.5, 6);
    expect(depthAt(-1477.5, -60)).toBeCloseTo(3.375, 6);
    expect(depthAt(0, 1460)).toBeCloseTo(5, 6);
    expect(depthAt(-1750, 0)).toBeCloseTo(-7.5, 6);
  });

  it('the land never rises above landMaxHeightM', () => {
    expect(depthAt(-3000, 1000)).toBeCloseTo(-bay.landMaxHeightM, 6);
  });
});

describe('M45 seabedAt', () => {
  it('sand, weed, rock and mud where the spec says', () => {
    expect(seabedAt(-1560, -90)).toBe('weed');
    expect(seabedAt(-1690, 0)).toBe('rock');
    expect(seabedAt(-1650, 50)).toBe('sand');
    expect(seabedAt(-1605, 0)).toBe('sand');
    expect(seabedAt(0, 1460)).toBe('mud');
  });
});

describe('M45 depthGradient', () => {
  it('points east (towards deeper water) with size 0.1 at (-1650, 0)', () => {
    const [east, north] = depthGradient(-1650, 0);
    expect(east).toBeCloseTo(0.1, 3);
    expect(north).toBeCloseTo(0, 3);
  });
});

describe('M45 the bay data', () => {
  const inside = (x: number, y: number) => insidePolygon(bay.coast, x, y);
  const distanceToCoast = (x: number, y: number) => {
    let best = Infinity;
    for (let i = 0, j = bay.coast.length - 1; i < bay.coast.length; j = i, i += 1) {
      const [ax, ay] = bay.coast[j] as [number, number];
      const [bx, by] = bay.coast[i] as [number, number];
      const len2 = (bx - ax) ** 2 + (by - ay) ** 2;
      const u = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / len2));
      best = Math.min(best, Math.hypot(x - (ax + u * (bx - ax)), y - (ay + u * (by - ay))));
    }
    return best;
  };

  it('every land rectangle lies inside the coast or on its edge', () => {
    for (const r of bay.landObstacles) {
      const cx = (r.west + r.east) / 2;
      const cy = (r.south + r.north) / 2;
      const towards = (v: number, c: number) => v + Math.sign(c - v) * 0.01;
      for (const [x, y] of [
        [r.west, r.south],
        [r.east, r.south],
        [r.east, r.north],
        [r.west, r.north],
      ] as const) {
        expect(inside(towards(x, cx), towards(y, cy))).toBe(true);
      }
    }
  });

  it('every ring is on the coast and every buoy is in water deeper than the draft plus 2 m', () => {
    for (const [x, y] of bay.rings) expect(distanceToCoast(x, y)).toBeLessThan(0.01);
    const need = boatData.dimensions.draft + 2;
    for (const [x, y] of bay.buoys) expect(depthAt(x, y)).toBeGreaterThan(need);
    expect(bay.buoys.map(([x, y]) => depthAt(x, y))).toEqual([5, 15, 5]);
  });

  it('the land is one obstacle per rectangle, the same list each time', () => {
    expect(landObstacles()).toHaveLength(3);
    expect(landObstacles()).toBe(landObstacles());
    expect(landObstacles().every((o) => o.id === 'land' && o.partId === 'env_shore')).toBe(true);
  });
});

describe('M45 groundForces', () => {
  const resting: BoatState = initialBoat({ eastM: -1679.4, northM: 0, headingDeg: 270 });

  it('the points that can touch are the keel and the rudder', () => {
    expect(groundPoints().map((p) => [p.x, p.needM, p.part])).toEqual([
      [-1.4, 2.4, 'keel'],
      [-7.75, 1.95, 'stern'],
    ]);
  });

  it('a keel 0.2 m too deep at rest: 8,000 N, pushed 800 N towards deeper water, one hit on the keel', () => {
    const f = groundForces(resting);
    expect(Math.abs(f.surgeN + 800)).toBeLessThan(1);
    expect(Math.abs(f.sideN)).toBeLessThan(1);
    expect(Math.abs(f.momentNm)).toBeLessThan(10);
    expect(f.contacts).toHaveLength(1);
    expect(f.contacts?.[0]).toMatchObject({
      key: 'bottom:keel',
      obstacleId: 'bottom',
      partId: 'env_seabed',
      part: 'keel',
      fender: false,
    });
  });

  it('in deep water nothing touches', () => {
    const f = groundForces({ ...resting, eastM: -1500 });
    expect(f.contacts).toBeUndefined();
    expect(f.surgeN).toBe(0);
  });
});
