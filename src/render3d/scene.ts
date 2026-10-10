import * as THREE from 'three';
import type { AppState, Store } from '../app/store';
import { highlightIds } from '../model/panelEntries';
import { runningRopes, winchWraps } from '../model/realistic';
import { requirePartId } from '../model/registry';
import { labelAnchors } from '../model/labels3d';
import type { Vec3 } from '../model/vec3';
import type { Detail } from '../model/settings';
import type { RenderStats } from '../ui/debugOverlay';
import { buildBoat } from './boat';
import { rippleNormalMap, skyTexture, sunDirection } from './environment';
import { createCameraRig } from './cameraRig';
import { createPicker } from './picking';
import { SCENE } from './sceneConfig';
import { buildWindStreaks } from './wind';

export interface SceneView {
  /** The 3D view's canvas (the app listens for a lost graphics context). */
  readonly canvas: HTMLCanvasElement;
  /** The device pixel ratio the renderer uses (capped; lower at low detail). */
  readonly pixelRatio: number;
  /**
   * Resizes the drawing buffer; `bottomInset` CSS px at the bottom are covered by buttons.
   * In the stacked (portrait) layout the Top view shows the bow pointing up.
   */
  resize(width: number, height: number, bottomInset: number, stacked: boolean): void;
  render(now: number): void;
  /** Draw calls and triangles of the last frame (debug overlay). */
  stats(): RenderStats;
  /**
   * Where each label of the labels in 3D sits on the canvas now (CSS px, M5), in priority order;
   * points behind the camera are left out.
   */
  labelPoints(): ScreenPoint[];
}

export interface ScreenPoint {
  id: string;
  x: number;
  y: number;
}

/**
 * The 3D view (PHASE1_SPEC 6): sky, semi-transparent water with a scale grid, the Hanse 508
 * with its moving boom, mainsail and ropes, wind streaks, the orbit camera with presets, and
 * tap-to-identify. Each frame draws the rig as the store holds it.
 * Boat frame = three.js frame: x forward, y up, z starboard (PHASE1_SPEC 4).
 *
 * M3b: a procedural sky that the boat and the water reflect, rippled water and, at high detail,
 * soft sun shadows. Changing the detail rebuilds the boat with the other materials.
 */
