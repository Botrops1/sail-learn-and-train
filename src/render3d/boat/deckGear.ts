import * as THREE from 'three';
import { boat } from '../../model/boat';
import { halfBeamAt, sheerAt } from '../../model/hullShape';
import type { Vec3 } from '../../model/vec3';
import type { BoatMaterials } from './materials';
import { cylinderBetween, partMesh, type PickSegment } from './parts';

/** Sprayhood and lifelines (PHASE1_SPEC 6.1; sizes in modelDetail are estimates from photos). */
export function buildDeckGear(materials: BoatMaterials): THREE.Object3D[] {
  return [buildSprayhood(materials), buildLifelines(materials)];
}

/**
 * Sprayhood: a fabric shelter on the aft end of the coachroof. Side profile rises in a curve
 * from its front edge to full height and drops straight down at the aft edge; the bevel rounds
 * its sides.
 */
function buildSprayhood(materials: BoatMaterials): THREE.Object3D {
  const hood = boat.modelDetail.sprayhood;
  const base = boat.deck.coachroof.topY;
  const top = base + hood.height;
  const shape = new THREE.Shape();
  shape.moveTo(hood.frontX, base);
  shape.quadraticCurveTo(hood.frontX, top, hood.aftX, top);
  shape.lineTo(hood.aftX, base);
  shape.closePath();
  const bevel = hood.height / 6;
  const depth = 2 * hood.halfWidth - 2 * bevel;
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 3,
    curveSegments: 12,
  });
  geometry.translate(0, 0, -depth / 2);
  const mid = (hood.frontX + hood.aftX) / 2;
  return partMesh('fit_sprayhood', [geometry], materials.fabric, [
    [
      [hood.aftX, top, -hood.halfWidth],
      [hood.aftX, top, hood.halfWidth],
    ],
    [
      [mid, top, 0],
      [hood.aftX, base, 0],
    ],
  ]);
}

/**
 * Stanchions along both deck edges, evenly spaced from fwdX to aftX, carrying an upper and a
 * lower wire. On the reference boat the jib furling line runs along the stanchion bases.
 */
function buildLifelines(materials: BoatMaterials): THREE.Object3D {
  const l = boat.modelDetail.lifelines;
  const count = Math.max(2, Math.round((l.fwdX - l.aftX) / l.stanchionSpacing) + 1);
  const geometries: THREE.BufferGeometry[] = [];
  const segments: PickSegment[] = [];
  for (const side of [1, -1]) {
    const bases: Vec3[] = Array.from({ length: count }, (_, i) => {
      const x = l.aftX + ((l.fwdX - l.aftX) * i) / (count - 1);
      return [x, sheerAt(x), side * (halfBeamAt(x) - l.inset)];
    });
    const at = (p: Vec3, height: number): Vec3 => [p[0], p[1] + height, p[2]];
    bases.forEach((basePoint, i) => {
      const topPoint = at(basePoint, l.height);
      geometries.push(cylinderBetween(basePoint, topPoint, l.stanchionDiameter / 2, 6));
      segments.push([basePoint, topPoint]);
      const next = bases[i + 1];
      if (!next) return;
      for (const height of [l.height, l.lowerWireHeight]) {
        const a = at(basePoint, height);
        const b = at(next, height);
        geometries.push(cylinderBetween(a, b, l.wireRadius, 5));
        segments.push([a, b]);
      }
    });
  }
  return partMesh('part_lifelines', geometries, materials.wire, segments);
}
