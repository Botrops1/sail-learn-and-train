import * as THREE from 'three';
import type { PartUserData } from './boat/parts';
import { SCENE } from './sceneConfig';

export interface Picker {
  /** Registry id of the part at a point on the canvas (CSS px from its top-left), or null. */
  pick(x: number, y: number, width: number, height: number): string | null;
}

interface SegmentTarget {
  object: THREE.Object3D;
  partId: string;
  a: THREE.Vector3;
  b: THREE.Vector3;
}

/**
 * Tap-to-identify (PHASE1_SPEC 3, item 9). Surfaces are found with a ray. Thin parts (mast,
 * stays, winches, ...) register pick segments, so a tap up to `tolerancePx` away still finds
 * them, as long as they are not hidden behind the surface the ray hits. The water is
 * see-through: parts under it (keel, rudder) are found through it.
 */
export function createPicker(
  camera: THREE.Camera,
  boatRoot: THREE.Object3D,
  water: THREE.Object3D,
): Picker {
  const raycaster = new THREE.Raycaster();
  const segments: SegmentTarget[] = [];
  boatRoot.traverse((object) => {
    const data = object.userData as Partial<PartUserData>;
    if (!data.partId || !data.pickSegments) return;
    for (const [a, b] of data.pickSegments) {
      segments.push({
        object,
        partId: data.partId,
        a: new THREE.Vector3(...a),
        b: new THREE.Vector3(...b),
      });
    }
  });

  const worldA = new THREE.Vector3();
  const worldB = new THREE.Vector3();
  const screenA = new THREE.Vector2();
  const screenB = new THREE.Vector2();
  const tap = new THREE.Vector2();
  const point = new THREE.Vector3();

  function toScreen(world: THREE.Vector3, width: number, height: number, out: THREE.Vector2) {
    const ndc = world.clone().project(camera);
    out.set(((ndc.x + 1) / 2) * width, ((1 - ndc.y) / 2) * height);
    return ndc.z > -1 && ndc.z < 1;
  }

  return {
    pick(x, y, width, height) {
      const { tolerancePx, depthSlack } = SCENE.picking;
      raycaster.setFromCamera(new THREE.Vector2((x / width) * 2 - 1, 1 - (y / height) * 2), camera);
      const hits = raycaster.intersectObjects([boatRoot, water], true);
      const boatHit = hits.find((hit) => partIdOf(hit.object) && !isWithin(hit.object, water));
      const waterHit = hits.find((hit) => isWithin(hit.object, water));
      const surfaceDistance = boatHit?.distance ?? Infinity;

      tap.set(x, y);
      let best: { partId: string; pixels: number } | undefined;
      for (const segment of segments) {
        worldA.copy(segment.a).applyMatrix4(segment.object.matrixWorld);
        worldB.copy(segment.b).applyMatrix4(segment.object.matrixWorld);
        if (!toScreen(worldA, width, height, screenA)) continue;
        if (!toScreen(worldB, width, height, screenB)) continue;
        const t = closestParameter(tap, screenA, screenB);
        const pixels = tap.distanceTo(screenA.clone().lerp(screenB, t));
        if (pixels > tolerancePx) continue;
        point.copy(worldA).lerp(worldB, t);
        const depth = point.distanceTo(raycaster.ray.origin);
        if (depth > surfaceDistance + depthSlack) continue;
        if (!best || pixels < best.pixels) best = { partId: segment.partId, pixels };
      }
      if (best) return best.partId;
      if (boatHit) return partIdOf(boatHit.object);
      if (waterHit) return partIdOf(waterHit.object);
      return null;
    },
  };
}

function partIdOf(object: THREE.Object3D): string | null {
  let current: THREE.Object3D | null = object;
  while (current) {
    const id = (current.userData as Partial<PartUserData>).partId;
    if (id) return id;
    current = current.parent;
  }
  return null;
}

function isWithin(object: THREE.Object3D, ancestor: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (current === ancestor) return true;
    current = current.parent;
  }
  return false;
}

/** Parameter (0..1) of the point on segment a–b closest to p. */
function closestParameter(p: THREE.Vector2, a: THREE.Vector2, b: THREE.Vector2): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSq = abx * abx + aby * aby;
  if (lengthSq === 0) return 0;
  return Math.min(1, Math.max(0, ((p.x - a.x) * abx + (p.y - a.y) * aby) / lengthSq));
}
