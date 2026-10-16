import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CameraPreset } from '../model/settings';
import type { Vec3 } from '../model/vec3';
import {
  clampCameraPosition,
  clampTarget,
  presetPose,
  type CameraPose,
  type Lens,
  type PresetOptions,
} from './cameraPresets';
import { SCENE } from './sceneConfig';

export interface CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  /** The preset the camera is at or moving to; `free` after a hand move. */
  readonly preset: CameraPreset;
  /** Moves to a preset with a short transition (or jumps there if `animate` is false). */
  goTo(preset: CameraPreset, animate?: boolean): void;
  /**
   * Call when the drawing size or layout changes. `bottomInset` (CSS px) is covered by the
   * camera buttons: presets frame the boat in the area above it.
   */
  /**
   * `bottomInset` CSS px at the bottom are covered by buttons; `topInset` at the top by the time
   * bar (M10): the camera aims at the middle of the free area between them.
   */
  setViewport(
    width: number,
    height: number,
    bottomInset: number,
    options: PresetOptions,
    topInset?: number,
  ): void;
  /** Call once per frame before rendering. */
  update(now: number): void;
  /** Called when the user moves the camera by hand (drag, pinch, wheel). */
  onUserMove(listener: () => void): void;
  /** Debug only (screenshots of close-ups): puts the camera at a pose as if moved by hand. */
  setPose(pose: CameraPose): void;
}

/**
 * Orbit camera with presets (PHASE1_SPEC 6.2): one-finger / left drag rotates, pinch / wheel
 * zooms, two-finger / right drag pans, with damping. Presets glide there in 0.5 s. The camera is
 * kept above the water and outside the hull.
 *
 * `free` is what the camera becomes when moved by hand. Choosing Free again returns to where the
 * user last left it in this session (it is not stored in the URL); before that it is the default
 * view.
 */
