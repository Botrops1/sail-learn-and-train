import type { SailGrid } from '../src/model/sailShape';
import { add, dot, scale, sub, type Vec3 } from '../src/model/vec3';

/** Geometry helpers shared by the M3b clearance tests. */

export interface Triangle {
  a: Vec3;
  b: Vec3;
  c: Vec3;
  centre: Vec3;
  /** Radius of a sphere around `centre` that holds the triangle. */
  radius: number;
}

function triangle(a: Vec3, b: Vec3, c: Vec3): Triangle {
  const centre = scale(add(add(a, b), c), 1 / 3);
  const radius = Math.max(
    Math.hypot(...sub(a, centre)),
    Math.hypot(...sub(b, centre)),
    Math.hypot(...sub(c, centre)),
  );
  return { a, b, c, centre, radius };
}

/** The sail grid's triangles, split the same way as the 3D mesh (sailMesh.ts). */
export function sailTriangles(grid: SailGrid): Triangle[] {
  const cols = grid.columns + 1;
  const at = (k: number) => grid.points[k] as Vec3;
  const out: Triangle[] = [];
  for (let i = 0; i < grid.rows; i += 1) {
    for (let j = 0; j < grid.columns; j += 1) {
      const a = i * cols + j;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      out.push(triangle(at(a), at(b), at(c)), triangle(at(b), at(d), at(c)));
    }
  }
  return out;
}

/** Closest point to p on triangle abc (Ericson, Real-Time Collision Detection, 5.1.5). */
export function closestPointOnTriangle(p: Vec3, a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const ab = sub(b, a);
  const ac = sub(c, a);
  const ap = sub(p, a);
  const d1 = dot(ab, ap);
  const d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return a;
  const bp = sub(p, b);
  const d3 = dot(ab, bp);
  const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return add(a, scale(ab, d1 / (d1 - d3)));
  const cp = sub(p, c);
  const d5 = dot(ab, cp);
  const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return add(a, scale(ac, d2 / (d2 - d6)));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    return add(b, scale(sub(c, b), (d4 - d3) / (d4 - d3 + (d5 - d6))));
  }
  const denom = 1 / (va + vb + vc);
  return add(a, add(scale(ab, vb * denom), scale(ac, vc * denom)));
}
