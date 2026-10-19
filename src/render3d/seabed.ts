import * as THREE from 'three';
import type { AppState } from '../app/store';
import { area, type AreaData } from '../model/area';
import { distanceToRect, type Rect } from '../model/marina';
import { requirePartId } from '../model/registry';
import { depthAt, seabedAt } from '../model/seabed';
import type { Detail } from '../model/settings';
import { SCENE } from './sceneConfig';

export interface Seabed {
  /** Added to the world group: its position follows the boat so meshes sit at map positions (as the marina). */
  object: THREE.Group;
  update(state: AppState): void;
  /** Detail Low has fewer, bigger cells. */
  setDetail(detail: Detail): void;
}

/**
 * The bay's land and bottom in 3D (M45, PHASE7_SPEC 11.5): one terrain mesh whose height is
 * `−depthAt` (land above the water, the bottom below it) with vertex colours for the sand, weed,
 * rock and land, and the marina basin's bottom as a flat plane. The world group's local x is
 * north and z is east, so a map point (east, north) is at (x = north, z = east). The terrain is
 * two meshes sharing their vertices (the land is `env_shore`, the bottom `env_seabed`) so a tap
 * names what it hits. Each mesh hides itself when its rectangle is more than 1,000 m away.
 */
export function buildSeabed(areaData: AreaData = area, detail: Detail = 'low'): Seabed {
  const c = SCENE.bay;
  const object = new THREE.Group();
  object.name = 'seabed';
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    metalness: 0,
  });
  const basinMaterial = new THREE.MeshStandardMaterial({ color: c.mudColour, roughness: 1 });

  const terrainRect: Rect = c.terrain;
  const basin = areaData.marina.basin;
  const basinPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(basin.north - basin.south, basin.east - basin.west),
    basinMaterial,
  );
  // PlaneGeometry lies in x–y facing +z: turn it flat, facing up, with x = north and y(plane) = east.
  basinPlane.rotation.x = -Math.PI / 2;
  basinPlane.rotation.z = -Math.PI / 2;
  basinPlane.position.set(
    (basin.north + basin.south) / 2,
    -areaData.marina.depthM,
    (basin.east + basin.west) / 2,
  );
  basinPlane.userData = { partId: requirePartId('env_seabed') };
  object.add(basinPlane);

  const colours = {
    sand: new THREE.Color(c.sandColour),
    mud: new THREE.Color(c.mudColour),
    weed: new THREE.Color(c.weedColour),
    rock: new THREE.Color(c.rockColour),
    land: new THREE.Color(c.landColour),
    highLand: new THREE.Color(c.highLandColour),
  };

  let land: THREE.Mesh | null = null;
  let bottom: THREE.Mesh | null = null;
  let builtDetail: Detail | null = null;

  const dispose = () => {
    for (const mesh of [land, bottom]) {
      if (!mesh) continue;
      object.remove(mesh);
      mesh.geometry.dispose();
    }
    land = null;
    bottom = null;
  };

  const build = (next: Detail) => {
    dispose();
    builtDetail = next;
    const step = next === 'high' ? c.cellM.high : c.cellM.low;
    const columns = Math.round((terrainRect.east - terrainRect.west) / step) + 1;
    const rows = Math.round((terrainRect.north - terrainRect.south) / step) + 1;
    const positions = new Float32Array(columns * rows * 3);
    const colourData = new Float32Array(columns * rows * 3);
    const heights = new Float32Array(columns * rows);
    for (let row = 0; row < rows; row += 1) {
      const north = terrainRect.south + row * step;
      for (let col = 0; col < columns; col += 1) {
        const east = terrainRect.west + col * step;
        const depth = depthAt(east, north, areaData);
        const index = row * columns + col;
        heights[index] = -depth;
        positions.set([north, -depth, east], index * 3);
        let colour: THREE.Color;
        if (depth <= 0) colour = -depth > c.highLandM ? colours.highLand : colours.land;
        else colour = colours[seabedAt(east, north, areaData)];
        colourData.set([colour.r, colour.g, colour.b], index * 3);
      }
    }
    const landIndex: number[] = [];
    const bottomIndex: number[] = [];
    for (let row = 0; row + 1 < rows; row += 1) {
      for (let col = 0; col + 1 < columns; col += 1) {
        const p00 = row * columns + col;
        const p01 = p00 + 1;
        const p10 = p00 + columns;
        const p11 = p10 + 1;
        const average =
          ((heights[p00] ?? 0) + (heights[p01] ?? 0) + (heights[p10] ?? 0) + (heights[p11] ?? 0)) /
          4;
        const into = average > 0 ? landIndex : bottomIndex;
        // Counter-clockwise seen from above (x = north, z = east).
        into.push(p00, p01, p10, p01, p11, p10);
      }
    }
    const positionAttribute = new THREE.BufferAttribute(positions, 3);
    const colourAttribute = new THREE.BufferAttribute(colourData, 3);
    const make = (index: number[], partId: string) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', positionAttribute);
      geometry.setAttribute('color', colourAttribute);
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = { partId };
      object.add(mesh);
      return mesh;
    };
    land = make(landIndex, requirePartId('env_shore'));
    bottom = make(bottomIndex, requirePartId('env_seabed'));
  };
  build(detail);

  return {
    object,
    setDetail(next) {
      if (next !== builtDetail) build(next);
    },
    update(state) {
      const { boat } = state;
      object.position.set(-boat.northM, 0, -boat.eastM);
      const terrainNear = distanceToRect(terrainRect, boat.eastM, boat.northM) <= c.maxDrawM;
      if (land) land.visible = terrainNear;
      if (bottom) bottom.visible = terrainNear;
      basinPlane.visible = distanceToRect(basin, boat.eastM, boat.northM) <= c.maxDrawM;
    },
  };
}
