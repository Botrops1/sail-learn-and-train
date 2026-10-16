import * as THREE from 'three';
import { boat } from '../../model/boat';
import { DECK_EPS } from '../../model/deckVolumes';
import { cleatPlaces, fairleadPlaces, type FittingPlace } from '../../model/mooringFittings';
import type { Detail } from '../../model/settings';
import type { Vec3 } from '../../model/vec3';
import type { BoatMaterials } from './materials';
import { boxAt, cylinderBetween, extrudeProfile, smallPartMesh } from './parts';

/**
 * Mooring cleats and fairleads on the toerail (M32, PHASE6_SPEC 8.3). Static: nothing moves.
 * Each fitting is built in a local frame (u along its long axis = x, v up = y, w across = z),
 * turned about y so u lies along the toerail, and sunk DECK_EPS into the toerail's top.
 */
export function buildMooringFittings(
  materials: BoatMaterials,
  detail: Detail = 'high',
): THREE.Object3D[] {
  return [buildCleats(materials, detail), buildFairleads(materials)];
}

/** Turns a local-frame geometry onto its place. */
function place(geometry: THREE.BufferGeometry, at: FittingPlace): THREE.BufferGeometry {
  geometry.rotateY(Math.atan2(-at.along[2], at.along[0]));
  geometry.translate(at.base[0], at.base[1] - DECK_EPS, at.base[2]);
  return geometry;
}

function buildCleats(materials: BoatMaterials, detail: Detail): THREE.Object3D {
  const c = boat.deckFittings.cleats;
  const radial = detail === 'high' ? 10 : 6;
  const v0 = c.baseThickness + c.legHeight;
  const horn = [
    [-c.length / 2, v0 + c.hornHeight / 2],
    [-c.length / 2 + c.hornHeight / 2, v0],
    [c.length / 2 - c.hornHeight / 2, v0],
    [c.length / 2, v0 + c.hornHeight / 2],
    [c.length / 2, v0 + c.hornHeight],
    [-c.length / 2, v0 + c.hornHeight],
  ] as const;
  const places = cleatPlaces();
  const geometries = places.flatMap((at) =>
    [
      boxAt([0, c.baseThickness / 2, 0], [c.baseLength, c.baseThickness, c.baseWidth]),
      ...[-1, 1].map((end) =>
        cylinderBetween(
          [(end * c.legSpacing) / 2, c.baseThickness, 0],
          [(end * c.legSpacing) / 2, v0, 0],
          c.legRadius,
          radial,
        ),
      ),
      extrudeProfile(horn, c.hornWidth),
    ].map((g) => place(g, at)),
  );
  const top = v0 + c.hornHeight - DECK_EPS;
  const hits: Vec3[] = places.map((at) => [at.base[0], at.base[1] + top, at.base[2]]);
  return smallPartMesh('fit_mooring_cleat', geometries, materials.chrome, hits);
}

function buildFairleads(materials: BoatMaterials): THREE.Object3D {
  const f = boat.deckFittings.fairleads;
  const places = fairleadPlaces();
  const jawOffset = (f.length - f.jawThickness) / 2;
  const geometries = places.flatMap((at) =>
    [
      boxAt([0, f.baseThickness / 2, 0], [f.length, f.baseThickness, f.width]),
      ...[-1, 1].map((end) =>
        boxAt(
          [end * jawOffset, f.baseThickness + f.jawHeight / 2, 0],
          [f.jawThickness, f.jawHeight, f.width],
        ),
      ),
    ].map((g) => place(g, at)),
  );
  const top = f.baseThickness + f.jawHeight - DECK_EPS;
  const hits: Vec3[] = places.map((at) => [at.base[0], at.base[1] + top, at.base[2]]);
  return smallPartMesh('fit_fairlead', geometries, materials.chrome, hits);
}
