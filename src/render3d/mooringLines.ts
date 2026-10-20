import * as THREE from 'three';
import type { AppState } from '../app/store';
import { area, type AreaData } from '../model/area';
import { boat } from '../model/boat';
import { pointToMap } from '../model/lowSpeed';
import { distanceToRect, marinaBounds, marinaGeometry } from '../model/marina';
import {
  cleatPoint,
  LINE_CODES,
  lineTension,
  type LineCode,
  type MooringLine,
} from '../model/mooringLines';
import type { Vec3 } from '../model/vec3';
import { asThin, partMesh, type PartUserData } from './boat/parts';
import { screenRadius, type RopeView } from './boat/ropes';
import { SCENE } from './sceneConfig';

export interface MooringLines {
  /** Added to the world group, like the marina: its position follows the boat so meshes sit at map positions. */
  object: THREE.Group;
  update(state: AppState, view?: RopeView): void;
}

/** The registry id of each line's rope. */
const ROPE_IDS: Record<LineCode, string> = {
  sp: 'rope_stern_line_port',
  ss: 'rope_stern_line_starboard',
  ll: 'rope_lazy_line',
  bl: 'rope_bow_line',
  sl: 'rope_shore_line',
};

const RADIAL = 6;

/** The waiting lazy line: 4 segments down the quay face and 8 along the bottom. */
const WAITING_FACE_SEGMENTS = 4;
const WAITING_BOTTOM_SEGMENTS = 8;
const WAITING_POINTS = WAITING_FACE_SEGMENTS + WAITING_BOTTOM_SEGMENTS + 1;

/** A tube along a list of points: positions and normals are rewritten in place each frame. (M46: the anchor chain reuses it.) */
export interface Tube {
  mesh: THREE.Mesh<THREE.BufferGeometry>;
  pointCount: number;
}

export function createTube(
  partId: string,
  pointCount: number,
  opacity: number,
  color: string | number = SCENE.ropes.colors.mooring,
): Tube {
  const geometry = new THREE.BufferGeometry();
  const vertices = pointCount * RADIAL;
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices * 3), 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(vertices * 3), 3));
  const indices: number[] = [];
  for (let i = 0; i < pointCount - 1; i += 1) {
    for (let j = 0; j < RADIAL; j += 1) {
      const a = i * RADIAL + j;
      const b = i * RADIAL + ((j + 1) % RADIAL);
      indices.push(a, b, a + RADIAL, b, b + RADIAL, a + RADIAL);
    }
  }
  geometry.setIndex(indices);
  const material = new THREE.MeshLambertMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
  });
  const mesh = asThin(partMesh(partId, [geometry], material)) as THREE.Mesh<THREE.BufferGeometry>;
  mesh.renderOrder = 2;
  // The points change every frame and the mesh is far from the group's origin: never cull it by a stale sphere.
  mesh.frustumCulled = false;
  return { mesh, pointCount };
}

const axis = new THREE.Vector3();
const side = new THREE.Vector3();
const up = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const ACROSS = new THREE.Vector3(1, 0, 0);

/** Writes the tube round `points` (group-local) with the radius each point needs to stay visible. */
export function writeTube(
  tube: Tube,
  points: readonly Vec3[],
  offset: Vec3,
  view: RopeView | undefined,
  baseRadius: number = boat.visual.ropeRenderRadius,
): void {
  const positions = tube.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
  const normals = tube.mesh.geometry.getAttribute('normal') as THREE.BufferAttribute;
  const last = points.length - 1;
  for (let i = 0; i <= last; i += 1) {
    const p = points[i] as Vec3;
    const a = points[Math.max(0, i - 1)] as Vec3;
    const b = points[Math.min(last, i + 1)] as Vec3;
    axis.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
    // Any vector not parallel to the axis gives a frame round it.
    side.crossVectors(axis, Math.abs(axis.y) > 0.9 ? ACROSS : UP).normalize();
    up.crossVectors(side, axis).normalize();
    const radius = screenRadius(
      baseRadius,
      [p[0] + offset[0], p[1] + offset[1], p[2] + offset[2]],
      view,
    );
    for (let j = 0; j < RADIAL; j += 1) {
      const angle = (j / RADIAL) * Math.PI * 2;
      const nx = side.x * Math.cos(angle) + up.x * Math.sin(angle);
      const ny = side.y * Math.cos(angle) + up.y * Math.sin(angle);
      const nz = side.z * Math.cos(angle) + up.z * Math.sin(angle);
      const index = i * RADIAL + j;
      positions.setXYZ(index, p[0] + nx * radius, p[1] + ny * radius, p[2] + nz * radius);
      normals.setXYZ(index, nx, ny, nz);
    }
  }
  positions.needsUpdate = true;
  normals.needsUpdate = true;
  tube.mesh.geometry.boundingSphere = null;
  tube.mesh.geometry.boundingBox = null;
}

/**
 * Where a point in the map frame (east, north, height) is in the marina group: x = north, y = up,
 * z = east (see `buildMarina`).
 */
