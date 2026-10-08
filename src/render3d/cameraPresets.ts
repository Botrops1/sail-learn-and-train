import { boat, type BoatData } from '../model/boat';
import { halfBeamAt, sheerAt } from '../model/hullShape';
import type { CameraPreset } from '../model/settings';
import { add, cross, dot, normalize, scale, sub, type Vec3 } from '../model/vec3';
import { SCENE } from './sceneConfig';

/**
 * Camera presets and limits (PHASE1_SPEC 6.2). Plain maths on the boat data, so it can be
 * tested without WebGL. Boat frame: x forward, y up, z starboard.
 */

export interface CameraPose {
  position: Vec3;
  target: Vec3;
}

export interface Lens {
  verticalFovDeg: number;
  aspect: number;
}

const DEG = Math.PI / 180;
const WORLD_UP: Vec3 = [0, 1, 0];

/** Box that the whole-boat presets frame: hull, keel and rig. */
export function framingBox(data: BoatData = boat): { min: Vec3; max: Vec3 } {
  const halfBeam = data.dimensions.beam / 2;
  return {
    min: [data.hull.transomX, -data.dimensions.draft, -halfBeam],
    max: [data.hull.bowFittingTipX, data.rig.mast.topY, halfBeam],
  };
}

/**
 * Unit direction from the target towards the camera. Azimuth is measured from the bow
 * towards port (90 = port beam, −90 = starboard beam), elevation above the horizontal.
 */
export function viewDirection(azimuthDeg: number, elevationDeg: number): Vec3 {
  const az = azimuthDeg * DEG;
  const el = elevationDeg * DEG;
  return [Math.cos(el) * Math.cos(az), Math.sin(el), -Math.cos(el) * Math.sin(az)];
}

/**
 * Smallest camera distance from `target` along `direction` at which every corner of the box
 * is inside the view, with the framing margin.
 */
export function fitDistance(
  box: { min: Vec3; max: Vec3 },
  target: Vec3,
  direction: Vec3,
  lens: Lens,
  margin: number = SCENE.camera.framingMargin,
): number {
  const forward = scale(direction, -1);
  const right = normalize(cross(forward, WORLD_UP));
  const up = cross(right, forward);
  const tanV = Math.tan((lens.verticalFovDeg * DEG) / 2);
  const tanH = tanV * lens.aspect;
  let distance = 0;
  for (const x of [box.min[0], box.max[0]]) {
    for (const y of [box.min[1], box.max[1]]) {
      for (const z of [box.min[2], box.max[2]]) {
        const q = sub([x, y, z], target);
        const depthOffset = dot(q, forward);
        distance = Math.max(
          distance,
          (Math.abs(dot(q, right)) * margin) / tanH - depthOffset,
          (Math.abs(dot(q, up)) * margin) / tanV - depthOffset,
        );
      }
    }
  }
  return distance;
}

/** Camera pose for a preset. `free` returns the default view (the free position is not stored). */
export function presetPose(preset: CameraPreset, lens: Lens, data: BoatData = boat): CameraPose {
  const cam = SCENE.camera;
  if (preset === 'helm') return helmPose(data);
  const box = framingBox(data);
  const target: Vec3 = scale(add(box.min, box.max), 0.5);
  const direction = {
    'side-port': viewDirection(90, cam.sideElevationDeg),
    'side-starboard': viewDirection(-90, cam.sideElevationDeg),
    // From almost straight above, nudged to starboard, so the bow points right and port is at
    // the top of the screen, like docs/reference/hanse508-plan.svg.
    top: viewDirection(-90, cam.topElevationDeg),
    bow: viewDirection(0, cam.bowElevationDeg),
    free: viewDirection(90, cam.sideElevationDeg),
  }[preset];
  const distance = fitDistance(box, target, direction, lens);
  return { position: add(target, scale(direction, distance)), target };
}

/**
 * Eye height behind the port wheel, looking forward at boom height by the mast, so the boat
 * ahead fills the view and the top of the wheel shows at the bottom on wide screens.
 */
function helmPose(data: BoatData): CameraPose {
  const cam = SCENE.camera;
  const helm = data.cockpitHardware.helms.find((h) => h.id === 'helm_port');
  const x = (helm?.x ?? 0) - cam.helmBehindWheel;
  const z = helm?.z ?? 0;
  return {
    position: [x, data.deck.cockpit.soleY + cam.helmEyeHeight, z],
    target: [data.rig.mast.x, data.rig.boom.gooseneck[1] ?? 0, z],
  };
}

/**
 * Keeps the camera above the water and outside the hull (PHASE1_SPEC 6.2): anywhere inside the
 * deck outline and below the deck counts as inside, and is lifted above the deck.
 */
export function clampCameraPosition(position: Vec3, data: BoatData = boat): Vec3 {
  const cam = SCENE.camera;
  const [x, , z] = position;
  let y = Math.max(position[1], cam.minHeightAboveWater);
  if (Math.abs(z) < halfBeamAt(x, data) && y < sheerAt(x, data)) {
    y = sheerAt(x, data) + cam.clearanceAboveDeck;
  }
  return [x, y, z];
}

/** Keeps the orbit centre over the water near the boat, so a pan cannot lose the boat. */
export function clampTarget(target: Vec3, data: BoatData = boat): Vec3 {
  const limit = SCENE.camera.maxTargetOffset;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  return [
    clamp(target[0], -limit, limit),
    clamp(target[1], 0, data.rig.mast.topY),
    clamp(target[2], -limit, limit),
  ];
}
