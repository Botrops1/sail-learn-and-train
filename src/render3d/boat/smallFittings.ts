import * as THREE from 'three';
import { boat, type BoatData } from '../../model/boat';
import {
  contactShadowSpots,
  hatchBoxes,
  portlightGrid,
  shroudFoot,
} from '../../model/smallFittings';
import type { Vec3 } from '../../model/vec3';
import { SCENE } from '../sceneConfig';
import type { BoatMaterials } from './materials';
import {
  asThin,
  cylinderBetween,
  partMesh,
  roundedBoxAt,
  smallPartMesh,
  triangles,
  type PartUserData,
  type PickSegment,
} from './parts';

/**
 * The small fittings of PHASE9_SPEC 11.4, High detail only: shroud feet, deck hatches, hull
 * portlights and the soft contact shadows. (The stanchion plates and wire sleeves are added to
 * the stanchions' own mesh in deckGear.ts.)
 */
export function buildSmallFittings(
  materials: BoatMaterials,
  data: BoatData = boat,
): THREE.Object3D[] {
  return [
    ...shroudFeet(materials, data),
    ...hatches(materials, data),
    portlights(materials, data),
    contactShadows(data),
  ];
}

function shroudFeet(materials: BoatMaterials, data: BoatData): THREE.Object3D[] {
  const f = data.modelDetail.shroudFittings;
  const parts: THREE.BufferGeometry[] = [];
  const segments: PickSegment[] = [];
  for (const side of [1, -1] as const) {
    const foot = shroudFoot(side, data);
    parts.push(
      roundedBoxAt(foot.strap.centre, foot.strap.size, SCENE.smallFittings.strapEdgeM, 'high'),
    );
    for (const { toggle, turnbuckle } of foot.fittings) {
      parts.push(cylinderBetween(toggle[0], toggle[1], f.toggleRadiusM, 8));
      parts.push(cylinderBetween(turnbuckle[0], turnbuckle[1], f.turnbuckleRadiusM, 12));
      segments.push([toggle[0], turnbuckle[1]]);
    }
  }
  return [asThin(partMesh('part_shroud', parts, materials.chrome, segments))];
}

function hatches(materials: BoatMaterials, data: BoatData): THREE.Object3D[] {
  const frames: THREE.BufferGeometry[] = [];
  const lids: THREE.BufferGeometry[] = [];
  const hits: Vec3[] = [];
  for (const hatch of hatchBoxes(data)) {
    for (const bar of hatch.frame) {
      frames.push(roundedBoxAt(bar.centre, bar.size, SCENE.smallFittings.hatchEdgeM, 'high'));
    }
    const lid = new THREE.BoxGeometry(...hatch.lid.size);
    lid.translate(...hatch.lid.centre);
    lids.push(lid);
    hits.push([
      hatch.lid.centre[0],
      hatch.lid.centre[1] + hatch.lid.size[1] / 2,
      hatch.lid.centre[2],
    ]);
  }
  return [
    smallPartMesh('fit_deck_hatch', frames, materials.gelcoat, hits),
    smallPartMesh('fit_deck_hatch', lids, materials.glass, hits),
  ];
}

/** Each grid as a triangle strip, wound so its normal points away from the hull. */
function portlights(materials: BoatMaterials, data: BoatData): THREE.Object3D {
  const positions: number[] = [];
  const hits: Vec3[] = [];
  const columns = data.deckFittings.portlights.columns;
  for (const light of data.deckFittings.portlights.list) {
    for (const side of [1, -1] as const) {
      const [top, bottom] = portlightGrid(light, side, data);
      for (let k = 0; k < columns; k += 1) {
        const t0 = top[k] as Vec3;
        const t1 = top[k + 1] as Vec3;
        const b0 = bottom[k] as Vec3;
        const b1 = bottom[k + 1] as Vec3;
        // Starboard seen from outside: top-left, bottom-left, bottom-right (x forward = right
        // when looking at the port side, so the winding is swapped with the side).
        if (side > 0) {
          positions.push(...t0, ...b0, ...b1, ...t0, ...b1, ...t1);
        } else {
          positions.push(...t0, ...b1, ...b0, ...t0, ...t1, ...b1);
        }
      }
      const mid = Math.floor(columns / 2);
      const a = top[mid] as Vec3;
      const b = bottom[mid] as Vec3;
      hits.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);
    }
  }
  return smallPartMesh('fit_portlight', [triangles(positions)], materials.glass, hits);
}

/** A radial gradient from a typed array (no canvas, so it builds in Node): alpha falls linearly to 0 at the edge circle. */
function shadowTexture(): THREE.DataTexture {
  const { texturePx: n, opacity } = SCENE.contactShadow;
  const data = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j += 1) {
    for (let i = 0; i < n; i += 1) {
      const r = Math.hypot((i + 0.5) / n - 0.5, (j + 0.5) / n - 0.5) / 0.5;
      data[(j * n + i) * 4 + 3] = Math.round(255 * opacity * Math.max(0, 1 - r));
    }
  }
  const texture = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function contactShadows(data: BoatData): THREE.Object3D {
  const c = SCENE.contactShadow;
  const positions: number[] = [];
  const uvs: number[] = [];
  for (const spot of contactShadowSpots(c, data)) {
    const [x, y0, z] = spot.centre;
    const y = y0 + c.liftM;
    const hx = spot.sizeX / 2;
    const hz = spot.sizeZ / 2;
    // Facing up (+y): (x−, z−), (x−, z+), (x+, z+), (x+, z−).
    const corners: [number, number, number, number][] = [
      [-hx, -hz, 0, 0],
      [-hx, hz, 0, 1],
      [hx, hz, 1, 1],
      [hx, -hz, 1, 0],
    ];
    for (const k of [0, 1, 2, 0, 2, 3]) {
      const [dx, dz, u, v] = corners[k] as [number, number, number, number];
      positions.push(x + dx, y, z + dz);
      uvs.push(u, v);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  const material = new THREE.MeshBasicMaterial({
    map: shadowTexture(),
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData = { partId: 'part_deck', noPick: true } satisfies PartUserData;
  mesh.name = 'contact_shadows';
  mesh.renderOrder = 1;
  return mesh;
}
