import type * as THREE from 'three';
import { boat } from '../../model/boat';
import { jibCorners, mainSailCorners, type SailCorners } from '../../model/rigGeometry';
import type { BoatMaterials } from './materials';
import { partMesh, triangles } from './parts';

/**
 * M1 sails: flat triangles with the boom on the centreline (θ = 0) and the jib clew on the
 * centreline (φ = 0), at the default unfurled fraction from controls.list. The shaped,
 * moving sails come with the solver in M2 (main) and M3 (jib).
 */
export function buildSails(materials: BoatMaterials): THREE.Object3D[] {
  const mainOut = controlDefault('ctl_main_furl') / 100;
  const jibOut = controlDefault('ctl_jib_furl') / 100;
  return [
    flatSail('sail_main', mainSailCorners(mainOut), materials),
    flatSail('sail_jib', jibCorners(jibOut), materials),
  ];
}

function controlDefault(id: string): number {
  return boat.controls.list.find((control) => control.id === id)?.default ?? 100;
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
