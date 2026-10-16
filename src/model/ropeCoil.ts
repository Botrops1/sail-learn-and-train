import { boat, type BoatData } from './boat';
import type { Vec3 } from './vec3';

/** Height of the dark floor plate of a rope tail box (drawn in `cockpitHardware.ts`). */
const FLOOR_PLATE_M = 0.004;

/**
 * M34: a flat coil of spare rope lying on a rope tail box's floor: one polyline per layer,
 * centred on the box. Each layer is a spiral from `innerRadius` out to `outerRadius` over
 * `turns` turns; odd layers are wound the other way, so two layers cross instead of lying exactly
 * over each other. Drawing only (PHASE6_SPEC 10.4).
 */
export function coilLayers(
  box: { x: number; z: number },
  pointsPerTurn: number,
  data: BoatData = boat,
): Vec3[][] {
  const coil = data.modelDetail.ropeBin.coil;
  const steps = Math.round(coil.turns * pointsPerTurn);
  const totalAngle = 2 * Math.PI * coil.turns;
  const layers: Vec3[][] = [];
  for (let k = 0; k < coil.layers; k += 1) {
    const y =
      data.deck.cockpit.coamingTopY + FLOOR_PLATE_M + coil.ropeRadius + k * 2 * coil.ropeRadius;
    const handed = k % 2 === 0 ? 1 : -1;
    const points: Vec3[] = [];
    for (let i = 0; i <= steps; i += 1) {
      const angle = (totalAngle * i) / steps;
      const r = coil.innerRadius + ((coil.outerRadius - coil.innerRadius) * angle) / totalAngle;
      points.push([box.x + r * Math.cos(angle), y, box.z + handed * r * Math.sin(angle)]);
    }
    layers.push(points);
  }
  return layers;
}