const world = (east: number, north: number, height: number): Vec3 => [north, height, east];

/**
 * The mooring lines in 3D (M44, M45, PHASE7_SPEC 10.5, 11.5): each line that is on, as a sky-blue rope from
 * its cleat to its far end (slack ones sag as a parabola, taut ones are straight), and our
 * berth's lazy line waiting on the quay face and the bottom at half opacity until it is taken.
 */
export function buildMooringLines(areaData: AreaData = area): MooringLines {
  const h = SCENE.harbour.lines;
  const object = new THREE.Group();
  object.name = 'mooringLines';
  const tubes = new Map<LineCode, Tube>();
  for (const code of LINE_CODES) {
    const tube = createTube(ROPE_IDS[code], h.segments + 1, 1);
    tube.mesh.visible = false;
    tubes.set(code, tube);
    object.add(tube.mesh);
  }
  // The lazy line waiting: down the quay face, then along the bottom to its weight.
  const waiting = createTube(ROPE_IDS.ll, WAITING_POINTS, h.waitingOpacity);
  waiting.mesh.visible = false;
  object.add(waiting.mesh);

  const lineCurve = (line: MooringLine, state: AppState): Vec3[] => {
    const [x, y, z] = cleatPoint(line.cleatId);
    const [east, north] = pointToMap(state.boat, x, z);
    const from = world(east, north, y);
    const to = world(line.far.eastM, line.far.northM, line.far.heightM);
    const { distanceM } = lineTension(line, state.boat);
    const sag = Math.min(h.sagMaxM, Math.max(0, (line.lengthM - distanceM) * h.sagPerSlack));
    const points: Vec3[] = [];
    for (let i = 0; i <= h.segments; i += 1) {
      const s = i / h.segments;
      points.push([
        from[0] + (to[0] - from[0]) * s,
        from[1] + (to[1] - from[1]) * s - 4 * sag * s * (1 - s),
        from[2] + (to[2] - from[2]) * s,
      ]);
    }
    return points;
  };

  let boundsFor = '';
  let bounds = marinaBounds(marinaGeometry('medium', 'half', areaData));

  return {
    object,
    update(state, view) {
      const { layout, traffic } = state.harbour;
      const key = `${layout}/${traffic}`;
      const geometry = marinaGeometry(layout, traffic, areaData);
      if (key !== boundsFor) {
        boundsFor = key;
        bounds = marinaBounds(geometry);
      }
      const { boat: boatState } = state;
      object.position.set(-boatState.northM, 0, -boatState.eastM);
      const offset: Vec3 = [object.position.x, 0, object.position.z];
      const near =
        distanceToRect(bounds, boatState.eastM, boatState.northM) <= SCENE.harbour.maxDrawM;

      const onCodes = new Set<LineCode>();
      for (const line of state.lines.lines) {
        onCodes.add(line.code);
        const tube = tubes.get(line.code);
        if (!tube) continue;
        // The bay's lines only exist in the bay, so they are always near.
        const here = line.code === 'bl' || line.code === 'sl' || near;
        tube.mesh.visible = here;
        if (here) {
          const curve = lineCurve(line, state);
          writeTube(tube, curve, offset, view);
          (tube.mesh.userData as PartUserData).pickSegments = pickSegments(curve);
        }
      }
      for (const code of LINE_CODES) {
        if (!onCodes.has(code)) {
          const tube = tubes.get(code);
          if (tube) tube.mesh.visible = false;
        }
      }

      // The weight's line waits until the lazy line is on.
      const showWaiting = near && !onCodes.has('ll');
      waiting.mesh.visible = showWaiting;
      if (showWaiting) {
        const m = areaData.marina;
        const [sinkerEast, sinkerNorth, sinkerHeight] = geometry.ourSinker;
        const edge = world(sinkerEast, m.quayFaceNorthM, m.quayHeightM);
        const foot = world(sinkerEast, m.quayFaceNorthM, -m.depthM);
        const weight = world(sinkerEast, sinkerNorth, sinkerHeight);
        const path: Vec3[] = [];
        const along = (a: Vec3, b: Vec3, count: number, skipFirst: boolean) => {
          for (let i = skipFirst ? 1 : 0; i <= count; i += 1) {
            const s = i / count;
            path.push([
              a[0] + (b[0] - a[0]) * s,
              a[1] + (b[1] - a[1]) * s,
              a[2] + (b[2] - a[2]) * s,
            ]);
          }
        };
        along(edge, foot, WAITING_FACE_SEGMENTS, false);
        along(foot, weight, WAITING_BOTTOM_SEGMENTS, true);
        writeTube(waiting, path, offset, view);
        (waiting.mesh.userData as PartUserData).pickSegments = pickSegments(path);
      }
    },
  };
}

export function pickSegments(points: readonly Vec3[]): [Vec3, Vec3][] {
  const segments: [Vec3, Vec3][] = [];
  for (let i = 0; i + 1 < points.length; i += 1) {
    segments.push([points[i] as Vec3, points[i + 1] as Vec3]);
  }
  return segments;
}
