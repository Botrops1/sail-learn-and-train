import * as THREE from 'three';
import { mpsToKn } from '../model/angles';
import { boat } from '../model/boat';
import { mapToBoat } from '../model/mapFrame';
import type { BoatState } from '../model/motion';
import { requirePartId } from '../model/registry';
import { SCENE } from './sceneConfig';

const DEG = Math.PI / 180;

interface WakePoint {
  eastM: number;
  northM: number;
  timeS: number;
}

/**
 * The wake (PHASE2_SPEC 6.6, `env_wake`): a flat white ribbon behind the transom that widens and
 * fades with age. A ring of map positions of the transom's centre, one every `sampleS` of
 * simulation time; each frame they are put in the boat's frame. Not drawn when held still or
 * very slow.
 */
export interface Wake {
  object: THREE.Mesh;
  update(state: { boat: BoatState }, timeS: number): void;
}

export function buildWake(): Wake {
  const w = SCENE.wake;
  const points: WakePoint[] = [];
  const vertexCount = (w.maxPoints + 1) * 2;
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 4);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
  const index: number[] = [];
  for (let i = 0; i < w.maxPoints; i += 1) {
    const a = i * 2;
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  geometry.setIndex(index);
  const material = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const object = new THREE.Mesh(geometry, material);
  object.userData.partId = requirePartId('env_wake');
  object.frustumCulled = false;
  object.visible = false;

  const transomX = boat.hull.transomX;
  return {
    object,
    update({ boat: state }, timeS) {
      const sailing = state.mode === 'sailing';
      const knots = Math.abs(mpsToKn(state.speedMps));
      if (!sailing) points.length = 0;
      object.visible = false;
      if (!sailing) return;

      const h = state.headingDeg * DEG;
      const here: WakePoint = {
        eastM: state.eastM + transomX * Math.sin(h),
        northM: state.northM + transomX * Math.cos(h),
        timeS,
      };
      const last = points[points.length - 1];
      // A jump (Reset, a link) or time running backwards starts a new wake.
      if (
        last &&
        (timeS < last.timeS ||
          Math.hypot(here.eastM - last.eastM, here.northM - last.northM) > w.restartDistanceM)
      ) {
        points.length = 0;
      }
      const newest = points[points.length - 1];
      if (!newest || timeS - newest.timeS >= w.sampleS) points.push(here);
      while (points.length > w.maxPoints || (points[0] && timeS - points[0].timeS > w.lifeS)) {
        points.shift();
      }
      if (knots < w.minKn || points.length < 1) return;

      // Newest first, starting at the transom itself so the ribbon joins the boat.
      const chain = [here, ...[...points].reverse()];
      const strength = Math.min(1, knots / w.fullOpacityKn);
      const local = chain.map((p) =>
        mapToBoat(p.eastM - state.eastM, p.northM - state.northM, state.headingDeg),
      );
      chain.forEach((p, i) => {
        const age = Math.max(0, timeS - p.timeS);
        const before = local[Math.max(0, i - 1)] ?? [0, 0];
        const after = local[Math.min(local.length - 1, i + 1)] ?? [0, 0];
        const here2 = local[i] ?? [0, 0];
        let dx = after[0] - before[0];
        let dz = after[1] - before[1];
        const len = Math.hypot(dx, dz) || 1;
        dx /= len;
        dz /= len;
        // Perpendicular to the track, in the plane.
        const half = w.baseHalfWidthM + w.widthPerS * age;
        const alpha = strength * Math.max(0, 1 - age / w.lifeS) * w.opacity;
        for (const [side, offset] of [
          [-1, 0],
          [1, 1],
        ] as const) {
          const v = i * 2 + offset;
          positions.set([here2[0] - dz * half * side, w.y, here2[1] + dx * half * side], v * 3);
          colors.set([1, 1, 1, alpha], v * 4);
        }
      });
      // Collapse the unused tail of the strip.
      const used = chain.length;
      const tail = (used - 1) * 2 + 1;
      for (let v = used * 2; v < vertexCount; v += 1) {
        positions.set(positions.subarray(tail * 3, tail * 3 + 3), v * 3);
        colors.set([1, 1, 1, 0], v * 4);
      }
      geometry.getAttribute('position').needsUpdate = true;
      geometry.getAttribute('color').needsUpdate = true;
      object.visible = true;
    },
  };
}
