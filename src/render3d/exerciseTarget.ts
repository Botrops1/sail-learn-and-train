import * as THREE from 'three';
import { shownTarget } from '../app/exerciseRun';
import type { AppState } from '../app/store';
import { requirePartId } from '../model/registry';
import type { ResolvedTarget } from '../model/exercises';
import { SCENE } from './sceneConfig';

export interface ExerciseTargetView {
  /** Added to the world group; positioned at the boat each frame like the marina. */
  object: THREE.Group;
  update(state: AppState): void;
}

function keyOf(target: ResolvedTarget): string {
  return target.shape === 'circle'
    ? `c|${target.eastM}|${target.northM}|${target.radiusM}`
    : `r|${target.rect.west}|${target.rect.east}|${target.rect.south}|${target.rect.north}`;
}

/**
 * The magenta outline of the step's target (PHASE10_SPEC 16.5): a flat ring for a circle, four flat
 * strips for a rectangle, just above the still water. Hidden when no step shows one. The world
 * group's local x is north and z is east (as marina.ts).
 */
export function buildExerciseTarget(): ExerciseTargetView {
  const c = SCENE.exerciseTarget;
  const object = new THREE.Group();
  object.name = 'exerciseTarget';
  object.visible = false;
  const partId = requirePartId('env_exercise_target');
  const material = new THREE.MeshBasicMaterial({
    color: c.colour,
    transparent: true,
    opacity: c.opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  let shownKey = '';

  const flat = (mesh: THREE.Mesh) => {
    mesh.userData.partId = partId;
    object.add(mesh);
  };
  const strip = (x: number, z: number, lengthX: number, lengthZ: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(lengthX, 0.02, lengthZ), material);
    mesh.position.set(x, c.aboveM, z);
    flat(mesh);
  };
  const build = (target: ResolvedTarget) => {
    for (const child of [...object.children]) {
      object.remove(child);
      (child as THREE.Mesh).geometry.dispose();
    }
    if (target.shape === 'circle') {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(
          Math.max(0.01, target.radiusM - c.lineM / 2),
          target.radiusM + c.lineM / 2,
          64,
        ),
        material,
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(target.northM, c.aboveM, target.eastM);
      flat(ring);
      return;
    }
    const { west, east, south, north } = target.rect;
    const w = c.lineM;
    const cx = (north + south) / 2;
    const cz = (east + west) / 2;
    strip(north, cz, w, east - west + w);
    strip(south, cz, w, east - west + w);
    strip(cx, west, north - south + w, w);
    strip(cx, east, north - south + w, w);
  };

  return {
    object,
    update(state) {
      const target = shownTarget(state);
      if (target === null) {
        object.visible = false;
        return;
      }
      const key = keyOf(target);
      if (key !== shownKey) {
        build(target);
        shownKey = key;
      }
      object.visible = true;
      object.position.set(-state.boat.northM, 0, -state.boat.eastM);
    },
  };
}
