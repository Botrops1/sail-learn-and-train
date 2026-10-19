import * as THREE from 'three';
import type { AppState } from '../app/store';
import { area, type AreaData } from '../model/area';
import { distanceToRect, type Rect } from '../model/marina';
import { requirePartId } from '../model/registry';
import { SCENE } from './sceneConfig';

export interface Bay {
  /** Added to the world group: its position follows the boat so meshes sit at map positions (as the marina). */
  object: THREE.Group;
  /**
   * Moves the group to the boat, floats the buoys on the drawn water (`heightAt` is the water's,
   * relative to the boat) and hides the parts that are far away.
   */
  update(state: AppState, heightAt: (dEastM: number, dNorthM: number) => number): void;
}

/**
 * The shore rings and the mooring buoys of the bay in 3D (M45, PHASE7_SPEC 11.5). A ring is a
 * post with a torus on top; a buoy a white sphere with a small ring on top, floating. Each mesh is
 * built at its absolute map position (x = north, z = east) and hides itself when far: the
 * raycaster ignores a parent's visibility.
 */
export function buildBay(areaData: AreaData = area): Bay {
  const c = SCENE.bay;
  const bay = areaData.bay;
  const object = new THREE.Group();
  object.name = 'bay';
  const ringId = requirePartId('env_shore_ring');
  const buoyId = requirePartId('env_mooring_buoy');
  const ringMaterial = new THREE.MeshStandardMaterial({
    color: c.ringColour,
    roughness: 0.5,
    metalness: 0.4,
  });
  const buoyMaterial = new THREE.MeshStandardMaterial({ color: c.buoyColour, roughness: 0.6 });
  const meshes: THREE.Mesh[] = [];
  const add = (mesh: THREE.Mesh, partId: string, parent: THREE.Object3D = object) => {
    mesh.userData = { partId };
    parent.add(mesh);
    meshes.push(mesh);
    return mesh;
  };

  const postGeometry = new THREE.CylinderGeometry(c.postRadiusM, c.postRadiusM, bay.ringHeightM, 8);
  const ringGeometry = new THREE.TorusGeometry(c.ringRadiusM, c.ringTubeM, 8, 16);
  for (const [east, north] of bay.rings) {
    const post = add(new THREE.Mesh(postGeometry, ringMaterial), ringId);
    post.position.set(north, bay.ringHeightM / 2, east);
    const ring = add(new THREE.Mesh(ringGeometry, ringMaterial), ringId);
    ring.position.set(north, bay.ringHeightM + c.ringRadiusM, east);
    // Standing on the post, facing along the shore (the rings are tapped from the water).
    ring.rotation.y = Math.PI / 2;
  }

  const buoyGeometry = new THREE.SphereGeometry(c.buoyRadiusM, 16, 12);
  const buoyRingGeometry = new THREE.TorusGeometry(c.buoyRingRadiusM, c.buoyRingTubeM, 8, 12);
  const buoys = bay.buoys.map(([east, north]) => {
    const group = new THREE.Group();
    const sphere = add(new THREE.Mesh(buoyGeometry, buoyMaterial), buoyId, group);
    sphere.userData = { partId: buoyId, hitPoints: [[0, 0, 0]] };
    const ring = add(new THREE.Mesh(buoyRingGeometry, ringMaterial), buoyId, group);
    ring.position.y = c.buoyRadiusM + c.buoyRingRadiusM;
    object.add(group);
    return { east, north, group };
  });

  const xs = [...bay.rings, ...bay.buoys].map((p) => p[0]);
  const ys = [...bay.rings, ...bay.buoys].map((p) => p[1]);
  const bounds: Rect = {
    west: Math.min(...xs),
    east: Math.max(...xs),
    south: Math.min(...ys),
    north: Math.max(...ys),
  };
  let shown = true;

  return {
    object,
    update(state, heightAt) {
      const { boat } = state;
      object.position.set(-boat.northM, 0, -boat.eastM);
      for (const buoy of buoys) {
        buoy.group.position.set(
          buoy.north,
          heightAt(buoy.east - boat.eastM, buoy.north - boat.northM) + c.buoyFloatY,
          buoy.east,
        );
      }
      const near = distanceToRect(bounds, boat.eastM, boat.northM) <= c.maxDrawM;
      if (near !== shown) {
        shown = near;
        for (const mesh of meshes) mesh.visible = near;
      }
    },
  };
}
