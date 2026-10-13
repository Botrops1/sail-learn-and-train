import * as THREE from 'three';
import { DEG } from '../model/angles';
import { waterShift } from '../model/mapFrame';
import { SCENE } from './sceneConfig';

/**
 * The world group (PHASE2_SPEC 6.6): the water and its grid. The scene stays centred on the boat;
 * the world moves under her. Local x is north and z is east, so turning the group by the heading
 * about y puts the map in the boat's frame. The water steps along the map in whole `stepM` (M14),
 * so every vertex of the wave mesh stays on a fixed map point.
 */
export type WaterShift = ReturnType<typeof waterShift>;

export interface World {
  group: THREE.Group;
  /**
   * Puts the world where the boat is. Returns where the water group sits: its offset `x`
   * (north) and `z` (east) from the boat and the map position of its centre, so the ripples and
   * the waves can stay fixed on the map as the group steps along.
   */
  update(eastM: number, northM: number, headingDeg: number): WaterShift;
}

export function createWorld(water: THREE.Object3D): World {
  const group = new THREE.Group();
  group.name = 'world';
  group.add(water);
  return {
    group,
    update(eastM, northM, headingDeg) {
      group.rotation.y = headingDeg * DEG;
      const shift = waterShift(eastM, northM, SCENE.water.stepM);
      water.position.x = shift.x;
      water.position.z = shift.z;
      return shift;
    },
  };
}
