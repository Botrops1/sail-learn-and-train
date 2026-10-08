import * as THREE from 'three';
import type { Store } from '../app/store';
import { requirePartId } from '../model/registry';
import { buildBoat } from './boat';
import { createCameraRig } from './cameraRig';
import { createPicker } from './picking';
import { SCENE } from './sceneConfig';

export interface SceneView {
  readonly pixelRatio: number;
  /**
   * Resizes the drawing buffer; `bottomInset` CSS px at the bottom are covered by buttons.
   * In the stacked (portrait) layout the Top view shows the bow pointing up.
   */
  resize(width: number, height: number, bottomInset: number, stacked: boolean): void;
  render(now: number): void;
}

/**
 * The 3D view (PHASE1_SPEC 6): sky, semi-transparent water with a scale grid, the static
 * Hanse 508 (M1), the orbit camera with presets, and tap-to-identify.
 * Boat frame = three.js frame: x forward, y up, z starboard (PHASE1_SPEC 4).
 */
export function createScene(host: HTMLElement, store: Store): SceneView {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  const pixelRatio = Math.min(window.devicePixelRatio || 1, SCENE.maxPixelRatio);
  renderer.setPixelRatio(pixelRatio);
  renderer.domElement.classList.add('scene-canvas');
  host.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SCENE.skyColor);
  scene.fog = new THREE.Fog(SCENE.skyColor, SCENE.fogNear, SCENE.fogFar);

  scene.add(
    new THREE.HemisphereLight(
      SCENE.light.skyColor,
      SCENE.light.groundColor,
      SCENE.light.hemisphereIntensity,
    ),
  );
  const sun = new THREE.DirectionalLight(0xffffff, SCENE.light.sunIntensity);
  sun.position.set(...SCENE.light.sunDirection);
  const fill = new THREE.DirectionalLight(0xffffff, SCENE.light.fillIntensity);
  fill.position.set(...SCENE.light.fillDirection);
  scene.add(sun, fill);

  const boatModel = buildBoat();
  const water = buildWater();
  scene.add(boatModel.root, water);

  const rig = createCameraRig(renderer.domElement);
  const camera = rig.camera;
  rig.goTo(store.getState().camera.preset, false);
  rig.onUserMove(() => store.dispatch({ type: 'setCameraPreset', preset: 'free' }));

  const picker = createPicker(camera, boatModel.root, water);
  listenForTaps(renderer.domElement, (x, y) => {
    const rect = renderer.domElement.getBoundingClientRect();
    const partId = picker.pick(x, y, rect.width, rect.height);
    store.dispatch({ type: 'select', partId });
  });

  const highlight = createHighlighter(boatModel.root);
  highlight(store.getState().selection);

  store.subscribe((state, previous) => {
    const preset = state.camera.preset;
    if (preset !== previous.camera.preset && preset !== rig.preset) rig.goTo(preset);
    if (state.selection !== previous.selection) highlight(state.selection);
  });

  return {
    pixelRatio,
    resize(width, height, bottomInset, stacked) {
      if (width <= 0 || height <= 0) return;
      renderer.setSize(width, height, false);
      rig.setViewport(width, height, bottomInset, { topBowUp: stacked });
    },
    render(now) {
      rig.update(now);
      renderer.render(scene, camera);
    },
  };
}

/**
 * Calls `onTap` with canvas coordinates for a short single-finger press that did not move
 * (a drag rotates the camera instead).
 */
function listenForTaps(canvas: HTMLElement, onTap: (x: number, y: number) => void): void {
  const { tapMaxMovePx, tapMaxDurationMs } = SCENE.picking;
  const down = new Map<number, { x: number; y: number; time: number }>();
  let multiTouch = false;
  canvas.addEventListener('pointerdown', (event) => {
    down.set(event.pointerId, { x: event.clientX, y: event.clientY, time: event.timeStamp });
    if (down.size > 1) multiTouch = true;
  });
  const finish = (event: PointerEvent, cancelled: boolean) => {
    const start = down.get(event.pointerId);
    down.delete(event.pointerId);
    const wasMulti = multiTouch;
    if (down.size === 0) multiTouch = false;
    if (!start || cancelled || wasMulti || event.button > 0) return;
    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (moved > tapMaxMovePx || event.timeStamp - start.time > tapMaxDurationMs) return;
    const rect = canvas.getBoundingClientRect();
    onTap(event.clientX - rect.left, event.clientY - rect.top);
  };
  canvas.addEventListener('pointerup', (event) => finish(event, false));
  canvas.addEventListener('pointercancel', (event) => finish(event, true));
}

/** Tints every mesh of the selected part (each part has its own material, see partMesh). */
function createHighlighter(root: THREE.Object3D): (partId: string | null) => void {
  const byPart = new Map<string, THREE.MeshLambertMaterial[]>();
  root.traverse((object) => {
    const id = (object.userData as { partId?: string }).partId;
    if (!id || !(object instanceof THREE.Mesh)) return;
    const material = object.material as THREE.Material;
    if (material instanceof THREE.MeshLambertMaterial) {
      byPart.set(id, [...(byPart.get(id) ?? []), material]);
    }
  });
  let current: string | null = null;
  return (partId) => {
    for (const material of byPart.get(current ?? '') ?? []) material.emissive.setHex(0x000000);
    current = partId;
    for (const material of byPart.get(partId ?? '') ?? []) {
      material.emissive.set(SCENE.highlight.color);
      material.emissiveIntensity = SCENE.highlight.intensity;
    }
  };
}

function buildWater(): THREE.Object3D {
  const group = new THREE.Group();
  group.userData.partId = requirePartId('env_water');

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(SCENE.water.size, SCENE.water.size),
    new THREE.MeshBasicMaterial({
      color: SCENE.water.color,
      transparent: true,
      opacity: SCENE.water.opacity,
      depthWrite: false,
    }),
  );
  plane.rotation.x = -Math.PI / 2;
  plane.userData.partId = group.userData.partId;

  const divisions = Math.round(SCENE.grid.size / SCENE.grid.cellSize);
  const grid = new THREE.GridHelper(SCENE.grid.size, divisions, SCENE.grid.color, SCENE.grid.color);
  const gridMaterial = grid.material as THREE.Material;
  gridMaterial.transparent = true;
  gridMaterial.opacity = SCENE.grid.opacity;
  gridMaterial.depthWrite = false;
  grid.userData.partId = group.userData.partId;

  group.add(plane, grid);
  return group;
}
