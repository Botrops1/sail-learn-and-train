import * as THREE from 'three';
import type { PartUserData } from './boat/parts';
import { SCENE } from './sceneConfig';

/** Screen position (CSS px from the canvas's top-left) of a small part's hit-area centre. */
export interface HitCentre {
  partId: string;
  x: number;
  y: number;
}

export interface Picker {
  /** Registry id of the part at a point on the canvas (CSS px from its top-left), or null. */
  pick(x: number, y: number, width: number, height: number): string | null;
  /** Where the small parts' hit areas are on screen right now (for tests and the debug hook). */
  hitCentres(width: number, height: number): HitCentre[];
}

interface Target {
  object: THREE.Object3D;
  partId: string;
  a: THREE.Vector3;
  b: THREE.Vector3;
}

/**
 * Tap-to-identify (PHASE1_SPEC 3, item 9), in this order:
 *
 * 1. A tap right on a small fitting (block, clutch, gooseneck, winch, ...) picks it.
 * 2. Each small fitting has an invisible round hit area of `smallPartRadiusPx` around its
 *    centre (about 48 px across, a fingertip, at any zoom); the nearest one wins. This keeps
 *    them tappable on a phone even where they sit next to the mast or boom.
 * 3. Thin long parts (mast, stays, boom, ...) are found up to `tolerancePx` away.
 * 4. Otherwise the surface the ray hits.
 *
 * Steps 2 and 3 skip parts hidden behind the surface the ray hits. Wires and thin struts, and
 * surfaces the ray only grazes (a sail seen edge-on from above), hide nothing. The water is
 * see-through: parts under it (keel, rudder) are found through it.
 */
export function createPicker(
  camera: THREE.Camera,
  boatRoot: THREE.Object3D,
  water: THREE.Object3D,
): Picker {
  const raycaster = new THREE.Raycaster();
  let segments: Target[] = [];
  let smallParts: Target[] = [];
  const smallIds = new Set<string>();

  /**
   * Collects the tap targets. Done at each tap, not once: the boom, mainsail and ropes move,
   * and the moving ropes and sail edges replace their pick segments every frame.
   */
  function collect(): void {
    segments = [];
    smallParts = [];
    smallIds.clear();
    boatRoot.traverse((object) => {
      const data = object.userData as Partial<PartUserData>;
      if (!data.partId || !object.visible) return;
      for (const [a, b] of data.pickSegments ?? []) {
        segments.push({
          object,
          partId: data.partId,
          a: new THREE.Vector3(...a),
          b: new THREE.Vector3(...b),
        });
      }
      for (const p of data.hitPoints ?? []) {
        const point = new THREE.Vector3(...p);
        smallParts.push({ object, partId: data.partId, a: point, b: point });
        smallIds.add(data.partId);
      }
    });
  }

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

  /** The visible target nearest to the tap within `radius` px, or undefined. */
  function nearest(
    targets: Target[],
    radius: number,
    surfaceDistance: number,
    width: number,
    height: number,
  ): string | undefined {
    let best: { partId: string; pixels: number } | undefined;
    for (const target of targets) {
      worldA.copy(target.a).applyMatrix4(target.object.matrixWorld);
      worldB.copy(target.b).applyMatrix4(target.object.matrixWorld);
      if (!toScreen(worldA, width, height, screenA)) continue;
      if (!toScreen(worldB, width, height, screenB)) continue;
      const t = closestParameter(tap, screenA, screenB);
      const pixels = tap.distanceTo(screenA.clone().lerp(screenB, t));
      if (pixels > radius) continue;
      point.copy(worldA).lerp(worldB, t);
      const depth = point.distanceTo(raycaster.ray.origin);
      if (depth > surfaceDistance + SCENE.picking.depthSlack) continue;
      if (!best || pixels < best.pixels) best = { partId: target.partId, pixels };
    }
    return best?.partId;
  }

  return {
    pick(x, y, width, height) {
      collect();
      const { tolerancePx, smallPartRadiusPx } = SCENE.picking;
      raycaster.setFromCamera(new THREE.Vector2((x / width) * 2 - 1, 1 - (y / height) * 2), camera);
      const hits = raycaster.intersectObjects([boatRoot, water], true);
      const boatHits = hits.filter(
        (hit) => hit.object.visible && partIdOf(hit.object) && !isWithin(hit.object, water),
      );
      const boatHit = boatHits[0];
      const waterHit = hits.find((hit) => isWithin(hit.object, water));
      const hiding = boatHits.find(
        (hit) => !isThin(hit.object) && !grazes(hit, raycaster.ray.direction),
      );
      const surfaceDistance = hiding?.distance ?? Infinity;
      const surfacePart = boatHit ? partIdOf(boatHit.object) : null;
      tap.set(x, y);

      if (surfacePart && smallIds.has(surfacePart)) return surfacePart;
      return (
        nearest(smallParts, smallPartRadiusPx, surfaceDistance, width, height) ??
        nearest(segments, tolerancePx, surfaceDistance, width, height) ??
        surfacePart ??
        (waterHit ? partIdOf(waterHit.object) : null)
      );
    },
    hitCentres(width, height) {
      collect();
      const centres: HitCentre[] = [];
      for (const target of smallParts) {
        worldA.copy(target.a).applyMatrix4(target.object.matrixWorld);
        if (!toScreen(worldA, width, height, screenA)) continue;
        centres.push({ partId: target.partId, x: screenA.x, y: screenA.y });
      }
      return centres;
    },
  };
}

function isThin(object: THREE.Object3D): boolean {
  return (object.userData as Partial<PartUserData>).thin === true;
}

/** Cosine below which a ray only grazes a surface (about 8° or flatter). */
const GRAZING_COSINE = 0.14;

/** True if the ray meets the surface almost edge-on, like a sail seen from above. */
function grazes(hit: THREE.Intersection, direction: THREE.Vector3): boolean {
  if (!hit.face) return false;
  const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
  return Math.abs(normal.dot(direction)) < GRAZING_COSINE;
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
