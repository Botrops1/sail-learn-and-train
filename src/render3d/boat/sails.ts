import type * as THREE from 'three';
import { boat } from '../../model/boat';
import { jibCorners, type SailCorners } from '../../model/rigGeometry';
import type { BoatMaterials } from './materials';
import { partMesh, triangles } from './parts';

/**
 * The jib, still a flat triangle on the centreline (φ = 0) at the default unfurled fraction.
 * Its solver comes in M3. The mainsail is shaped every frame (mainSail.ts).
 */
export function buildJib(materials: BoatMaterials): THREE.Object3D {
  const jibOut = boat.controls.list.find((control) => control.id === 'ctl_jib_furl');
  return flatSail('sail_jib', jibCorners((jibOut?.default ?? 100) / 100), materials);
}

function flatSail(id: string, corners: SailCorners, materials: BoatMaterials): THREE.Object3D {
  const mesh = partMesh(
    id,
    [triangles([...corners.tack, ...corners.head, ...corners.clew])],
    materials.sail,
    [
      [corners.tack, corners.head],
      [corners.head, corners.clew],
      [corners.clew, corners.tack],
    ],
  );
  // Draw sails after the opaque boat so the see-through edge blends correctly.
  mesh.renderOrder = 1;
  return mesh;
}
