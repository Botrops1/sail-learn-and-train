import * as THREE from 'three';
import type { AppState } from '../app/store';
import { area, type AreaData } from '../model/area';
import { requirePartId } from '../model/registry';
import { buoyOffsets } from '../model/windOnWater';
import { SCENE } from './sceneConfig';

export interface Marks {
  /** Added to the world group, not the water group: the buoys must not step with the water. */
  object: THREE.Group;
  /**
   * Puts each buoy where it is relative to the boat, floating on the drawn water surface;
   * `heightAt` is the water's `heightAt`.
   */
  update(state: AppState, heightAt: (dEastM: number, dNorthM: number) => number): void;
  /** The group of a buoy by its id (`N`, `E`, `S`, `W`). */
  buoyObject(id: string): THREE.Object3D | undefined;
}

interface Buoy {
  id: string;
  group: THREE.Group;
  topmark: THREE.Group;
  meshes: THREE.Mesh[];
}

/**
 * The practice buoys (PHASE3_SPEC 8.4): a yellow sphere with a pole and an X-shaped topmark, at
 * the fixed places of the area's `marks` file. The boat passes through them. The world group's
 * local x is north and z is east, so a buoy sits at (ΔN, y, ΔE) from the boat.
 */
export function buildMarks(areaData: AreaData = area): Marks {
  const m = SCENE.marks;
  const partId = requirePartId('env_buoy');
  const material = new THREE.MeshStandardMaterial({ color: m.color, roughness: m.roughness });
  const object = new THREE.Group();
  object.name = 'marks';
  const sphereGeometry = new THREE.SphereGeometry(m.sphereRadiusM, 16, 12);
  const poleGeometry = new THREE.CylinderGeometry(
    m.poleRadiusM,
    m.poleRadiusM,
    m.poleTopY - m.poleBottomY,
  );
  const barGeometry = new THREE.BoxGeometry(
    m.topmarkLengthM,
    m.topmarkThicknessM,
    m.topmarkThicknessM,
  );

  const buoys: Buoy[] = areaData.marks.buoys.map((spec) => {
    const group = new THREE.Group();
    group.name = `buoy_${spec.id}`;
    const sphere = new THREE.Mesh(sphereGeometry, material);
    sphere.userData = { partId, hitPoints: [[0, 0, 0]] };
    const pole = new THREE.Mesh(poleGeometry, material);
    pole.position.y = (m.poleBottomY + m.poleTopY) / 2;
    pole.userData = { partId };
    const topmark = new THREE.Group();
    topmark.name = 'topmark';
    topmark.position.y = m.poleTopY;
    const bars = [Math.PI / 4, -Math.PI / 4].map((angle) => {
      const bar = new THREE.Mesh(barGeometry, material);
      bar.rotation.z = angle;
      bar.userData = { partId };
      return bar;
    });
    topmark.add(...bars);
    group.add(sphere, pole, topmark);
    object.add(group);
    return { id: spec.id, group, topmark, meshes: [sphere, pole, ...bars] };
  });

  return {
    object,
    update(state, heightAt) {
      for (const offset of buoyOffsets(state.boat, areaData)) {
        const buoy = buoys.find((candidate) => candidate.id === offset.id);
        if (!buoy) continue;
        const distance = Math.hypot(offset.dEastM, offset.dNorthM);
        // The raycaster ignores a parent's visibility, so each mesh is hidden itself.
        const visible = distance <= m.maxDrawM;
        for (const mesh of buoy.meshes) mesh.visible = visible;
        buoy.group.position.set(
          offset.dNorthM,
          heightAt(offset.dEastM, offset.dNorthM) + m.floatY,
          offset.dEastM,
        );
        // The X faces the boat: its arms lie across the line of sight.
        buoy.topmark.rotation.y = Math.atan2(offset.dNorthM, offset.dEastM);
      }
    },
    buoyObject(id) {
      return buoys.find((buoy) => buoy.id === id)?.group;
    },
  };
}
