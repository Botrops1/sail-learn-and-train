import * as THREE from 'three';
import type { SailGrid } from '../../model/sailShape';
import type { Vec3 } from '../../model/vec3';
import type { BoatMaterials } from './materials';
import { partMesh, type PartUserData, type PickSegment } from './parts';

/**
 * A sail as a grid between the luff and the leech (PHASE1_SPEC 8.5, 8.6), reshaped every
 * frame: it twists, curves to leeward when filled and flaps when luffing. Used for the mainsail
 * and the jib. Buffers are reused.
 */
export interface SailMesh {
  mesh: THREE.Mesh;
  /** New shape; `visible` false hides a rolled-away sail. */
  update(grid: SailGrid, visible: boolean): void;
}

export function buildSailMesh(
  partId: string,
  materials: BoatMaterials,
  first: SailGrid,
  visible = true,
): SailMesh {
  const { rows, columns } = first;
  const positions = new Float32Array((rows + 1) * (columns + 1) * 3);
  // Texture coordinates: u across the sail, v the height in metres (the seams are horizontal
  // panels, see textures.ts).
  const uvs = new Float32Array((rows + 1) * (columns + 1) * 2);
  const indices: number[] = [];
  for (let i = 0; i < rows; i += 1) {
    for (let j = 0; j < columns; j += 1) {
      const a = i * (columns + 1) + j;
      const b = a + 1;
      const c = a + columns + 1;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  const mesh = partMesh(partId, [geometry], materials.sail);
  // Draw sails after the opaque boat so the see-through edge blends correctly.
  mesh.renderOrder = 1;

  const at = (points: Vec3[], i: number, j: number) => points[i * (columns + 1) + j] as Vec3;
  const update = (grid: SailGrid, show: boolean) => {
    const { points } = grid;
    points.forEach((p, k) => {
      positions.set(p, k * 3);
      uvs[k * 2] = (k % (columns + 1)) / columns;
      uvs[k * 2 + 1] = p[1];
    });
    geometry.getAttribute('position').needsUpdate = true;
    geometry.getAttribute('uv').needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.boundingSphere = null;
    geometry.boundingBox = null;
    mesh.visible = show;
    // Edges for tap-to-identify: luff, leech and foot.
    const edges: PickSegment[] = [];
    if (show) {
      for (let i = 0; i < rows; i += 1) {
        edges.push([at(points, i, 0), at(points, i + 1, 0)]);
        edges.push([at(points, i, columns), at(points, i + 1, columns)]);
      }
      for (let j = 0; j < columns; j += 1) edges.push([at(points, 0, j), at(points, 0, j + 1)]);
    }
    (mesh.userData as PartUserData).pickSegments = edges;
  };
  update(first, visible);
  return { mesh, update };
}
