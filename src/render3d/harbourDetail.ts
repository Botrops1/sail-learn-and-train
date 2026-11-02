import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { AppState } from '../app/store';
import { area, type AreaData } from '../model/area';
import {
  distanceToRect,
  marinaBounds,
  marinaGeometry,
  type MarinaGeometry,
  type Rect,
} from '../model/marina';
import { mulberry32 } from '../model/random';
import { requirePartId } from '../model/registry';
import { SCENE } from './sceneConfig';

export interface HarbourDetail {
  /** Added to the world group; positioned like the marina's (shifted with the boat each frame). */
  object: THREE.Group;
  update(state: AppState): void;
}

/**
 * The marina's surroundings in 3D (M73, PHASE10_SPEC 15.5): the rock breakwater with its two
 * lights, the paved land, six low buildings, lamp posts and bollards on the quay and the floats
 * under the pontoon. Built and moved like `marina.ts`: every mesh sits at its absolute map
 * position (scene x = north, z = east) in a group shifted with the boat each frame, rebuilt when
 * the layout or the traffic changes, and hidden beyond `maxDrawM`.
 */
export function buildHarbourDetail(areaData: AreaData = area): HarbourDetail {
  const h = SCENE.harbour;
  const m = areaData.marina;
  const object = new THREE.Group();
  object.name = 'harbourDetail';
  const layoutGroup = new THREE.Group();
  layoutGroup.name = 'harbourDetailLayout';
  object.add(layoutGroup);

  const breakwaterId = requirePartId('env_breakwater');
  const lightId = requirePartId('env_harbour_light');
  const buildingId = requirePartId('env_harbour_building');
  const quayId = requirePartId('env_quay');

  const standard = (colour: string, roughness = 0.9) =>
    new THREE.MeshStandardMaterial({ color: colour, roughness });
  const rockMaterial = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    vertexColors: true,
    roughness: 1,
  });
  const landMaterial = standard(h.land.colour);
  const wallMaterial = standard(h.building.wall);
  const roofMaterial = standard(h.building.roof, 0.8);
  const windowMaterial = standard(h.building.windowColour, 0.3);
  const lampMaterial = standard(h.lamp.colour, 0.6);
  const bollardMaterial = standard(h.bollard.colour, 0.5);
  const floatMaterial = standard(h.float.colour, 0.7);
  const towerMaterial = standard(h.light.white, 0.6);

  let bounds: Rect = marinaBounds(marinaGeometry('medium', 'half', areaData));
  let builtFor = '';
  let shown = true;
  let meshes: THREE.Object3D[] = [];
  let windows: THREE.Object3D | null = null;
  let detailHigh = true;

  const add = (mesh: THREE.Object3D, partId: string) => {
    mesh.userData = { partId };
    if (mesh instanceof THREE.Mesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
    layoutGroup.add(mesh);
    return mesh;
  };

  /** A box over a map rectangle from `belowM` under the water to `aboveM` above it (scene frame). */
  const rectBox = (rect: Rect, belowM: number, aboveM: number): THREE.BoxGeometry => {
    const box = new THREE.BoxGeometry(
      rect.north - rect.south,
      belowM + aboveM,
      rect.east - rect.west,
    );
    box.translate(
      (rect.north + rect.south) / 2,
      (aboveM - belowM) / 2,
      (rect.east + rect.west) / 2,
    );
    return box;
  };

  const placed = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    matrices: THREE.Matrix4[],
  ): THREE.InstancedMesh => {
    const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
    matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    return mesh;
  };

  const at = (x: number, y: number, z: number, scale?: THREE.Vector3): THREE.Matrix4 =>
    new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion(),
      scale ?? new THREE.Vector3(1, 1, 1),
    );

  /** A pitched roof: a triangle (across x, up y) extruded along z, 1 × 1 × 1 before scaling. */
  const roofGeometry = (): THREE.BufferGeometry => {
    const a = [-0.5, 0, -0.5];
    const b = [0.5, 0, -0.5];
    const c = [0, 1, -0.5];
    const d = [-0.5, 0, 0.5];
    const e = [0.5, 0, 0.5];
    const f = [0, 1, 0.5];
    const triangles = [
      [a, c, b], // north-facing gable (z = −0.5)
      [d, e, f], // z = +0.5
      [a, d, f],
      [a, f, c],
      [b, c, f],
      [b, f, e],
      [a, b, e],
      [a, e, d],
    ];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(triangles.flat(2), 3));
    geometry.computeVertexNormals();
    return geometry;
  };

  const rebuild = (geometry: MarinaGeometry, key: string) => {
    builtFor = key;
    for (const child of [...layoutGroup.children]) {
      layoutGroup.remove(child);
      child.traverse((node) => {
        if (node instanceof THREE.Mesh) node.geometry.dispose();
      });
    }
    bounds = marinaBounds(geometry);
    const b = m.breakwater;
    const top = h.breakwater.topAboveM;

    // The breakwater: the three moles as boxes, one mesh, with a little random shade per vertex.
    {
      const random = mulberry32(73);
      const base = new THREE.Color(h.breakwater.colour);
      const parts = [geometry.breakwater.south, geometry.breakwater.west, geometry.breakwater.north]
        .map((rect) => rectBox(rect, h.breakwater.belowM, top))
        .map((box) => {
          const flat = box.toNonIndexed();
          flat.deleteAttribute('uv');
          const count = flat.getAttribute('position').count;
          const colours = new Float32Array(count * 3);
          for (let i = 0; i < count; i += 1) {
            base
              .clone()
              .multiplyScalar(1 + h.breakwater.shade * (2 * random() - 1))
              .toArray(colours, i * 3);
          }
          flat.setAttribute('color', new THREE.BufferAttribute(colours, 3));
          box.dispose();
          return flat;
        });
      const merged = mergeGeometries(parts);
      if (!merged) throw new Error('the breakwater boxes do not merge');
      for (const part of parts) part.dispose();
      add(new THREE.Mesh(merged, rockMaterial), breakwaterId);
    }

    // The lights, red first: a white tower and a coloured top band that glows.
    for (const [position, colour] of [
      [geometry.lights.red, h.light.red],
      [geometry.lights.green, h.light.green],
    ] as const) {
      const l = h.light;
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(l.towerRadiusM, l.towerRadiusM, l.towerM, 16),
        towerMaterial,
      );
      tower.position.set(position[1], top + l.towerM / 2, position[0]);
      add(tower, lightId);
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(l.towerRadiusM + 0.05, l.towerRadiusM + 0.05, l.topM, 16),
        new THREE.MeshStandardMaterial({
          color: colour,
          emissive: colour,
          emissiveIntensity: l.emissive,
          roughness: 0.4,
        }),
      );
      band.position.set(position[1], top + l.towerM + l.topM / 2, position[0]);
      add(band, lightId);
    }

    // The paved land behind the quay.
    add(new THREE.Mesh(rectBox(geometry.land, h.quayBelowM, m.quayHeightM), landMaterial), quayId);

    // The buildings: walls, pitched roofs and (at High detail) windows on the south face.
    {
      const ground = m.quayHeightM;
      const walls: THREE.Matrix4[] = [];
      const roofs: THREE.Matrix4[] = [];
      const panes: THREE.Matrix4[] = [];
      const bw = h.building;
      for (const building of geometry.buildings) {
        const { eastM, northM, widthM, depthM, heightM } = building;
        walls.push(
          at(northM, ground + heightM / 2, eastM, new THREE.Vector3(depthM, heightM, widthM)),
        );
        roofs.push(
          at(northM, ground + heightM, eastM, new THREE.Vector3(depthM, bw.roofM, widthM)),
        );
        const rows = Math.floor(heightM / bw.floorM);
        const columns = Math.floor(widthM / bw.windowEveryM);
        for (let row = 0; row < rows; row += 1) {
          for (let column = 0; column < columns; column += 1) {
            panes.push(
              at(
                northM - depthM / 2 - 0.025,
                ground + row * bw.floorM + bw.windowSillM + bw.windowHeightM / 2,
                eastM - widthM / 2 + bw.windowEveryM / 2 + column * bw.windowEveryM,
              ),
            );
          }
        }
      }
      add(placed(new THREE.BoxGeometry(1, 1, 1), wallMaterial, walls), buildingId);
      add(placed(roofGeometry(), roofMaterial, roofs), buildingId);
      windows = add(
        placed(
          new THREE.BoxGeometry(0.05, bw.windowHeightM, bw.windowWidthM),
          windowMaterial,
          panes,
        ),
        buildingId,
      );
    }

    // Lamp posts along the quay, bollards at the rings.
    {
      const l = h.lamp;
      const posts: THREE.Matrix4[] = [];
      const heads: THREE.Matrix4[] = [];
      for (let east = b.westM + l.everyM / 2; east <= m.eastEndEastM; east += l.everyM) {
        const north = m.quayFaceNorthM + l.insetM;
        posts.push(at(north, m.quayHeightM + l.postM / 2, east));
        heads.push(at(north, m.quayHeightM + l.postM + l.headM / 2, east));
      }
      add(
        placed(
          new THREE.CylinderGeometry(l.postRadiusM, l.postRadiusM, l.postM, 8),
          lampMaterial,
          posts,
        ),
        quayId,
      );
      add(placed(new THREE.BoxGeometry(l.headM, l.headM, l.headM), lampMaterial, heads), quayId);
      const k = h.bollard;
      const bollards = geometry.rings.map(([east]) =>
        at(m.quayFaceNorthM + k.insetM, m.quayHeightM + k.heightM / 2, east),
      );
      add(
        placed(
          new THREE.CylinderGeometry(k.radiusM, k.radiusM, k.heightM, 8),
          bollardMaterial,
          bollards,
        ),
        quayId,
      );
    }

    // The pontoon's floats, along both long edges, sticking out a little.
    {
      const f = h.float;
      const p = geometry.pontoon;
      const floats: THREE.Matrix4[] = [];
      for (let east = p.west + f.everyM / 2; east < p.east; east += f.everyM) {
        floats.push(at(p.north - f.widthM / 2 + f.outM, -f.belowM / 2, east));
        floats.push(at(p.south + f.widthM / 2 - f.outM, -f.belowM / 2, east));
      }
      add(
        placed(new THREE.BoxGeometry(f.widthM, f.belowM, f.lengthM), floatMaterial, floats),
        quayId,
      );
    }

    meshes = [];
    layoutGroup.traverse((node) => {
      if (node !== layoutGroup) meshes.push(node);
    });
    applyVisibility();
  };

  const applyVisibility = () => {
    for (const mesh of meshes) mesh.visible = shown && (mesh !== windows || detailHigh);
  };

  return {
    object,
    update(state) {
      const { layout, traffic } = state.harbour;
      const key = `${layout}/${traffic}`;
      const high = state.settings.detail === 'high';
      const rebuilt = key !== builtFor;
      if (rebuilt) rebuild(marinaGeometry(layout, traffic, areaData), key);
      const { boat } = state;
      object.position.set(-boat.northM, 0, -boat.eastM);
      const near = distanceToRect(bounds, boat.eastM, boat.northM) <= h.maxDrawM;
      if (rebuilt || near !== shown || high !== detailHigh) {
        shown = near;
        detailHigh = high;
        applyVisibility();
      }
    },
  };
}
