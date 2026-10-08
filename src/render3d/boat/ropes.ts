import * as THREE from 'three';
import { boat } from '../../model/boat';
import type { RopeDrawing } from '../../model/ropePaths';
import type { Vec3 } from '../../model/vec3';
import { SCENE } from '../sceneConfig';
import { asThin, partMesh, type PartUserData, type PickSegment } from './parts';

/**
 * Ropes drawn as thin tubes (PHASE1_SPEC 8.7) in their teaching colour (7.3), with a stripe
 * pattern that slides along the rope as it is hauled or eased. Buffers are made once and
 * refilled every frame. Each rope is one mesh with its registry id (`rope_*`).
 */
export interface RopeMeshes {
  objects: THREE.Mesh[];
  update(drawings: RopeDrawing[]): void;
}

type ColorKey = keyof typeof SCENE.ropes.colors;

function colorKeyOf(id: string): ColorKey {
  const rope = boat.ropes.list.find((candidate) => candidate.id === id);
  const key = rope?.colorKey;
  if (!key || !(key in SCENE.ropes.colors)) throw new Error(`No rope colour for ${id}.`);
  return key as ColorKey;
}

/** A light rope with darker bands every `stripePeriodM` (multiplied with the rope colour). */
function stripeTexture(): THREE.DataTexture {
  const { stripeTexels, stripeDarkTexels, stripeDarkness } = SCENE.ropes;
  const data = new Uint8Array(stripeTexels * 4);
  for (let i = 0; i < stripeTexels; i += 1) {
    const value = i < stripeTexels - stripeDarkTexels ? 255 : Math.round(255 * stripeDarkness);
    data.set([value, value, value, 255], i * 4);
  }
  const texture = new THREE.DataTexture(data, stripeTexels, 1);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

interface RopeMesh {
  mesh: THREE.Mesh;
  material: THREE.MeshLambertMaterial;
  colorKey: ColorKey;
  /** Points per strand, as built. */
  layout: number[];
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
}

const RADIAL = SCENE.ropes.radialSegments;
const UP = new THREE.Vector3(0, 1, 0);
const SIDE = new THREE.Vector3(1, 0, 0);

function buildGeometry(layout: number[]): {
  geometry: THREE.BufferGeometry;
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
} {
  const vertexCount = layout.reduce((sum, n) => sum + n * RADIAL, 0);
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices: number[] = [];
  let base = 0;
  for (const count of layout) {
    for (let i = 0; i < count - 1; i += 1) {
      for (let j = 0; j < RADIAL; j += 1) {
        const a = base + i * RADIAL + j;
        const b = base + i * RADIAL + ((j + 1) % RADIAL);
        const c = a + RADIAL;
        const d = b + RADIAL;
        indices.push(a, c, b, b, c, d);
      }
    }
    base += count * RADIAL;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return { geometry, positions, normals, uvs };
}

const tangent = new THREE.Vector3();
const normal = new THREE.Vector3();
const binormal = new THREE.Vector3();
const radial = new THREE.Vector3();

/** Writes one strand's tube into the buffers, starting at vertex `base`. */
function writeStrand(rope: RopeMesh, base: number, points: Vec3[], feed: number): void {
  const radius = boat.visual.ropeRenderRadius;
  const period = SCENE.ropes.stripePeriodM;
  let arc = 0;
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i] as Vec3;
    const prev = points[Math.max(0, i - 1)] as Vec3;
    const next = points[Math.min(points.length - 1, i + 1)] as Vec3;
    if (i > 0) arc += Math.hypot(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]);
    tangent.set(next[0] - prev[0], next[1] - prev[1], next[2] - prev[2]);
    if (tangent.lengthSq() < 1e-12) tangent.set(1, 0, 0);
    tangent.normalize();
    normal.crossVectors(tangent, Math.abs(tangent.dot(UP)) > 0.9 ? SIDE : UP).normalize();
    binormal.crossVectors(tangent, normal);
    const u = (arc + feed) / period;
    for (let j = 0; j < RADIAL; j += 1) {
      const angle = (2 * Math.PI * j) / RADIAL;
      radial
        .copy(normal)
        .multiplyScalar(Math.cos(angle))
        .addScaledVector(binormal, Math.sin(angle));
      const k = base + i * RADIAL + j;
      rope.positions[k * 3] = p[0] + radial.x * radius;
      rope.positions[k * 3 + 1] = p[1] + radial.y * radius;
      rope.positions[k * 3 + 2] = p[2] + radial.z * radius;
      rope.normals[k * 3] = radial.x;
      rope.normals[k * 3 + 1] = radial.y;
      rope.normals[k * 3 + 2] = radial.z;
      rope.uvs[k * 2] = u;
      rope.uvs[k * 2 + 1] = j / RADIAL;
    }
  }
}

function pickSegments(drawing: RopeDrawing): PickSegment[] {
  const segments: PickSegment[] = [];
  for (const strand of drawing.strands) {
    for (let i = 1; i < strand.points.length; i += 1) {
      segments.push([strand.points[i - 1] as Vec3, strand.points[i] as Vec3]);
    }
  }
  return segments;
}

export function buildRopes(initial: RopeDrawing[]): RopeMeshes {
  const texture = stripeTexture();
  const ropes = new Map<string, RopeMesh>();

  const create = (drawing: RopeDrawing): RopeMesh => {
    const layout = drawing.strands.map((strand) => strand.points.length);
    const built = buildGeometry(layout);
    const colorKey = colorKeyOf(drawing.id);
    const base = new THREE.MeshLambertMaterial({
      color: SCENE.ropes.colors[colorKey],
      map: texture,
    });
    const mesh = asThin(partMesh(drawing.id, [built.geometry], base));
    mesh.renderOrder = 2;
    return {
      mesh,
      material: mesh.material as THREE.MeshLambertMaterial,
      colorKey,
      layout,
      positions: built.positions,
      normals: built.normals,
      uvs: built.uvs,
    };
  };

  const update = (drawings: RopeDrawing[]) => {
    for (const drawing of drawings) {
      const rope = ropes.get(drawing.id);
      if (!rope) continue;
      const layout = drawing.strands.map((strand) => strand.points.length);
      if (layout.join() !== rope.layout.join()) {
        throw new Error(`Rope ${drawing.id} changed its number of points.`);
      }
      let base = 0;
      drawing.strands.forEach((strand) => {
        writeStrand(rope, base, strand.points, strand.feed);
        base += strand.points.length * RADIAL;
      });
      const geometry = rope.mesh.geometry;
      for (const name of ['position', 'normal', 'uv'])
        geometry.getAttribute(name).needsUpdate = true;
      // Recomputed when next needed (picking), so a moved rope is still found.
      geometry.boundingSphere = null;
      geometry.boundingBox = null;
      (rope.mesh.userData as PartUserData).pickSegments = pickSegments(drawing);
      rope.material.color.set(
        drawing.state === 'fighting' ? SCENE.ropes.fighting : SCENE.ropes.colors[rope.colorKey],
      );
    }
  };

  for (const drawing of initial) ropes.set(drawing.id, create(drawing));
  update(initial);
  return { objects: [...ropes.values()].map((rope) => rope.mesh), update };
}
