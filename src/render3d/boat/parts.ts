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
  /**
   * Small fittings (blocks, clutches, gooseneck, ...): centres of an invisible round hit area,
   * in the object's local frame. See picking.ts.
   */
  hitPoints?: Vec3[];
  /** A wire or thin strut: so thin on screen that it never hides a part behind it from a tap. */
  thin?: boolean;
}

export function v3(p: Vec3): THREE.Vector3 {
  return new THREE.Vector3(p[0], p[1], p[2]);
}

/**
 * One mesh per part: the geometries are merged (fewer draw calls, PHASE1_SPEC 10) and the
 * material is cloned so the part can be highlighted on its own when tapped. A textured
 * material gets texture coordinates in metres (box mapping) where the geometry has none.
 */
export function partMesh(
  partId: string,
  geometries: THREE.BufferGeometry[],
  material: THREE.Material,
  pickSegments: PickSegment[] = [],
): THREE.Mesh {
  const textured = hasTexture(material);
  const single = geometries.length === 1 ? geometries[0] : undefined;
  const geometry =
    single && (!textured || single.getAttribute('uv')) ? single : merge(geometries, textured);
  const mesh = new THREE.Mesh(geometry, cloneMaterial(material));
  const userData: PartUserData = { partId: requirePartId(partId) };
  if (pickSegments.length > 0) userData.pickSegments = pickSegments;
  Object.assign(mesh.userData, userData);
  mesh.name = partId;
  return mesh;
}

/** Material.clone() does not carry shader patches (onBeforeCompile); this does. */
export function cloneMaterial(material: THREE.Material): THREE.Material {
  const copy = material.clone();
  copy.onBeforeCompile = material.onBeforeCompile;
  copy.customProgramCacheKey = material.customProgramCacheKey;
  return copy;
}

function hasTexture(material: THREE.Material): boolean {
  const m = material as Partial<Record<'map' | 'bumpMap' | 'normalMap', THREE.Texture | null>>;
  return Boolean(m.map ?? m.bumpMap ?? m.normalMap);
}

/**
 * A small fitting: like partMesh, but found through an invisible hit area around each of
 * `hitPoints`, which is never smaller than about a fingertip on screen (see picking.ts).
 */
export function smallPartMesh(
  partId: string,
  geometries: THREE.BufferGeometry[],
  material: THREE.Material,
  hitPoints: Vec3[],
): THREE.Mesh {
  const mesh = partMesh(partId, geometries, material);
  (mesh.userData as PartUserData).hitPoints = hitPoints;
  return mesh;
}

/** Marks a mesh as thin (stays, shrouds, lifelines, spreaders), see PartUserData.thin. */
export function asThin(mesh: THREE.Mesh): THREE.Mesh {
  (mesh.userData as PartUserData).thin = true;
  return mesh;
}

/**
 * Merges geometries after giving them the same attributes (position + normal, non-indexed;
 * plus uv when `withUv`, box-mapped in metres where a geometry has none).
 */
export function merge(geometries: THREE.BufferGeometry[], withUv = false): THREE.BufferGeometry {
  const prepared = geometries.map((source) => {
    const geometry = source.index ? source.toNonIndexed() : source.clone();
    for (const name of Object.keys(geometry.attributes)) {
      if (name !== 'position' && name !== 'normal' && !(withUv && name === 'uv')) {
        geometry.deleteAttribute(name);
      }
    }
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    if (withUv && !geometry.getAttribute('uv')) boxUv(geometry);
    return geometry;
  });
  const merged = mergeGeometries(prepared, false);
  if (!merged) throw new Error('Could not merge part geometries.');
  return merged;
}

/**
 * Texture coordinates in metres for a non-indexed geometry, projected per triangle along its
 * main axis: (x, z) on decks, (x, y) on fore-and-aft sides, (z, y) on athwartships faces.
 */
export function boxUv(geometry: THREE.BufferGeometry): void {
  const position = geometry.getAttribute('position');
  const uv = new Float32Array(position.count * 2);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i + 2 < position.count; i += 3) {
    a.fromBufferAttribute(position, i);
    b.fromBufferAttribute(position, i + 1);
    c.fromBufferAttribute(position, i + 2);
    n.subVectors(b, a).cross(c.clone().sub(a));
    const ax = Math.abs(n.x);
    const ay = Math.abs(n.y);
    const az = Math.abs(n.z);
    for (let k = 0; k < 3; k += 1) {
      const p = k === 0 ? a : k === 1 ? b : c;
      const [u, v] = ay >= ax && ay >= az ? [p.x, p.z] : az >= ax ? [p.x, p.y] : [p.z, p.y];
      uv[(i + k) * 2] = u;
      uv[(i + k) * 2 + 1] = v;
    }
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
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

/**
 * A rope block: a sheave between two cheeks, `radius` across, its axle along `axle` (the rope
 * runs in the plane at right angles to it), plus a small shackle on the side `towards` its
 * fixing point.
 */
export function sheaveBlock(
  centre: Vec3,
  axle: Vec3,
  radius: number,
  towards: Vec3,
  radialSegments = 16,
): THREE.BufferGeometry[] {
  const axis = v3(axle).normalize();
  const c = v3(centre);
  const half = radius * 0.32;
  const cheeks = cylinderBetween(
    c.clone().addScaledVector(axis, -half).toArray() as Vec3,
    c.clone().addScaledVector(axis, half).toArray() as Vec3,
    radius,
    radialSegments,
  );
  const hub = cylinderBetween(
    c
      .clone()
      .addScaledVector(axis, -half * 1.5)
      .toArray() as Vec3,
    c
      .clone()
      .addScaledVector(axis, half * 1.5)
      .toArray() as Vec3,
    radius * 0.35,
    8,
  );
  const shackleEnd = c.clone().addScaledVector(v3(towards).normalize(), radius * 1.6);
  const shackle = cylinderBetween(centre, shackleEnd.toArray() as Vec3, radius * 0.2, 6);
  return [cheeks, hub, shackle];
}
