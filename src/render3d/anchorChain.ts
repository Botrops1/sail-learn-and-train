import * as THREE from 'three';
import type { AppState } from '../app/store';
import { chainPoints } from '../model/anchor';
import { boat } from '../model/boat';
import { SEABED_ENV } from '../model/harbourForces';
import { vec3, type Vec3 } from '../model/vec3';
import { buildAnchor } from './boat/bowGear';
import { createMaterials } from './boat/materials';
import { type PartUserData } from './boat/parts';
import type { RopeView } from './boat/ropes';
import { createTube, pickSegments, writeTube } from './mooringLines';
import { SCENE } from './sceneConfig';
import type { Detail } from '../model/settings';

export interface AnchorChain {
  /** Added to the world group, like the marina: its position follows the boat so meshes sit at map positions. */
  object: THREE.Group;
  update(state: AppState, view?: RopeView): void;
}

/**
 * The chain from the bow roller to the anchor, and the anchor itself at its end (M46,
 * PHASE7_SPEC 12.6): the chain is one tube through the model's points (the catenary), the anchor
 * is Phase 6's, built a second time with its shackle at the chain's last point and its crown
 * pointing away from the boat, lying level. In the world group x is north, y up, z east.
 */
export function buildAnchorChain(detail: Detail = 'high'): AnchorChain {
  const a = SCENE.anchor;
  const object = new THREE.Group();
  object.name = 'anchorChain';
  const tube = createTube('fit_anchor_chain', a.points, 1, a.chainColour);
  tube.mesh.visible = false;
  object.add(tube.mesh);

  // The shackle is the origin of `anchor`, so placing it at the chain's end ties them together.
  const shackle = vec3(boat.deckFittings.anchor.shackle);
  const body = buildAnchor(createMaterials(detail), detail);
  body.position.set(-shackle[0], -shackle[1], -shackle[2]);
  const anchor = new THREE.Group();
  anchor.name = 'anchorAtChainEnd';
  anchor.add(body);
  anchor.visible = false;
  object.add(anchor);

  return {
    object,
    update(state, view) {
      const { anchor: down } = state;
      const shown = down.phase !== 'stowed';
      tube.mesh.visible = shown;
      anchor.visible = shown;
      if (!shown) return;
      const { boat: boatState } = state;
      object.position.set(-boatState.northM, 0, -boatState.eastM);
      const map = chainPoints(down, boatState, SEABED_ENV, a.points);
      const points = map.map(([east, north, height]): Vec3 => [north, height, east]);
      const offset: Vec3 = [object.position.x, 0, object.position.z];
      // The chain is `chainRadiusM` thick, or what it needs to stay visible from far away.
      writeTube(tube, points, offset, view, a.chainRadiusM);
      (tube.mesh.userData as PartUserData).pickSegments = pickSegments(points);

      const end = points[points.length - 1] as Vec3;
      const before = points[points.length - 2] as Vec3;
      let north = end[0] - before[0];
      let east = end[2] - before[2];
      // Hanging straight down: the crown points the way the boat heads.
      if (Math.hypot(north, east) < 1e-3) {
        const heading = (boatState.headingDeg * Math.PI) / 180;
        north = Math.cos(heading);
        east = Math.sin(heading);
      }
      anchor.position.set(end[0], end[1], end[2]);
      // Turning about the vertical: the anchor's forward (+x) points along the chain's last segment.
      anchor.rotation.y = Math.atan2(-east, north);
    },
  };
}
