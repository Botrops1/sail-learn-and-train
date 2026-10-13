import * as THREE from 'three';
import { boat } from '../model/boat';
import { dangerZone } from '../model/gybe';
import { requirePartId } from '../model/registry';
import type { RigState } from '../model/sim';
import { SCENE } from './sceneConfig';

const DEG = Math.PI / 180;

/**
 * The boom's danger zone (PHASE2_SPEC 11.3, `env_boom_danger_zone`): a translucent red fan at
 * the gooseneck's height from the angle the boom starts at to the angle where it stops, with the
 * boom's length as radius. Solid while the boom crosses and for `dangerFlashS` after; a faint
 * fan with an outline while the boom is by the lee. It is a picture, not a tap target.
 */
export interface DangerZoneView {
  object: THREE.Group;
  update(rig: RigState): void;
}

export function buildDangerZone(): DangerZoneView {
  const c = SCENE.dangerZone;
  const maxSteps = Math.ceil((2 * boat.rig.boom.maxSwingDeg) / c.segmentDeg) + 2;
  const pivot = boat.rig.boom.gooseneck;
  const radius = boat.rig.boom.length;

  const fillPositions = new Float32Array((maxSteps + 2) * 3);
  const fillGeometry = new THREE.BufferGeometry();
  fillGeometry.setAttribute('position', new THREE.BufferAttribute(fillPositions, 3));
  const fillIndex: number[] = [];
  for (let i = 0; i < maxSteps; i += 1) fillIndex.push(0, i + 1, i + 2);
  fillGeometry.setIndex(fillIndex);
  const fillMaterial = new THREE.MeshBasicMaterial({
    color: c.color,
    transparent: true,
    opacity: c.fillOpacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const fill = new THREE.Mesh(fillGeometry, fillMaterial);

  const outlinePositions = new Float32Array((maxSteps + 2) * 3);
  const outlineGeometry = new THREE.BufferGeometry();
  outlineGeometry.setAttribute('position', new THREE.BufferAttribute(outlinePositions, 3));
  const outlineMaterial = new THREE.LineBasicMaterial({
    color: c.color,
    transparent: true,
    opacity: c.outlineOpacity,
    depthWrite: false,
  });
  const outline = new THREE.LineLoop(outlineGeometry, outlineMaterial);

  const group = new THREE.Group();
  group.name = 'boomDangerZone';
  group.add(fill, outline);
  group.visible = false;
  for (const mesh of [fill, outline]) {
    mesh.userData.partId = requirePartId('env_boom_danger_zone');
    mesh.frustumCulled = false;
    mesh.raycast = () => undefined;
    mesh.renderOrder = 5;
  }

  /** Writes the fan from `fromDeg` to `toDeg` (boom angles, + = starboard) into both meshes. */
  const setSector = (fromDeg: number, toDeg: number) => {
    const steps = Math.max(
      1,
      Math.min(maxSteps, Math.ceil(Math.abs(toDeg - fromDeg) / c.segmentDeg)),
    );
    const y = (pivot[1] ?? 0) + c.liftM;
    const set = (array: Float32Array, index: number, x: number, z: number) => {
      array[index * 3] = x;
      array[index * 3 + 1] = y;
      array[index * 3 + 2] = z;
    };
    set(fillPositions, 0, pivot[0] ?? 0, 0);
    set(outlinePositions, 0, pivot[0] ?? 0, 0);
    for (let i = 0; i <= steps; i += 1) {
      const angle = (fromDeg + ((toDeg - fromDeg) * i) / steps) * DEG;
      // The boom points aft (−x); a positive angle swings its end to starboard (+z).
      const x = (pivot[0] ?? 0) - radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      set(fillPositions, i + 1, x, z);
      set(outlinePositions, i + 1, x, z);
    }
    // Triangles beyond the fan collapse onto its last point; the outline is cut at `steps + 2`.
    for (let i = steps + 1; i <= maxSteps; i += 1) {
      set(
        fillPositions,
        i + 1,
        fillPositions[(steps + 1) * 3] ?? 0,
        fillPositions[(steps + 1) * 3 + 2] ?? 0,
      );
    }
    fillGeometry.getAttribute('position').needsUpdate = true;
    outlineGeometry.getAttribute('position').needsUpdate = true;
    outlineGeometry.setDrawRange(0, steps + 2);
  };

  return {
    object: group,
    update(rig) {
      const zone = dangerZone(rig);
      group.visible = zone !== null;
      if (!zone) return;
      setSector(zone.fromDeg, zone.toDeg);
      const sweep = zone.kind === 'sweep';
      // By the lee the fan is faint but filled, so it can be seen on a phone; crossing it is solid.
      fillMaterial.opacity = sweep ? c.fillOpacity * zone.strength : c.riskFillOpacity;
      outlineMaterial.opacity = c.outlineOpacity * (sweep ? zone.strength : 1);
    },
  };
}
