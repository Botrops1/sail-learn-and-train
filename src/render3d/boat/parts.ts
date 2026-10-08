import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { requirePartId } from '../../model/registry';
import type { Vec3 } from '../../model/vec3';

/**
 * A segment (or a point, when both ends are equal) in the object's local frame. Thin parts
 * register these so a tap a few pixels next to them still finds them (see picking.ts).
 */
export type PickSegment = readonly [Vec3, Vec3];

export interface PartUserData {
  partId: string;
  pickSegments?: PickSegment[];
}

export function v3(p: Vec3): THREE.Vector3 {
  return new THREE.Vector3(p[0], p[1], p[2]);
}

/**
 * One mesh per part: the geometries are merged (fewer draw calls, PHASE1_SPEC 10) and the
 * material is cloned so the part can be highlighted on its own when tapped.
 */
export function partMesh(
  partId: string,
  geometries: THREE.BufferGeometry[],
  material: THREE.Material,
  pickSegments: PickSegment[] = [],
): THREE.Mesh {
  const geometry = geometries.length === 1 && geometries[0] ? geometries[0] : merge(geometries);
  const mesh = new THREE.Mesh(geometry, material.clone());
  const userData: PartUserData = { partId: requirePartId(partId) };
  if (pickSegments.length > 0) userData.pickSegments = pickSegments;
  Object.assign(mesh.userData, userData);
  mesh.name = partId;
  return mesh;
}

/** Merges geometries after giving them the same attributes (position + normal, non-indexed). */
export function merge(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const prepared = geometries.map((source) => {
    const geometry = source.index ? source.toNonIndexed() : source.clone();
    for (const name of Object.keys(geometry.attributes)) {
      if (name !== 'position' && name !== 'normal') geometry.deleteAttribute(name);
    }
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    return geometry;
  });
  const merged = mergeGeometries(prepared, false);
  if (!merged) throw new Error('Could not merge part geometries.');
  return merged;
}

/** A cylinder from a to b (for wires, spokes, spreaders). */
export function cylinderBetween(
  a: Vec3,
  b: Vec3,
  radius: number,
  radialSegments = 8,
): THREE.BufferGeometry {
  const start = v3(a);
  const end = v3(b);
  const direction = end.clone().sub(start);
  const geometry = new THREE.CylinderGeometry(
    radius,
    radius,
    direction.length(),
    radialSegments,
    1,
  );
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize(),
  );
  geometry.applyQuaternion(quaternion);
  geometry.translate(...start.add(end).multiplyScalar(0.5).toArray());
  return geometry;
}

/** An axis-aligned box given its centre and size. */
export function boxAt(centre: Vec3, size: Vec3): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
  geometry.translate(centre[0], centre[1], centre[2]);
  return geometry;
}

/** A side profile in the x–y plane, extruded symmetrically to the given width in z. */
export function extrudeProfile(
  points: readonly (readonly [number, number])[],
  width: number,
  bevel = 0,
): THREE.BufferGeometry {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const depth = Math.max(0.001, width - 2 * bevel);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 3,
    curveSegments: 8,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

/** Builds a triangle soup geometry; normals are computed (smooth if indexed). */
export function triangles(positions: number[], indices?: number[]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (indices) geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Pushes a quad p0 → p1 → p2 → p3 as two triangles (non-indexed positions). */
export function pushQuad(out: number[], p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3): void {
  out.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3);
}
