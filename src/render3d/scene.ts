import * as THREE from 'three';
import type { AppState, Store } from '../app/store';
import { highlightIds } from '../model/panelEntries';
import { runningRopes, winchWraps } from '../model/realistic';
import { boat } from '../model/boat';
import { halfBeamAt } from '../model/hullShape';
import { labelAnchors } from '../model/labels3d';
import { DEG } from '../model/angles';
import { area } from '../model/area';
import { sunPosition } from '../model/sun';
import { waveTrains } from '../model/waves';
import type { Vec3 } from '../model/vec3';
import type { Detail } from '../model/settings';
import type { RenderStats } from '../ui/debugOverlay';
import { buildBoat } from './boat';
import { daylighting } from './daylight';
import { cloudTexture, rippleNormalMap } from './environment';
import { buildMarina } from './marina';
import { buildMarks } from './marks';
import { buildSkyDome } from './skyDome';
import { skyColours } from './skyColours';
import { buildWaterSurface } from './waterSurface';
import { createCameraRig } from './cameraRig';
import { createPicker } from './picking';
import { SCENE } from './sceneConfig';
import { buildDangerZone } from './dangerZone';
import { buildWake } from './wake';
import { buildWindStreaks } from './wind';
import { createWorld } from './world';

export interface SceneView {
  /** The 3D view's canvas (the app listens for a lost graphics context). */
  readonly canvas: HTMLCanvasElement;
  /** The device pixel ratio the renderer uses (capped; lower at low detail). */
  readonly pixelRatio: number;
  /**
   * Resizes the drawing buffer; `bottomInset` CSS px at the bottom are covered by buttons and
   * `topInset` at the top by the time bar (M10). In the stacked (portrait) layout the Top view
   * shows the bow pointing up.
   */
  resize(
    width: number,
    height: number,
    bottomInset: number,
    stacked: boolean,
    topInset?: number,
  ): void;
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
  // The dome draws the sky; `render` sets the fog colour every frame.
  const dome = buildSkyDome(cloudTexture());
  scene.add(dome.object);
  scene.fog = new THREE.Fog(0xffffff, SCENE.fogNear, SCENE.fogFar);
  // The reflections: the dome seen from the boat, blurred by three.js (PMREM). Made at High
  // detail only, the first time they are needed (phones start on Low and skip the work), and
  // again when the sky has changed (PHASE3_SPEC 10.5).
  const skyScene = new THREE.Scene();
  const reflectionDome = new THREE.Mesh(dome.object.geometry, dome.object.material);
  reflectionDome.frustumCulled = false;
  skyScene.add(reflectionDome);
  let pmrem: THREE.PMREMGenerator | undefined;
  let reflections: THREE.WebGLRenderTarget | undefined;
  let reflectionsStale = true;
  let reflectionsAtMs = -Infinity;
  const reflectionsSun = new THREE.Vector3();
  scene.environmentIntensity = SCENE.light.environmentIntensity;

  const hemisphere = new THREE.HemisphereLight(
    SCENE.light.skyColor,
    SCENE.light.groundColor,
    SCENE.light.hemisphereIntensity,
  );
  const sun = new THREE.DirectionalLight(0xffffff, SCENE.light.sunIntensity);
  const fill = new THREE.DirectionalLight(0xffffff, SCENE.light.fillIntensity);
  // The detail's base light levels; `render` scales them by the time of day every frame.
  const baseLight = { hemisphere: 0, sun: 0, fill: 0 };
  const warmSun = new THREE.Color(SCENE.daylight.warmSun);
  const moonColour = new THREE.Color(SCENE.daylight.moonColour);
  const belowColour = new THREE.Color();
  const belowNight = new THREE.Color(SCENE.daylight.nightBelow);
  const belowDay = new THREE.Color(SCENE.sky.belowHorizon);
  fill.position.set(...SCENE.light.fillDirection);
  configureSunShadow(sun);
  scene.add(hemisphere, sun, sun.target, fill);

  const initial = store.getState();
  const holder = new THREE.Group();
  holder.name = 'boatHolder';
  let detail: Detail = initial.settings.detail;
  let boatModel = buildBoat(initial.controls, initial.rig, detail);
  let fendersOut = initial.harbour.fendersOut;
  boatModel.setFendersOut(fendersOut);
  let thrusters = initial.thrusters;
  boatModel.setThrusters(thrusters);
  holder.add(boatModel.root);
  const dangerZone = buildDangerZone();
  holder.add(dangerZone.object);
  const ripples = rippleNormalMap();
  const water = buildWaterSurface(ripples);
  const streaks = buildWindStreaks();
  const world = createWorld(water.object);
  const marks = buildMarks();
  world.group.add(marks.object);
  const marina = buildMarina();
  world.group.add(marina.object);
  const wake = buildWake();
  scene.add(holder, world.group, wake.object, streaks.object);

