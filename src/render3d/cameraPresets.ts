import { boat, type BoatData } from '../model/boat';
import { halfBeamAt, sheerAt } from '../model/hullShape';
import { helmPedestal } from '../model/helmPedestal';
import { DEFAULT_HELM_VIEW, type CameraPreset, type HelmView } from '../model/settings';
import { add, cross, dot, normalize, scale, sub, type Vec3 } from '../model/vec3';
import { SCENE } from './sceneConfig';

/**
 * Camera presets and limits (PHASE1_SPEC 6.2). Plain maths on the boat data, so it can be
 * tested without WebGL. Boat frame: x forward, y up, z starboard.
 */

export interface CameraPose {
  position: Vec3;
  target: Vec3;
  /** Vertical field of view; the helm view uses a wider lens than the whole-boat views. */
  fovDeg: number;
}

export interface PresetOptions {
  /**
   * Top view with the bow pointing up the screen (stacked, portrait layout). Otherwise the bow
   * points right, like docs/reference/hanse508-plan.svg (side-by-side layout).
   */
  topBowUp?: boolean;
  /** M64: the Helm camera's wheel and direction. */
  helm?: HelmView;
}

export interface Lens {
  verticalFovDeg: number;
  aspect: number;
}

const DEG = Math.PI / 180;
const WORLD_UP: Vec3 = [0, 1, 0];

/**
 * Box that the whole-boat presets frame: hull, keel and rig. Seen from above, the rig adds no
 * width or length (the mast top sits in the middle), so the top view frames the hull up to the
 * mast foot and the boat fills more of the screen.
 */
