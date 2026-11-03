import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { AppState } from '../app/store';
import { area, type AreaData } from '../model/area';
import {
  distanceToRect,
  marinaBounds,
  marinaGeometry,
  type MarinaGeometry,
  type MooredYacht,
  yachtOutline,
  type Rect,
} from '../model/marina';
import { requirePartId } from '../model/registry';
import { SCENE } from './sceneConfig';

/** A copy of `geometry` (position and normal only, not indexed) with every vertex painted `colour`: parts of one mesh get their colours from the vertices. */
export function painted(geometry: THREE.BufferGeometry, colour: string): THREE.BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  for (const name of Object.keys(flat.attributes)) {
    if (name !== 'position' && name !== 'normal') flat.deleteAttribute(name);
  }
  flat.clearGroups();
  const c = new THREE.Color(colour);
  const count = flat.getAttribute('position').count;
  const colours = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) c.toArray(colours, i * 3);
  flat.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  return flat;
}

/** A cylinder from point `a` to point `b` (any frame). */
export function cylinderBetween(
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
  sides = 8,
): THREE.BufferGeometry {
  const length = a.distanceTo(b);
  const geometry = new THREE.CylinderGeometry(radius, radius, length, sides);
  const direction = b.clone().sub(a).normalize();
  geometry.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction),
  );
  geometry.translate(...a.clone().add(b).multiplyScalar(0.5).toArray());
  return geometry;
}

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
  const ringId = requirePartId('env_quay_ring');
  const yachtId = requirePartId('env_moored_yacht');
  const lazyLineId = requirePartId('rope_lazy_line');
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
  const yachtMaterial = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    vertexColors: true,
    roughness: 0.4,
    side: THREE.DoubleSide,
  });

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

    // Rings: tori lying flat on the quay's edge, one instanced mesh.
    {
      const ringGeometry = new THREE.TorusGeometry(h.ringRadiusM, h.ringTubeM, 8, 16);
      const rings = new THREE.InstancedMesh(ringGeometry, ringMaterial, geometry.rings.length);
      const matrix = new THREE.Matrix4();
      const turn = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
      geometry.rings.forEach(([east, north], i) => {
        matrix.compose(
          new THREE.Vector3(north, m.quayHeightM + h.ringTubeM, east),
          turn,
          new THREE.Vector3(1, 1, 1),
        );
        rings.setMatrixAt(i, matrix);
      });
      rings.instanceMatrix.needsUpdate = true;
      add(rings, ringId, layoutGroup);
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

    buildYachts(geometry.yachts);
    buildBowLines(geometry.yachts);
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

  /**
   * The moored yachts: one instanced mesh per yacht type (length and beam), each with one merged
   * geometry in the yacht's own frame (x from the stern to the bow, y up, z to starboard) and
   * vertex colours (PHASE10_SPEC 15.5).
   */
  const yachtGeometry = (lengthM: number, beamM: number): THREE.BufferGeometry => {
    const y = h.yacht;
    const L = lengthM;
    const B = beamM;
    const parts: THREE.BufferGeometry[] = [];
    // The hull: the outline extruded from under the water to the deck. The extrusion's caps
    // (group 0) are the deck, its sides (group 1) the hull.
    const shape = new THREE.Shape();
    yachtOutline(L, B).forEach(([x, z], i) => {
      if (i === 0) shape.moveTo(x, -z);
      else shape.lineTo(x, -z);
    });
    shape.closePath();
    const extruded = new THREE.ExtrudeGeometry(shape, {
      depth: h.hullBelowM + h.hullAboveM,
      bevelEnabled: false,
    });
    extruded.rotateX(-Math.PI / 2);
    extruded.translate(0, -h.hullBelowM, 0);
    const deck = new THREE.Color(y.deckColour);
    const hullColour = new THREE.Color(h.hullColour);
    const colours = new Float32Array(extruded.getAttribute('position').count * 3);
    for (const group of extruded.groups) {
      const colour = group.materialIndex === 0 ? deck : hullColour;
      for (let i = group.start; i < group.start + group.count; i += 1)
        colour.toArray(colours, i * 3);
    }
    extruded.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    extruded.clearGroups();
    extruded.deleteAttribute('uv');
    parts.push(extruded);

    const deckY = h.hullAboveM;
    const cabin = new THREE.BoxGeometry((y.cabinTo - y.cabinFrom) * L, y.cabinM, y.cabinWidth * B);
    cabin.translate(((y.cabinFrom + y.cabinTo) / 2) * L, deckY + y.cabinM / 2, 0);
    parts.push(painted(cabin, h.hullColour));

    const mastX = y.mastAt * L;
    const mastTop = deckY + y.mastShare * L;
    parts.push(
      painted(
        cylinderBetween(
          new THREE.Vector3(mastX, deckY, 0),
          new THREE.Vector3(mastX, mastTop, 0),
          h.mastRadiusM,
        ),
        y.rigColour,
      ),
      painted(
        cylinderBetween(
          new THREE.Vector3(mastX, deckY + y.boomAboveM, 0),
          new THREE.Vector3(mastX - y.boomShare * L, deckY + y.boomAboveM, 0),
          h.mastRadiusM,
        ),
        y.rigColour,
      ),
      painted(
        cylinderBetween(
          new THREE.Vector3(L, deckY, 0),
          new THREE.Vector3(mastX, deckY + 0.9 * y.mastShare * L, 0),
          y.jibRadiusM,
        ),
        y.sailColour,
      ),
    );
    const merged = mergeGeometries(parts.map((part) => (part.index ? part.toNonIndexed() : part)));
    for (const part of parts) part.dispose();
    if (!merged) throw new Error('the yacht parts do not merge');
    return merged;
  };

  const buildYachts = (yachts: MooredYacht[]) => {
    const byType = new Map<string, MooredYacht[]>();
    for (const yacht of yachts) {
      const key = `${yacht.lengthM}/${yacht.beamM}`;
      byType.set(key, [...(byType.get(key) ?? []), yacht]);
    }
    const matrix = new THREE.Matrix4();
    for (const group of byType.values()) {
      const first = group[0] as MooredYacht;
      const mesh = new THREE.InstancedMesh(
        yachtGeometry(first.lengthM, first.beamM),
        yachtMaterial,
        group.length,
      );
      group.forEach((yacht, i) => {
        // Local x (towards the bow) → (north, east) = (cos h, sin h); local z (starboard) →
        // (−sin h, cos h); the scene's x is north and z is east.
        const heading = (yacht.berth.headingDeg * Math.PI) / 180;
        const c = Math.cos(heading);
        const s = Math.sin(heading);
        matrix.set(
          c,
          0,
          -s,
          yacht.berth.sternNorthM,
          0,
          1,
          0,
          0,
          s,
          0,
          c,
          yacht.berth.centreEastM,
          0,
          0,
          0,
          1,
        );
        mesh.setMatrixAt(i, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      add(mesh, yachtId, layoutGroup);
    }
  };

  /** M74: every moored yacht's bow line, one instanced mesh: a thin rod from her bow ahead and down at 45° (owner, PR 157). */
  const bowLineMaterial = new THREE.MeshStandardMaterial({
    color: h.bowLine.colour,
    roughness: 0.9,
  });
  const buildBowLines = (yachts: MooredYacht[]) => {
    if (yachts.length === 0) return;
    const { runM, radiusM } = h.bowLine;
    const deckY = h.hullAboveM;
    const rod = cylinderBetween(
      new THREE.Vector3(0, deckY, 0),
      new THREE.Vector3(runM, deckY - runM, 0),
      radiusM,
      4,
    );
    const mesh = new THREE.InstancedMesh(rod, bowLineMaterial, yachts.length);
    const matrix = new THREE.Matrix4();
    yachts.forEach((yacht, i) => {
      const heading = (yacht.berth.headingDeg * Math.PI) / 180;
      const c = Math.cos(heading);
      const s = Math.sin(heading);
      matrix.set(
        c,
        0,
        -s,
        yacht.berth.sternNorthM + yacht.lengthM * c,
        0,
        1,
        0,
        0,
        s,
        0,
        c,
        yacht.berth.centreEastM + yacht.lengthM * s,
        0,
        0,
        0,
        1,
      );
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    add(mesh, lazyLineId, layoutGroup);
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