  const rig = createCameraRig(renderer.domElement);
  const camera = rig.camera;
  rig.goTo(store.getState().camera.preset, false);
  rig.onUserMove(() => store.dispatch({ type: 'setCameraPreset', preset: 'free' }));

  const picker = createPicker(camera, holder, water.pickTarget, [marks.object, marina.object]);
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
          const ndc = new THREE.Vector3(x, y, z).applyMatrix4(holder.matrixWorld).project(camera);
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
        /** Sets the flogging damage of the sails (0…1), so a torn sail can be shot at once (M9). */
        setDamage: (main: number, jib: number) => {
          const state = store.getState();
          store.dispatch({ type: 'load', state: { ...state, sailDamage: { main, jib } } });
        },
        /** Draw calls and triangles of the last frame. */
        stats: () => ({
          calls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
        }),
      },
    });
  }

  // Debug only (`?debug=1`): the gust profile of the last frame and a buoy's place on the canvas.
  if (store.getState().settings.debug) {
    Object.assign(window, {
      __sailWater: {
        gustProfile: () => water.gustProfile(),
        /** Where the drawn sun lies on the canvas (CSS px), or null while it is not drawn. */
        sunScreen: () => {
          if (!sunShown) return null;
          const rect = renderer.domElement.getBoundingClientRect();
          const ndc = sunPoint
            .copy(camera.position)
            .addScaledVector(lastSkyDirection, SCENE.sky.domeRadiusM)
            .project(camera);
          if (ndc.z > 1 || ndc.z < -1) return null;
          return { x: ((ndc.x + 1) / 2) * rect.width, y: ((1 - ndc.y) / 2) * rect.height };
        },
        buoyScreen: (id: string) => {
          const buoy = marks.buoyObject(id);
          if (!buoy) return null;
          const rect = renderer.domElement.getBoundingClientRect();
          const ndc = buoy.getWorldPosition(new THREE.Vector3()).project(camera);
          if (ndc.z > 1 || ndc.z < -1) return null;
          return { x: ((ndc.x + 1) / 2) * rect.width, y: ((1 - ndc.y) / 2) * rect.height };
        },
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
    // The reflections (High only) are made in `render`, when stale or when the sky has turned.
    scene.environment = high ? (reflections?.texture ?? null) : null;
    reflectionsStale = true;
    baseLight.hemisphere = high
      ? SCENE.light.hemisphereIntensityHigh
      : SCENE.light.hemisphereIntensity;
    baseLight.sun = high ? SCENE.light.sunIntensityHigh : SCENE.light.sunIntensity;
    baseLight.fill = high ? SCENE.light.fillIntensityHigh : SCENE.light.fillIntensity;
    water.setDetail(detail);
  };
  applyDetail();

  store.subscribe((state, previous) => {
    const preset = state.camera.preset;
    // The map leaves the 3D camera where it is: going back to the same view needs no move.
    if (preset !== 'map' && preset !== previous.camera.preset && preset !== rig.preset) {
      rig.goTo(preset);
    }
    if (state.settings.detail !== detail) {
      detail = state.settings.detail;
      holder.remove(boatModel.root);
      dispose(boatModel.root);
      boatModel = buildBoat(state.controls, state.rig, detail);
      boatModel.setFendersOut(state.harbour.fendersOut);
      boatModel.setThrusters(state.thrusters);
      holder.add(boatModel.root);
      highlight = createHighlighter(boatModel.root);
      highlight(highlightIds(state.selection));
      applyDetail();
    } else if (state.selection !== previous.selection) highlight(highlightIds(state.selection));
    // The fenders: a check of its own, since a Show me changes the selection and the fenders at once.
    if (state.harbour.fendersOut !== fendersOut) {
      fendersOut = state.harbour.fendersOut;
      boatModel.setFendersOut(fendersOut);
    }
    // The thrusters' water jets show while a joystick is held.
    if (state.thrusters !== thrusters) {
      thrusters = state.thrusters;
      boatModel.setThrusters(thrusters);
    }
  });

  const lastSkyDirection = new THREE.Vector3(0, 1, 0);
  const sunPoint = new THREE.Vector3();
  let sunShown = false;
  /** Makes the reflections of the sky (PHASE3_SPEC 10.5) when stale or the sky has turned. */
  const updateReflections = (now: number, skyDirection: THREE.Vector3) => {
    const turnedDeg = reflectionsSun.angleTo(skyDirection) / DEG;
    const due = reflectionsStale || turnedDeg >= SCENE.reflections.minTurnDeg;
    if (!due || (now - reflectionsAtMs) / 1000 < SCENE.reflections.minIntervalS) return;
    pmrem ??= new THREE.PMREMGenerator(renderer);
    const previousTarget = reflections;
    reflections = pmrem.fromScene(skyScene, 0, 0.1, SCENE.sky.domeRadiusM + 10, {
      size: SCENE.reflections.size,
    });
    previousTarget?.dispose();
    scene.environment = reflections.texture;
    reflectionsSun.copy(skyDirection);
    reflectionsStale = false;
    reflectionsAtMs = now;
  };

  let canvasHeight = 1;
  return {
    canvas: renderer.domElement,
    get pixelRatio() {
      return pixelRatio;
    },
    resize(width, height, bottomInset, stacked, topInset = 0) {
      if (width <= 0 || height <= 0) return;
      size = { width, height };
      renderer.setSize(width, height, false);
      canvasHeight = height;
      rig.setViewport(width, height, bottomInset, { topBowUp: stacked }, topInset);
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
        state.sailDamage,
      );
      dangerZone.update(state.rig);
      // The sails and the streaks feel the apparent wind (PHASE2_SPEC 6.6).
      // They move with the simulation clock, so they stand still while paused (issue #32).
      streaks.update(state.rig.wind.awaDeg, state.rig.wind.awsKn, state.rig.timeS);
      const { boat: boatState } = state;
      // She heels about her centreline at the waterline (+ = starboard rail down) and rides the
      // waves: lifted by the heave, bow up by the pitch, rolled further by the waves. The water,
      // the wake and the camera stay level.
      holder.position.y = boatState.waves.heaveM;
      holder.rotation.set(
        (boatState.heelDeg + boatState.waves.rollDeg) * DEG,
        0,
        boatState.waves.pitchDeg * DEG,
      );
      // The sun from the clock: its light, the night and the sky light (PHASE3_SPEC 9.6).
      const { elevationDeg, azimuthDeg } = sunPosition(
        state.clock.utcMs,
        area.position.latitudeDeg,
        area.position.longitudeDeg,
      );
      const light = daylighting(elevationDeg, azimuthDeg, boatState.headingDeg);
      sun.position
        .set(...SCENE.shadowCentre)
        .addScaledVector(light.sunDirection, SCENE.shadows.distance);
      sun.intensity = baseLight.sun * light.sun;
      sun.color.set(0xffffff).lerp(warmSun, light.warm);
      sun.castShadow = detail === 'high' && light.sun > SCENE.daylight.shadowMinSun;
      hemisphere.intensity = baseLight.hemisphere * light.sky;
      fill.intensity = baseLight.fill * light.sky;
      fill.color.set(0xffffff).lerp(moonColour, light.night);
      scene.environmentIntensity = SCENE.light.environmentIntensity * light.sky;
      // The sky for this sun height: the dome, the fog that meets it and the reflections.
      const colours = skyColours(elevationDeg);
      belowColour.copy(belowDay).lerp(belowNight, light.night);
      dome.update(camera, colours, light.skyDirection, boatState.headingDeg, belowColour);
      (scene.fog as THREE.Fog).color.copy(colours.horizon);
      lastSkyDirection.copy(light.skyDirection);
      sunShown = elevationDeg > SCENE.sky.sunCore.fadeFromDeg;
      const shift = world.update(boatState.eastM, boatState.northM, boatState.headingDeg);
      water.update(state, shift, waveTrains(state.sea), light.night);
      marks.update(state, water.heightAt);
      marina.update(state);
      wake.update(state, state.rig.timeS, water.heightAt);
      // At night the wake and the wind streaks are dimmed (they ignore the light).
      const dim = 1 - SCENE.daylight.nightLineDim * light.night;
      (wake.object.material as THREE.MeshBasicMaterial).color.setScalar(dim);
      (streaks.object.material as THREE.LineBasicMaterial).color
        .set(SCENE.wind.color)
        .multiplyScalar(dim);
      if (detail === 'high') updateReflections(now, light.skyDirection);
      renderer.render(scene, camera);
    },
    stats() {
      return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
    },
    labelPoints() {
      const rect = { width: size.width, height: canvasHeight };
      const points: ScreenPoint[] = [];
      const eye = camera.position;
      // Standing on board (e.g. the Helm view) the deck hides what is under the water.
      const onBoard =
        eye.y > 0 &&
        eye.x > boat.hull.transomX &&
        eye.x < boat.hull.stemX &&
        Math.abs(eye.z) < halfBeamAt(eye.x);
      for (const anchor of labelAnchors(store.getState().rig, boatModel.ropeDrawings())) {
        if (onBoard && anchor.point[1] < 0) continue;
        projected
          .set(...anchor.point)
          .applyMatrix4(holder.matrixWorld)
          .project(camera);
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
