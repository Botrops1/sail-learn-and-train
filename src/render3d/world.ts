import * as THREE from 'three';
import { DEG } from '../model/angles';
import { waterShift } from '../model/mapFrame';
import { SCENE } from './sceneConfig';

/**
 * The world group (PHASE2_SPEC 6.6): the water and its grid. The scene stays centred on the boat;
 * the world moves under her. Local x is north and z is east, so turning the group by the heading
 * about y puts the map in the boat's frame. The grid streams past at the boat's speed.
 */
export interface World {
  group: THREE.Group;
  /**
   * Puts the world where the boat is. Returns the map position of the water plane's centre, so
   * the ripples can stay fixed on the map as the plane steps along.
   */
  update(eastM: number, northM: number, headingDeg: number): { northM: number; eastM: number };
}

export function createWorld(water: THREE.Object3D): World {
  const group = new THREE.Group();
  group.name = 'world';
  group.add(water);
  return {
    group,
    update(eastM, northM, headingDeg) {
      group.rotation.y = headingDeg * DEG;
      const shift = waterShift(eastM, northM, SCENE.grid.cellSize);
      water.position.x = shift.x;
      water.position.z = shift.z;
      return { northM: shift.centreNorthM, eastM: shift.centreEastM };
    },
  };
}