export function createCameraRig(domElement: HTMLElement): CameraRig {
  const cam = SCENE.camera;
  const camera = new THREE.PerspectiveCamera(cam.verticalFovDeg, 1, cam.near, cam.far);
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.dampingFactor = cam.dampingFactor;
  controls.minDistance = cam.minDistance;
  controls.maxDistance = cam.maxDistance;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

  let currentPreset: CameraPreset = 'free';
  let movedByHand = false;
  let lastFreePose: CameraPose | undefined;
  let interacting = false;
  let tween: { from: CameraPose; to: CameraPose; start: number } | undefined;
  const listeners: (() => void)[] = [];

  controls.addEventListener('start', () => {
    interacting = true;
    tween = undefined;
  });
  controls.addEventListener('end', () => {
    interacting = false;
  });
  controls.addEventListener('change', () => {
    if (!interacting) return;
    movedByHand = true;
    if (currentPreset !== 'free') {
      currentPreset = 'free';
      listeners.forEach((listener) => listener());
    }
  });

  let viewport = { width: 1, height: 1, inset: 0, top: 0 };
  let options: PresetOptions = {};
  /** The lens the whole-boat presets are fitted with: the area above the buttons. */
  let lens: Lens = { verticalFovDeg: cam.verticalFovDeg, aspect: 1 };

  /**
   * Renders a window of a taller virtual image whose centre is the centre of the free area
   * between the bar at the top (`top`) and the buttons at the bottom (`inset`), so the camera
   * aims at the middle of the free area.
   */
  function updateProjection(): void {
    const { width, height, inset, top } = viewport;
    // Window coordinates: the free area is [top, height − inset], its centre `c`. The virtual
    // image is as tall as needed to put that centre in its middle.
    const centre = (top + height - inset) / 2;
    const offset = Math.max(0, height - 2 * centre);
    const virtualHeight = 2 * (offset + centre);
    camera.aspect = width / virtualHeight;
    camera.setViewOffset(width, virtualHeight, 0, offset, width, height);
    camera.updateProjectionMatrix();
  }

  const currentPose = (): CameraPose => ({
    position: camera.position.toArray() as [number, number, number],
    target: controls.target.toArray() as [number, number, number],
    fovDeg: camera.fov,
  });
  /**
   * A preset must be able to stand as far away as it needs to fit the boat in a small free area
   * (a phone at half height), also beyond the orbit limit; the limit holds for hand zooming
   * again as soon as a preset needs less.
   */
  const allowDistanceOf = (pose: CameraPose) => {
    const distance = Math.hypot(
      pose.position[0] - pose.target[0],
      pose.position[1] - pose.target[1],
      pose.position[2] - pose.target[2],
    );
    controls.maxDistance = Math.max(cam.maxDistance, distance * 1.001);
  };
  const apply = (pose: CameraPose) => {
    camera.position.set(...pose.position);
    controls.target.set(...pose.target);
    camera.lookAt(controls.target);
    if (camera.fov !== pose.fovDeg) {
      camera.fov = pose.fovDeg;
      updateProjection();
    }
  };

  function poseFor(preset: CameraPreset): CameraPose {
    if (preset === 'free' && lastFreePose) return lastFreePose;
    return presetPose(preset, lens, options);
  }

  return {
    camera,
    get preset() {
      return currentPreset;
    },
    goTo(preset, animate = true) {
      if (currentPreset === 'free' && movedByHand) lastFreePose = currentPose();
      currentPreset = preset;
      const to = poseFor(preset);
      allowDistanceOf(to);
      if (animate) tween = { from: currentPose(), to, start: performance.now() };
      else {
        tween = undefined;
        apply(to);
        controls.update();
      }
    },
    setViewport(width, height, bottomInset, presetOptions, topInset = 0) {
      let inset = Math.min(Math.max(0, bottomInset), height * cam.maxBottomInsetShare);
      let top = Math.min(Math.max(0, topInset), height * cam.maxTopInsetShare);
      // A small phone at half height: the boat still gets `minFreePx`; the top gives way first.
      const shortBy = cam.minFreePx - (height - inset - top);
      if (shortBy > 0) {
        const fromTop = Math.min(top, shortBy);
        top -= fromTop;
        inset = Math.max(0, inset - (shortBy - fromTop));
      }
      viewport = { width, height, inset, top };
      options = presetOptions;
      updateProjection();
      const tanHalf = Math.tan((cam.verticalFovDeg * Math.PI) / 360);
      const free = height - inset - top;
      const virtualHeight =
        2 * (Math.max(0, height - (top + height - inset)) + (top + height - inset) / 2);
      lens = {
        verticalFovDeg: (Math.atan((tanHalf * free) / virtualHeight) * 360) / Math.PI,
        aspect: width / free,
      };
      // A preset keeps the whole boat in view when the screen rotates or folds; so does the
      // default view opened by a `cam=free` link until the user moves the camera.
      if ((currentPreset !== 'free' || !movedByHand) && !interacting) {
        const to = presetPose(currentPreset, lens, options);
        allowDistanceOf(to);
        if (tween) tween.to = to;
        else apply(to);
      }
    },
    update(now) {
      if (tween) {
        const t = Math.min(1, (now - tween.start) / (cam.transitionS * 1000));
        apply(interpolatePose(tween.from, tween.to, easeInOut(t)));
        if (t >= 1) tween = undefined;
        return;
      }
      controls.update();
      const position = clampCameraPosition(camera.position.toArray() as Vec3);
      const target = clampTarget(controls.target.toArray() as Vec3);
      camera.position.set(...position);
      controls.target.set(...target);
      camera.lookAt(controls.target);
      if (currentPreset === 'free' && movedByHand) lastFreePose = currentPose();
    },
    onUserMove(listener) {
      listeners.push(listener);
    },
    setPose(pose) {
      tween = undefined;
      movedByHand = true;
      currentPreset = 'free';
      apply(pose);
      controls.update();
      lastFreePose = currentPose();
    },
  };
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Glides the orbit centre in a straight line and the camera around it (distance, height angle
 * and the shorter way round), so a preset change never cuts through the boat.
 */
function interpolatePose(from: CameraPose, to: CameraPose, t: number): CameraPose {
  const target = new THREE.Vector3(...from.target).lerp(new THREE.Vector3(...to.target), t);
  const a = new THREE.Spherical().setFromVector3(
    new THREE.Vector3(...from.position).sub(new THREE.Vector3(...from.target)),
  );
  const b = new THREE.Spherical().setFromVector3(
    new THREE.Vector3(...to.position).sub(new THREE.Vector3(...to.target)),
  );
  let dTheta = b.theta - a.theta;
  if (dTheta > Math.PI) dTheta -= 2 * Math.PI;
  if (dTheta < -Math.PI) dTheta += 2 * Math.PI;
  const s = new THREE.Spherical(
    a.radius + (b.radius - a.radius) * t,
    a.phi + (b.phi - a.phi) * t,
    a.theta + dTheta * t,
  );
  const position = new THREE.Vector3().setFromSpherical(s).add(target);
  return {
    position: position.toArray() as [number, number, number],
    target: target.toArray() as [number, number, number],
    fovDeg: from.fovDeg + (to.fovDeg - from.fovDeg) * t,
  };
}
