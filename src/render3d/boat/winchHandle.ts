import * as THREE from 'three';
import { boat } from '../../model/boat';
import type { HandlePose } from '../../model/handlePose';
import type { BoatMaterials } from './materials';
import { boxAt, cylinderBetween, smallPartMesh } from './parts';

export interface WinchHandleModel {
  group: THREE.Group;
  /** Hides the handle (null pose or `show` false), or puts it at `pose`. */
  set(pose: HandlePose | null, show: boolean): void;
}

/**
 * The one winch handle (M50, PHASE8_SPEC 8.4), built around its own origin (where the spigot
 * meets the arm) so moving it moves its hit area. The arm lies along local +x, the grip along
 * local +y.
 */
export function buildWinchHandle(materials: BoatMaterials): WinchHandleModel {
  const d = boat.modelDetail.winchHandle;
  const length = boat.realisticMode.winchHandle.lengthM;
  const body = smallPartMesh(
    'part_winch_handle',
    [
      cylinderBetween([0, 0, 0], [0, -d.spigotLength, 0], d.spigotDiameter / 2, 8),
      boxAt([length / 2, 0, 0], [length, d.armThickness, d.armWidth]),
    ],
    materials.dark,
    [[length / 2, 0, 0]],
  );
  const grip = smallPartMesh(
    'part_winch_handle',
    [cylinderBetween([length, 0, 0], [length, d.gripLength, 0], d.gripDiameter / 2, 10)],
    materials.block,
    [[length, d.gripLength / 2, 0]],
  );
  const group = new THREE.Group();
  group.name = 'winch_handle';
  group.add(body, grip);
  const parts = [group, body, grip];
  for (const part of parts) part.visible = false;
  const basis = new THREE.Matrix4();
  return {
    group,
    set(pose, show) {
      const visible = pose !== null && show;
      // picking.ts checks only a mesh's own `visible`, so the meshes are hidden too.
      for (const part of parts) part.visible = visible;
      if (!pose) return;
      const x = new THREE.Vector3(...pose.arm);
      const y = new THREE.Vector3(...pose.grip);
      basis.makeBasis(x, y, x.clone().cross(y));
      group.position.set(...pose.origin);
      group.quaternion.setFromRotationMatrix(basis);
      group.updateMatrixWorld(true);
    },
  };
}
