import * as THREE from 'three';
import { boat } from '../model/boat';
import { requirePartId } from '../model/registry';
import type { BoatMaterials } from './boat/materials';
import { cylinderBetween, smallPartMesh } from './boat/parts';
import { SCENE } from './sceneConfig';

const DEG = Math.PI / 180;

/**
 * Unit vector towards where the wind comes from, in the boat frame (x forward, z starboard):
 * 0° = from ahead, +90° = from starboard (PHASE1_SPEC 4).
 */
export function windFromVector(windFromDeg: number): THREE.Vector3 {
  const a = windFromDeg * DEG;
  return new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
}

export interface WindStreaks {
  object: THREE.LineSegments;
  update(windFromDeg: number, windSpeedKn: number, timeS: number): void;
}

/**
 * Light streaks drifting across the scene with the test wind (PHASE1_SPEC 6.1), faster and
 * longer in more wind, none in a calm. Thin lines, so they never hide the boat. Not tappable.
 */
export function buildWindStreaks(random: () => number = Math.random): WindStreaks {
  const w = SCENE.wind;
  const seeds = Array.from({ length: w.streakCount }, () => ({
    along: (random() - 0.5) * w.areaSize,
    across: (random() - 0.5) * w.areaSize,
    height: w.minHeight + random() * (w.maxHeight - w.minHeight),
  }));
  const positions = new Float32Array(w.streakCount * 2 * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color: w.color,
    transparent: true,
    opacity: w.opacity,
    depthWrite: false,
  });
  const object = new THREE.LineSegments(geometry, material);
  object.userData.partId = requirePartId('env_wind');
  object.frustumCulled = false;

  const blowing = new THREE.Vector3();
  const across = new THREE.Vector3();
  return {
    object,
    update(windFromDeg, windSpeedKn, timeS) {
      object.visible = windSpeedKn >= boat.visual.solver.minWindKn;
      if (!object.visible) return;
      blowing.copy(windFromVector(windFromDeg)).negate();
      across.set(-blowing.z, 0, blowing.x);
      const travel = timeS * windSpeedKn * w.metresPerSecondPerKnot;
      const length = w.streakBaseLength + w.streakLengthPerKnot * windSpeedKn;
      seeds.forEach((seed, i) => {
        const s = seed.along + travel;
        const along = s - w.areaSize * Math.floor(s / w.areaSize + 0.5);
        const x = blowing.x * along + across.x * seed.across;
        const z = blowing.z * along + across.z * seed.across;
        positions.set(
          [x, seed.height, z, x + blowing.x * length, seed.height, z + blowing.z * length],
          i * 6,
        );
      });
      geometry.getAttribute('position').needsUpdate = true;
    },
  };
}

export interface Windex {
  pivot: THREE.Group;
  update(windFromDeg: number): void;
}

/** Masthead wind indicator: an arrow on top of the mast pointing to where the wind comes from. */
export function buildWindex(materials: BoatMaterials): Windex {
  const { mast } = boat.rig;
  const detail = boat.modelDetail;
  const length = detail.windexLength;
  const radius = boat.modelDetail.wireRenderRadius;
  const shaft = cylinderBetween([-length / 2, 0, 0], [length / 4, 0, 0], radius, 6);
  const head = new THREE.ConeGeometry(radius * 3, length / 4, 8);
  head.rotateZ(-Math.PI / 2);
  head.translate((3 * length) / 8, 0, 0);
  const fin = new THREE.BoxGeometry(length / 5, length / 5, radius / 2);
  fin.translate(-length / 2 + length / 10, 0, 0);
  const post = cylinderBetween([0, -detail.windexHeightAboveMast, 0], [0, 0, 0], radius, 6);
  const mesh = smallPartMesh('part_windex', [shaft, head, fin, post], materials.dark, [[0, 0, 0]]);
  const pivot = new THREE.Group();
  pivot.name = 'windexPivot';
  pivot.position.set(mast.x, mast.topY + detail.windexHeightAboveMast, 0);
  pivot.add(mesh);
  return {
    pivot,
    update(windFromDeg) {
      // A turn around y by φ points +x at (cos φ, 0, −sin φ); the wind comes from (cos a, 0, sin a).
      pivot.rotation.set(0, -windFromDeg * DEG, 0);
    },
  };
}