export function createScene(host: HTMLElement, store: Store): SceneView {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = SCENE.light.toneMappingExposure;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.classList.add('scene-canvas');
  host.append(renderer.domElement);

  const scene = new THREE.Scene();
  const sky = skyTexture();
  scene.background = sky;
  scene.fog = new THREE.Fog(SCENE.sky.horizon, SCENE.fogNear, SCENE.fogFar);
  // The blurred sky for reflections is made the first time High detail is used (phones
  // start on Low and skip the work).
  let reflections: THREE.Texture | undefined;
  const reflectionsOf = () => {
    if (!reflections) {
      const pmrem = new THREE.PMREMGenerator(renderer);
      reflections = pmrem.fromEquirectangular(sky).texture;
      pmrem.dispose();
    }
    return reflections;
  };
  scene.environmentIntensity = SCENE.light.environmentIntensity;

  const hemisphere = new THREE.HemisphereLight(
    SCENE.light.skyColor,
    SCENE.light.groundColor,
    SCENE.light.hemisphereIntensity,
  );
  const sun = new THREE.DirectionalLight(0xffffff, SCENE.light.sunIntensity);
  const fill = new THREE.DirectionalLight(0xffffff, SCENE.light.fillIntensity);
  fill.position.set(...SCENE.light.fillDirection);
  configureSunShadow(sun);
  scene.add(hemisphere, sun, sun.target, fill);

  const initial = store.getState();
  const holder = new THREE.Group();
  holder.name = 'boatHolder';
  let detail: Detail = initial.settings.detail;
  let boatModel = buildBoat(initial.controls, initial.rig, detail);
  holder.add(boatModel.root);
  const ripples = rippleNormalMap();
  const water = buildWater(ripples);
  const streaks = buildWindStreaks();
  scene.add(holder, water.object, streaks.object);

  const rig = createCameraRig(renderer.domElement);
  const camera = rig.camera;
  rig.goTo(store.getState().camera.preset, false);
  rig.onUserMove(() => store.dispatch({ type: 'setCameraPreset', preset: 'free' }));

  const picker = createPicker(camera, holder, water.object);
  listenForTaps(renderer.domElement, (x, y) => {
    const rect = renderer.domElement.getBoundingClientRect();
    const partId = picker.pick(x, y, rect.width, rect.height);
    store.dispatch({ type: 'select', partId });
  });

  // Debug only (`?debug=1`): lets the screenshot script aim taps at small and thin parts.
  if (store.getState().settings.debug) {
    Object.assign(window, {
      __sailDebug: {
        hitCentres: () => {
          const rect = renderer.domElement.getBoundingClientRect();
          return picker.hitCentres(rect.width, rect.height);
        },
        /** Canvas position (CSS px) of a point in boat coordinates. */
        project: (x: number, y: number, z: number) => {
          const rect = renderer.domElement.getBoundingClientRect();
          const ndc = new THREE.Vector3(x, y, z).project(camera);
          return { x: ((ndc.x + 1) / 2) * rect.width, y: ((1 - ndc.y) / 2) * rect.height };
        },
        /** Canvas position (CSS px) of a point along a part's pick segments (e.g. a rope). */
        partPoint: (partId: string, fraction = 0.5) => {
          let found: THREE.Vector3 | undefined;
          boatModel.root.traverse((object) => {
            const segments = (object.userData as { partId?: string; pickSegments?: Vec3[][] })
              .pickSegments;
            if (found || object.userData.partId !== partId || !segments?.length) return;
            const segment = segments[Math.floor(fraction * (segments.length - 1))];
            if (!segment?.[0] || !segment[1]) return;
            found = new THREE.Vector3(...segment[0])
              .lerp(new THREE.Vector3(...segment[1]), 0.5)
              .applyMatrix4(object.matrixWorld);
          });
          if (!found) return null;
          const rect = renderer.domElement.getBoundingClientRect();
          const ndc = found.project(camera);
          return { x: ((ndc.x + 1) / 2) * rect.width, y: ((1 - ndc.y) / 2) * rect.height };
        },
        /** Puts the camera at a position looking at a target (close-up screenshots). */
        setView: (position: Vec3, target: Vec3, fovDeg: number = SCENE.camera.verticalFovDeg) =>
          rig.setPose({ position, target, fovDeg }),
        /** Draw calls and triangles of the last frame. */
        stats: () => ({
          calls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
        }),
      },
    });
  }

  // Ropes that share a control light up together (PHASE1_SPEC 7.2), e.g. the outhaul with the
  // main furling line, or the rudder with both wheels.
  let highlight = createHighlighter(boatModel.root);
  highlight(highlightIds(store.getState().selection));

  let size = { width: 1, height: 1 };
  let pixelRatio = 1;
  /** Puts the renderer, lights, water and materials in the given detail level. */
  const applyDetail = () => {
    const high = detail === 'high';
    pixelRatio = Math.min(
      window.devicePixelRatio || 1,
      high ? SCENE.maxPixelRatio : SCENE.maxPixelRatioLow,
    );
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(size.width, size.height, false);
    renderer.shadowMap.enabled = high;
    sun.castShadow = high;
    scene.environment = high ? reflectionsOf() : null;
    hemisphere.intensity = high
      ? SCENE.light.hemisphereIntensityHigh
      : SCENE.light.hemisphereIntensity;
    sun.intensity = high ? SCENE.light.sunIntensityHigh : SCENE.light.sunIntensity;
    fill.intensity = high ? SCENE.light.fillIntensityHigh : SCENE.light.fillIntensity;
    water.setDetail(detail);
  };
  applyDetail();

  store.subscribe((state, previous) => {
    const preset = state.camera.preset;
    if (preset !== previous.camera.preset && preset !== rig.preset) rig.goTo(preset);
    if (state.settings.detail !== detail) {
      detail = state.settings.detail;
      holder.remove(boatModel.root);
      dispose(boatModel.root);
      boatModel = buildBoat(state.controls, state.rig, detail);
      holder.add(boatModel.root);
      highlight = createHighlighter(boatModel.root);
      highlight(highlightIds(state.selection));
      applyDetail();
    } else if (state.selection !== previous.selection) highlight(highlightIds(state.selection));
  });

  let canvasHeight = 1;
  return {
    canvas: renderer.domElement,
    get pixelRatio() {
      return pixelRatio;
    },
    resize(width, height, bottomInset, stacked) {
      if (width <= 0 || height <= 0) return;
      size = { width, height };
      renderer.setSize(width, height, false);
      canvasHeight = height;
      rig.setViewport(width, height, bottomInset, { topBowUp: stacked });
    },
    render(now) {
      const state = store.getState();
      rig.update(now);
      camera.updateMatrixWorld();
      // Pixel size at 1 m: the projection's vertical scale over the canvas height (CSS px).
      boatModel.update(
        state.rig,
        state.controls,
        {
          eye: camera.position.toArray() as [number, number, number],
          metresPerPixelAt1m: 2 / (camera.projectionMatrix.elements[5] * canvasHeight),
        },
        flashingRopes(state),
        state.settings.ropesMode === 'realistic' ? winchWraps(state.realistic) : undefined,
      );
      streaks.update(state.controls.ctl_wind_dir, state.controls.ctl_wind_speed, now / 1000);
      water.update(now / 1000);
      renderer.render(scene, camera);
    },
    stats() {
      return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
    },
    labelPoints() {
      const rect = { width: size.width, height: canvasHeight };
      const points: ScreenPoint[] = [];
      for (const anchor of labelAnchors(store.getState().rig, boatModel.ropeDrawings())) {
        projected.set(...anchor.point).project(camera);
        // Behind the camera (or beyond the far plane): no label.
        if (projected.z > 1 || projected.z < -1) continue;
        points.push({
          id: anchor.id,
          x: ((projected.x + 1) / 2) * rect.width,
          y: ((1 - projected.y) / 2) * rect.height,
        });
      }
      return points;
    },
  };
}

const projected = new THREE.Vector3();

