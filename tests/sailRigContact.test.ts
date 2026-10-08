import { describe, expect, it } from 'vitest';
import { defaultControls, type Controls } from '../src/model/controls';
import {
  shroudSegments,
  spreaderSegments,
  spreaderTip,
  type RigSegment,
} from '../src/model/rigGeometry';
import { mainSailGrid, mainSailInputFor, type SailGrid } from '../src/model/sailShape';
import { boat } from '../src/model/boat';
import { initialRig } from '../src/model/sim';
import { add, cross, dot, scale, sub, type Vec3 } from '../src/model/vec3';
import { closestPointOnTriangle, sailTriangles } from './geometry';

/** Every spreader and shroud on both sides, as drawn. */
const RIG: RigSegment[] = ([1, -1] as const).flatMap((side) => [
  ...spreaderSegments(side),
  ...shroudSegments(side),
]);

/** Sample spacing along each wire, metres. */
const STEP = 0.01;

/**
 * Smallest distance between the sail surface and the axis of a spreader or shroud, minus its
 * drawn radius (negative = the sail cuts into it), plus where that happens.
 */
function worstClearance(grid: SailGrid): { gap: number; where: string } {
  const triangles = sailTriangles(grid);
  let worst = { gap: Infinity, where: '' };
  for (const [index, wire] of RIG.entries()) {
    const along = sub(wire.b, wire.a);
    const length = Math.hypot(...along);
    const n = Math.ceil(length / STEP);
    for (let k = 0; k <= n; k += 1) {
      const p = add(wire.a, scale(along, k / n));
      for (const triangle of triangles) {
        // Quick reject: the triangle's bounding sphere is far away.
        if (Math.hypot(...sub(p, triangle.centre)) - triangle.radius > worst.gap + wire.radius)
          continue;
        const q = closestPointOnTriangle(p, triangle.a, triangle.b, triangle.c);
        const gap = Math.hypot(...sub(p, q)) - wire.radius;
        if (gap < worst.gap) {
          worst = { gap, where: `wire ${index} at ${p.map((x) => x.toFixed(2)).join(', ')}` };
        }
      }
    }
  }
  return worst;
}

/** True if segment a–b passes through the triangle (Möller–Trumbore on the segment). */
function crosses(a: Vec3, b: Vec3, t0: Vec3, t1: Vec3, t2: Vec3): boolean {
  const direction = sub(b, a);
  const e1 = sub(t1, t0);
  const e2 = sub(t2, t0);
  const h = cross(direction, e2);
  const det = dot(e1, h);
  if (Math.abs(det) < 1e-12) return false;
  const s = sub(a, t0);
  const u = dot(s, h) / det;
  if (u < 0 || u > 1) return false;
  const q = cross(s, e1);
  const v = dot(direction, q) / det;
  if (v < 0 || u + v > 1) return false;
  const t = dot(e2, q) / det;
  return t >= 0 && t <= 1;
}

function settledGrid(values: Partial<Controls>, timeS = 0): SailGrid {
  const controls = { ...defaultControls(), ...values };
  const rig = { ...initialRig(controls), timeS };
  return mainSailGrid(mainSailInputFor(rig, controls));
}

describe('M3b: the eased mainsail presses against the rig instead of passing through it', () => {
  const cases: Partial<Controls>[] = [];
  for (const wd of [175, -175, 150, -150, 120, -120, 90, -90, 180]) {
    for (const vang of [0, 50, 100]) {
      for (const ws of [4, 12, 25]) {
        cases.push({
          ctl_wind_dir: wd,
          ctl_wind_speed: ws,
          ctl_mainsheet: 100,
          ctl_vang: vang,
        });
      }
    }
  }
  // Partly furled, and flapping (sheet eased with the wind further forward).
  for (const wd of [175, -175]) {
    for (const mf of [80, 60, 40]) cases.push({ ctl_wind_dir: wd, ctl_mainsheet: 100, ctl_main_furl: mf });
  }
  for (const wd of [100, -100, 75, -75]) cases.push({ ctl_wind_dir: wd, ctl_mainsheet: 100, ctl_wind_speed: 25 });

  it('full ease, wind from both sides: no spreader or shroud crosses the sail mesh', () => {
    for (const values of cases) {
      for (const timeS of [0, 0.31, 0.77]) {
        const grid = settledGrid(values, timeS);
        sailTriangles(grid).forEach((triangle, t) => {
          RIG.forEach((wire, w) => {
            expect(
              crosses(wire.a, wire.b, triangle.a, triangle.b, triangle.c),
              `${JSON.stringify({ values, timeS })} triangle ${t} wire ${w}`,
            ).toBe(false);
          });
        });
      }
    }
  }, 120_000);

  it('full ease, wind from both sides: the sail stays outside every spreader and shroud as drawn', () => {
    for (const values of cases) {
      const grid = settledGrid(values, 0.31);
      const { gap, where } = worstClearance(grid);
      expect(gap, `${JSON.stringify(values)} ${where}`).toBeGreaterThanOrEqual(0);
    }
  }, 120_000);

  it('on a run the sail actually touches the rig: it is bent around a spreader tip, not kept far away', () => {
    for (const wd of [175, -175]) {
      const grid = settledGrid({ ctl_wind_dir: wd, ctl_mainsheet: 100 });
      const { gap } = worstClearance(grid);
      expect(gap, `wd ${wd}`).toBeLessThan(0.06);
      // The lower spreader tip on the boom's side is where the row through it bends.
      const side = wd > 0 ? -1 : 1;
      const tip = spreaderTip(boat.rig.spreaders.sets[0] as (typeof boat.rig.spreaders.sets)[0], side);
      const nearest = Math.min(...grid.points.map((p) => Math.hypot(...sub(p, tip))));
      expect(nearest, `wd ${wd}`).toBeLessThan(0.15);
    }
  });

  it('the boom still reaches its 72° limit on a run', () => {
    for (const wd of [175, -175]) {
      const controls = { ...defaultControls(), ctl_wind_dir: wd, ctl_mainsheet: 100 };
      expect(Math.abs(initialRig(controls).theta.value)).toBeCloseTo(boat.rig.boom.maxSwingDeg, 6);
    }
  });
});
