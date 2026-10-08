import * as THREE from 'three';
import { boat } from '../../model/boat';
import { mainSailGrid, type MainSailShapeInput } from '../../model/sailShape';
import type { Vec3 } from '../../model/vec3';
import type { BoatMaterials } from './materials';
import { partMesh, type PartUserData, type PickSegment } from './parts';

/**
 * The mainsail as a grid between the luff and the leech (PHASE1_SPEC 8.6), reshaped every
 * frame: it twists, curves to leeward when filled and flaps when luffing. Buffers are reused.
 */
export interface MainSailMesh {
  mesh: THREE.Mesh;
  update(input: MainSailShapeInput): void;
}

export function buildMainSail(materials: BoatMaterials, initial: MainSailShapeInput): MainSailMesh {
  const first = mainSailGrid(initial);
  const { rows, columns } = first;
  const positions = new Float32Array((rows + 1) * (columns + 1) * 3);
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
  geometry.setIndex(indices);

  const mesh = partMesh('sail_main', [geometry], materials.sail);
  // Draw sails after the opaque boat so the see-through edge blends correctly.
  mesh.renderOrder = 1;

  const at = (points: Vec3[], i: number, j: number) => points[i * (columns + 1) + j] as Vec3;
  const update = (input: MainSailShapeInput) => {
    const { points } = mainSailGrid(input);
    points.forEach((p, k) => positions.set(p, k * 3));
    geometry.getAttribute('position').needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.boundingSphere = null;
    geometry.boundingBox = null;
    // Rolled away below the same point where it stops pushing the boom (PT-14).
    const visible = input.unfurled * 100 >= boat.visual.solver.furledBelowPct;
    mesh.visible = visible;
    // Edges for tap-to-identify: luff, leech and foot.
    const edges: PickSegment[] = [];
    if (visible) {
      for (let i = 0; i < rows; i += 1) {
        edges.push([at(points, i, 0), at(points, i + 1, 0)]);
        edges.push([at(points, i, columns), at(points, i + 1, columns)]);
      }
      for (let j = 0; j < columns; j += 1) edges.push([at(points, 0, j), at(points, 0, j + 1)]);
    }
    (mesh.userData as PartUserData).pickSegments = edges;
  };
  update(initial);
  return { mesh, update };
}