const NO_ROPES: ReadonlySet<string> = new Set();

/**
 * Ropes running out in Realistic mode flash (PHASE1_SPEC 7.2.2): on for half of each period of
 * the simulation clock, so they stand still while paused.
 */
function flashingRopes(state: AppState): ReadonlySet<string> {
  if (state.settings.ropesMode !== 'realistic') return NO_ROPES;
  const running = runningRopes(state.realistic);
  if (running.size === 0) return NO_ROPES;
  const phase = (state.rig.timeS * SCENE.ropes.runningFlashHz) % 1;
  return phase < 0.5 ? running : NO_ROPES;
}

/**
 * Sun shadows (high detail): an orthographic shadow camera over the boat and its mast, along
 * the sun direction, soft-edged (PCF filter).
 */
function configureSunShadow(sun: THREE.DirectionalLight): void {
  const s = SCENE.shadows;
  const centre = new THREE.Vector3(...SCENE.shadowCentre);
  sun.target.position.copy(centre);
  sun.position.copy(centre).addScaledVector(sunDirection(), s.distance);
  sun.shadow.mapSize.set(s.mapSize, s.mapSize);
  const cam = sun.shadow.camera;
  cam.left = -s.halfExtent;
  cam.right = s.halfExtent;
  cam.top = s.halfExtent;
  cam.bottom = -s.halfExtent;
  cam.near = 1;
  cam.far = 2 * s.distance;
  cam.updateProjectionMatrix();
  sun.shadow.radius = s.radius;
  sun.shadow.bias = s.bias;
  sun.shadow.normalBias = s.normalBias;
}

/** Frees the GPU memory of a removed boat (geometries and the cloned materials). */
function dispose(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) (material as THREE.Material).dispose();
  });
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

/**
 * Tints every mesh of the selected parts (each part has its own material, see partMesh). Works
 * with any material that has an emissive colour.
 */
function createHighlighter(root: THREE.Object3D): (partIds: string[]) => void {
  type Emissive = THREE.Material & { emissive: THREE.Color; emissiveIntensity: number };
  const byPart = new Map<string, Emissive[]>();
  root.traverse((object) => {
    const id = (object.userData as { partId?: string }).partId;
    if (!id || !(object instanceof THREE.Mesh)) return;
    const material = object.material as THREE.Material;
    if ('emissive' in material && material.emissive instanceof THREE.Color) {
      byPart.set(id, [...(byPart.get(id) ?? []), material as Emissive]);
    }
  });
  let current: string[] = [];
  return (partIds) => {
    for (const id of current) {
      for (const material of byPart.get(id) ?? []) material.emissive.setHex(0x000000);
    }
    current = partIds;
    for (const id of current) {
      for (const material of byPart.get(id) ?? []) {
        material.emissive.set(SCENE.highlight.color);
        material.emissiveIntensity = SCENE.highlight.intensity;
      }
    }
  };
}

interface Water {
  object: THREE.Object3D;
  setDetail(detail: Detail): void;
  /** Drifts the ripples. */
  update(timeS: number): void;
}

/**
 * Water (PHASE1_SPEC 6.1; M3b): a large plane at y = 0, see-through so the keel stays
 * visible, with drifting ripples that catch the sky's reflections at high detail, and a faint
 * scale grid.
 */
function buildWater(ripples: THREE.Texture): Water {
  const w = SCENE.water;
  const group = new THREE.Group();
  group.userData.partId = requirePartId('env_water');
  ripples.repeat.set(w.size / w.rippleTileM, w.size / w.rippleTileM);

  const high = new THREE.MeshStandardMaterial({
    color: w.color,
    roughness: w.roughness,
    metalness: 0,
    normalMap: ripples,
    normalScale: new THREE.Vector2(w.rippleStrength, w.rippleStrength),
    transparent: true,
    opacity: w.opacity,
    depthWrite: false,
  });
  const low = new THREE.MeshLambertMaterial({
    color: w.lowColor,
    transparent: true,
    opacity: w.lowOpacity,
    depthWrite: false,
  });
  const plane = new THREE.Mesh<THREE.PlaneGeometry, THREE.Material>(
    new THREE.PlaneGeometry(w.size, w.size),
    high,
  );
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  plane.userData.partId = group.userData.partId;

  const divisions = Math.round(SCENE.grid.size / SCENE.grid.cellSize);
  const grid = new THREE.GridHelper(SCENE.grid.size, divisions, SCENE.grid.color, SCENE.grid.color);
  const gridMaterial = grid.material as THREE.Material;
  gridMaterial.transparent = true;
  gridMaterial.depthWrite = false;
  grid.position.y = 0.005;
  grid.userData.partId = group.userData.partId;

  group.add(plane, grid);
  return {
    object: group,
    setDetail(detail) {
      plane.material = detail === 'high' ? high : low;
      gridMaterial.opacity = detail === 'high' ? SCENE.grid.opacityHigh : SCENE.grid.opacity;
    },
    update(timeS) {
      const drift = (w.rippleDriftMPerS * timeS) / w.rippleTileM;
      ripples.offset.set(drift, drift * 0.6);
    },
  };
}