export function framingBox(data: BoatData = boat, fromAbove = false): { min: Vec3; max: Vec3 } {
  const halfBeam = data.dimensions.beam / 2;
  return {
    min: [data.hull.transomX, -data.dimensions.draft, -halfBeam],
    max: [data.hull.bowFittingTipX, fromAbove ? data.rig.mast.footY : data.rig.mast.topY, halfBeam],
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

/**
 * M49: the camera pose that shows `box` filling `fill` of the view: the target moves to the box's
 * centre, the direction from the target to the camera stays as in `from`, the distance is
 * max(SCENE.spotlight.minDistanceM, fitDistance(box, centre, direction, lens, 1 / fill)),
 * at most `maxDistanceM`.
 */
export function focusPose(
  box: { min: Vec3; max: Vec3 },
  from: CameraPose,
  lens: Lens,
  fill: number,
  maxDistanceM: number,
  fovDeg: number = SCENE.camera.verticalFovDeg,
): CameraPose {
  const centre: Vec3 = scale(add(box.min, box.max), 0.5);
  const away = sub(from.position, from.target);
  const length = Math.hypot(away[0], away[1], away[2]);
  const direction = length < 1e-6 ? viewDirection(90, 6) : scale(away, 1 / length);
  const fitted = fitDistance(box, centre, direction, lens, 1 / fill);
  const distance = Math.min(maxDistanceM, Math.max(SCENE.spotlight.minDistanceM, fitted));
  return { position: add(centre, scale(direction, distance)), target: centre, fovDeg };
}

/**
 * Camera pose for a preset. `free` and `map` return the default view (the free position is not
 * stored; the map shows no 3D scene).
 */
export function presetPose(
  preset: CameraPreset,
  lens: Lens,
  options: PresetOptions = {},
  data: BoatData = boat,
): CameraPose {
  const cam = SCENE.camera;
  if (preset === 'helm') return helmPose(options.helm ?? DEFAULT_HELM_VIEW, data);
  const box = framingBox(data, preset === 'top');
  const target: Vec3 = scale(add(box.min, box.max), 0.5);
  const direction = {
    'side-port': viewDirection(90, cam.sideElevationDeg),
    'side-starboard': viewDirection(-90, cam.sideElevationDeg),
    // From almost straight above. The screen's "up" is the side the camera is nudged away from:
    // nudged aft, the bow points up (starboard on the right); nudged to starboard, the bow
    // points right and port is at the top, like the plan sketch.
    top: viewDirection(options.topBowUp ? 180 : -90, cam.topElevationDeg),
    bow: viewDirection(0, cam.bowElevationDeg),
    free: viewDirection(90, cam.sideElevationDeg),
    // The map hides the 3D scene; the camera keeps its pose (see scene.ts) and this is only
    // what a link opened on the map starts from.
    map: viewDirection(90, cam.sideElevationDeg),
  }[preset];
  let distance = fitDistance(box, target, direction, lens);
  if (preset === 'top') {
    // Stay well above the masthead, or the rig right under the camera fills the view.
    distance = Math.max(distance, (data.rig.mast.topY - target[1]) * cam.topAboveMastFactor);
  }
  return {
    position: add(target, scale(direction, distance)),
    target,
    fovDeg: cam.verticalFovDeg,
  };
}

/**
 * Standing eye height behind a wheel (M64: either one), looking forward and down and a little
 * towards the wheel's own side, with a wider lens (Ahead); or at the panel on the pedestal
 * (Panel); or at the winch of that side (Ropes). The eye stays where it is for all three.
 */
export function helmPose(view: HelmView, data: BoatData = boat): CameraPose {
  const cam = SCENE.camera;
  const helms = data.cockpitHardware.helms;
  const helm = helms.find((h) => h.id === `helm_${view.wheel}`) ?? helms[0];
  if (!helm) throw new Error('the boat data has no helm');
  const side = helm.z >= 0 ? 1 : -1;
  const eye: Vec3 = [
    helm.x - cam.helmBehindWheel,
    data.deck.cockpit.soleY + cam.helmEyeHeight,
    helm.z,
  ];
  const down = cam.helmLookDownDeg * DEG;
  const yaw = cam.helmYawToPortDeg * DEG;
  const look: Vec3 = [
    Math.cos(down) * Math.cos(yaw),
    -Math.sin(down),
    side * Math.cos(down) * Math.sin(yaw),
  ];
  const ahead: Vec3 = add(eye, scale(look, cam.helmTargetDistance));
  if (view.look === 'panel') {
    return {
      position: eye,
      target: helmPedestal(helm.id, data).face.centre,
      fovDeg: cam.helmPanelFovDeg,
    };
  }
  if (view.look === 'ropes') {
    let winch: (typeof data.cockpitHardware.winches)[number] | undefined;
    for (const w of data.cockpitHardware.winches) {
      if ((w as { present?: boolean }).present === false || Math.sign(w.z) !== side) continue;
      if (!winch || Math.abs(w.x - helm.x) < Math.abs(winch.x - helm.x)) winch = w;
    }
    return {
      position: eye,
      target: winch
        ? [winch.x + cam.helmRopesAheadOfWinchM, winch.y + cam.helmRopesAboveWinchM, winch.z]
        : ahead,
      fovDeg: cam.helmRopesFovDeg,
    };
  }
  return { position: eye, target: ahead, fovDeg: cam.helmVerticalFovDeg };
}

/**
 * M99: the largest polar angle (radians from straight up) that keeps the camera at least
 * `minHeight` above the water, for an orbit round a target at `targetY` and `distance` away.
 */
export function maxPolarAngle(targetY: number, distance: number, minHeight: number): number {
  if (distance <= 0) return Math.PI / 2;
  return Math.acos(Math.min(1, Math.max(-1, (minHeight - targetY) / distance)));
}

/**
 * M99: the keep-out solid round the hull: `hullClearanceM` outside its sides, ends and deck edge.
 * False beyond the hull's length (`halfBeamAt` is 0 there).
 */
export function insideHull(position: Vec3, data: BoatData = boat): boolean {
  const m = SCENE.camera.hullClearanceM;
  const [x, y, z] = position;
  if (x <= data.hull.transomX - m || x >= data.hull.stemX + m) return false;
  const xc = Math.min(data.hull.stemX, Math.max(data.hull.transomX, x));
  return Math.abs(z) < halfBeamAt(xc, data) + m && y < sheerAt(xc, data) + m;
}

/**
 * Keeps the camera above the water and outside the hull (PHASE1_SPEC 6.2, M99): water first, then
 * out of the hull along the line from `target` (no jump while orbiting close). Without a target,
 * or when that line never leaves the hull, it is lifted above the deck.
 */
export function clampCameraPosition(
  position: Vec3,
  target: Vec3 | null = null,
  data: BoatData = boat,
): Vec3 {
  const cam = SCENE.camera;
  const p: Vec3 = [position[0], Math.max(position[1], cam.minHeightAboveWater), position[2]];
  if (!insideHull(p, data)) return p;
  if (target) {
    const d = sub(p, target);
    const length = Math.hypot(d[0], d[1], d[2]);
    if (length >= 1e-6) {
      const u = scale(d, 1 / length);
      for (let s = length; s <= length + cam.hullPushMaxM; s += cam.hullPushStepM) {
        const q = add(target, scale(u, s));
        if (!insideHull(q, data) && q[1] >= cam.minHeightAboveWater) return q;
      }
    }
  }
  return [p[0], sheerAt(p[0], data) + cam.hullClearanceM, p[2]];
}

/**
 * M99: the pose a double-tap glides to: the camera stays where it is and turns to `point`; it
 * only moves along that line to stay between `minDistance` and `maxDistance`.
 */
export function centrePose(
  from: CameraPose,
  point: Vec3,
  minDistance: number,
  maxDistance: number,
  data: BoatData = boat,
): CameraPose {
  const target = clampTarget(point, data);
  const offset = sub(from.position, target);
  const d = Math.hypot(offset[0], offset[1], offset[2]);
  const u: Vec3 = d < 1e-6 ? normalize([0, 0.5, -1]) : scale(offset, 1 / d);
  const dist = Math.min(maxDistance, Math.max(minDistance, d));
  const position = clampCameraPosition(add(target, scale(u, dist)), target, data);
  return { position, target, fovDeg: from.fovDeg };
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
