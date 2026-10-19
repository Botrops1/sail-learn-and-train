import * as THREE from 'three';
import type { AppState } from '../app/store';
import { area, type AreaData } from '../model/area';
import {
  distanceToRect,
  marinaBounds,
  marinaGeometry,
  type MarinaGeometry,
  type MooredYacht,
  type Rect,
} from '../model/marina';
import { requirePartId } from '../model/registry';
import { SCENE } from './sceneConfig';

export interface Marina {
  /** Added to the world group: its position is set each frame so the meshes can sit at map positions. */
  object: THREE.Group;
  /** Moves the group to the boat, rebuilds the yachts when the layout or traffic changed, hides the marina when far. */
  update(state: AppState): void;
}

/**
 * The marina in 3D (M42, PHASE7_SPEC 8.6). The world group's local x is north and z is east, so a
 * map point (east, north) is at (x = north, z = east); the marina group is shifted to
 * (−boat north, 0, −boat east) every frame and every mesh is built at its absolute map position.
 * It is always in the world, whatever the place; it is solid only in the marina (M43). Each mesh
 * is hidden by itself when the marina is far: the raycaster ignores a parent's visibility.
 */
export function buildMarina(areaData: AreaData = area): Marina {
  const h = SCENE.harbour;
  const object = new THREE.Group();
  object.name = 'marina';
  const quayId = requirePartId('env_quay');
  const yachtId = requirePartId('env_moored_yacht');
  const quayMaterial = new THREE.MeshStandardMaterial({ color: h.quayColour, roughness: 0.9 });
  const pontoonMaterial = new THREE.MeshStandardMaterial({
    color: h.pontoonColour,
    roughness: 0.8,
  });
  const ringMaterial = new THREE.MeshStandardMaterial({
    color: h.ringColour,
    roughness: 0.5,
    metalness: 0.4,
  });
  const arrowMaterial = new THREE.MeshStandardMaterial({
    color: h.berthColour,
    emissive: h.berthColour,
    emissiveIntensity: 0.35,
    roughness: 0.6,
  });
  const berthMaterial = new THREE.MeshStandardMaterial({ color: h.berthColour, roughness: 0.7 });
  const hullMaterial = new THREE.MeshStandardMaterial({
    color: h.hullColour,
    roughness: 0.4,
    side: THREE.DoubleSide,
  });
  const deckLineMaterial = new THREE.LineBasicMaterial({ color: h.deckLineColour });

  const m = areaData.marina;
  let bounds: Rect = marinaBounds(marinaGeometry('medium', 'half', areaData));

  /** A box over a map rectangle from `belowM` under the water to `aboveM` above it. */
  const box = (rect: Rect, belowM: number, aboveM: number, material: THREE.Material) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(rect.north - rect.south, belowM + aboveM, rect.east - rect.west),
      material,
    );
    mesh.position.set(
      (rect.north + rect.south) / 2,
      (aboveM - belowM) / 2,
      (rect.east + rect.west) / 2,
    );
    return mesh;
  };

  const add = (mesh: THREE.Object3D, partId: string, parent: THREE.Object3D = object) => {
    mesh.userData = { partId };
    if (mesh instanceof THREE.Mesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
    parent.add(mesh);
    return mesh;
  };

  // The pontoon and the wall depend on the layout (the fairway's width) and the yachts on the
  // traffic, so everything is in `layoutGroup` and rebuilt when either changes.
  const layoutGroup = new THREE.Group();
  layoutGroup.name = 'marinaLayout';
  object.add(layoutGroup);
  let builtFor = '';
  let meshes: THREE.Object3D[] = [];
  let shown = true;
  let arrowMeshes: THREE.Object3D[] = [];
  let arrowOn = true;

  const rebuild = (geometry: MarinaGeometry, key: string) => {
    builtFor = key;
    for (const child of [...layoutGroup.children]) {
      layoutGroup.remove(child);
      child.traverse((node) => {
        if (node instanceof THREE.Mesh || node instanceof THREE.LineSegments) {
          node.geometry.dispose();
        }
      });
    }
    bounds = marinaBounds(geometry);
    add(box(geometry.quay, h.quayBelowM, m.quayHeightM, quayMaterial), quayId, layoutGroup);
    add(box(geometry.wall, h.quayBelowM, m.quayHeightM, quayMaterial), quayId, layoutGroup);
    add(
      box(geometry.pontoon, h.pontoonBelowM, m.pontoonHeightM, pontoonMaterial),
      quayId,
      layoutGroup,
    );

    // Rings: tori lying flat on the quay's edge.
    const ringGeometry = new THREE.TorusGeometry(h.ringRadiusM, h.ringTubeM, 8, 16);
    for (const [east, north] of geometry.rings) {
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(north, m.quayHeightM + h.ringTubeM, east);
      add(ring, quayId, layoutGroup);
    }

    // The arrow over our berth: a cone pointing down on a shaft, floating over the quay.
    arrowMeshes = [];
    {
      const ours0 = geometry.ourBerth;
      const east = ours0.centreEastM;
      const north = m.quayFaceNorthM + h.arrowInsetM;
      const head = new THREE.Mesh(
        new THREE.ConeGeometry(h.arrowHeadRadiusM, h.arrowHeadM, 16),
        arrowMaterial,
      );
      head.rotation.x = Math.PI; // the tip points down
      head.position.set(north, h.arrowTipAboveM + h.arrowHeadM / 2, east);
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(h.arrowShaftRadiusM, h.arrowShaftRadiusM, h.arrowShaftM, 12),
        arrowMaterial,
      );
      shaft.position.set(north, h.arrowTipAboveM + h.arrowHeadM + h.arrowShaftM / 2, east);
      for (const part of [head, shaft]) {
        add(part, quayId, layoutGroup);
        arrowMeshes.push(part);
      }
    }

    // Our berth: a stripe along the quay edge between our two rings.
    const ours = geometry.ourBerth;
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(h.berthStripeM, 0.02, ours.widthM),
      berthMaterial,
    );
    stripe.position.set(
      m.quayFaceNorthM + h.berthStripeM / 2,
      m.quayHeightM + 0.01,
      ours.centreEastM,
    );
    add(stripe, quayId, layoutGroup);

    for (const yacht of geometry.yachts) buildYacht(yacht);
    meshes = [];
    layoutGroup.traverse((node) => {
      if (node !== layoutGroup) meshes.push(node);
    });
    for (const mesh of meshes) mesh.visible = shown;
    showArrow();
  };

  /** The arrow shows in the marina only, when the marina is near and the Place section's box is ticked. */
  const showArrow = () => {
    for (const mesh of arrowMeshes) mesh.visible = shown && arrowOn;
  };

  const buildYacht = (yacht: MooredYacht) => {
    // The hull in the (north, −east) plane, extruded along its local z, then turned so z is up:
    // local (x, y, z) → world (x, z, −y), so a point (north, −east) lands at x = north, z = east.
    const shape = new THREE.Shape();
    yacht.outline.forEach(([east, north], i) => {
      if (i === 0) shape.moveTo(north, -east);
      else shape.lineTo(north, -east);
    });
    shape.closePath();
    const depth = h.hullBelowM + h.hullAboveM;
    const hull = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }),
      hullMaterial,
    );
    hull.rotation.x = -Math.PI / 2;
    hull.position.y = -h.hullBelowM;
    add(hull, yachtId, layoutGroup);

    // The deck line: the outline again, at deck height.
    const points = yacht.outline.map(
      ([east, north]) => new THREE.Vector3(north, h.hullAboveM, east),
    );
    const line = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(points),
      deckLineMaterial,
    );
    add(line, yachtId, layoutGroup);

    // The mast, 0.4 L forward of the stern on the centreline.
    const sternEast = yacht.berth.centreEastM;
    const sternNorth = yacht.berth.sternNorthM;
    const forward = yacht.berth.headingDeg === 180 ? -1 : 1;
    const mastHeight = 0.9 * yacht.lengthM + 2;
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(h.mastRadiusM, h.mastRadiusM, mastHeight, 8),
      hullMaterial,
    );
    mast.position.set(sternNorth + forward * 0.4 * yacht.lengthM, mastHeight / 2, sternEast);
    add(mast, yachtId, layoutGroup);
  };

  return {
    object,
    update(state) {
      const { layout, traffic } = state.harbour;
      const key = `${layout}/${traffic}`;
      if (key !== builtFor) rebuild(marinaGeometry(layout, traffic, areaData), key);
      const { boat } = state;
      object.position.set(-boat.northM, 0, -boat.eastM);
      const near = distanceToRect(bounds, boat.eastM, boat.northM) <= h.maxDrawM;
      const arrow = state.harbour.place === 'marina' && state.harbour.berthArrow;
      if (near !== shown) {
        shown = near;
        for (const mesh of meshes) mesh.visible = near;
        showArrow();
      }
      if (arrow !== arrowOn) {
        arrowOn = arrow;
        showArrow();
      }
    },
  };
}
