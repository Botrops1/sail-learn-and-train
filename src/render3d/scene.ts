import * as THREE from 'three';
import type { AppState, Store } from '../app/store';
import { highlightIds } from '../model/panelEntries';
import { handlePose } from '../model/handlePose';
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
import { endSpotlight, onSpotlight, spotlightNow, type Spotlight } from '../ui/spotlight';
import { buildBoat } from './boat';
import { daylighting } from './daylight';
import { cloudTexture, rippleNormalMap } from './environment';
import { buildAnchorChain } from './anchorChain';
import { buildBay } from './bay';
import { buildMarina } from './marina';
import { buildSeabed } from './seabed';
import { buildMooringLines } from './mooringLines';
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
  // M49: the spotlight draws a frame in three passes; the debug overlay counts all of them.
  renderer.info.autoReset = false;
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
  let anchorStowed = initial.anchor.phase === 'stowed';
  boatModel.setAnchorStowed(anchorStowed);
  // M50: the winch handle is drawn in Realistic ropes only; the check is on the handle's identity.
  let drawnHandle: AppState['realistic']['handle'] | null = null;
  let drawnHandleShown: boolean | null = null;
  const syncHandle = (state: AppState, force = false) => {
    const show = state.settings.ropesMode === 'realistic';
    if (!force && state.realistic.handle === drawnHandle && show === drawnHandleShown) return;
    drawnHandle = state.realistic.handle;
    drawnHandleShown = show;
    boatModel.setHandle(show ? handlePose(state.realistic) : null, show);
  };
  syncHandle(initial, true);
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
  const seabed = buildSeabed(undefined, detail);
  world.group.add(seabed.object);
  const bay = buildBay();
  world.group.add(bay.object);
  const mooringLines = buildMooringLines();
  world.group.add(mooringLines.object);
  const anchorChain = buildAnchorChain(detail);
  world.group.add(anchorChain.object);
  const wake = buildWake();
  scene.add(holder, world.group, wake.object, streaks.object);

  const rig = createCameraRig(renderer.domElement);
  const camera = rig.camera;
  rig.goTo(store.getState().camera.preset, false);
  rig.onUserMove(() => store.dispatch({ type: 'setCameraPreset', preset: 'free' }));

  const picker = createPicker(camera, holder, water.pickTarget, [
    marks.object,
    marina.object,
    seabed.object,
    bay.object,
    mooringLines.object,
    anchorChain.object,
  ]);
  listenForTaps(renderer.domElement, (x, y) => {
    // A tap on the 3D view ends the spotlight; its glide back starts after OrbitControls' 'start'.
    stopSpotlight(true);
    const rect = renderer.domElement.getBoundingClientRect();
    const partId = picker.pick(x, y, rect.width, rect.height);
    const state = store.getState();
    // M50: the first tap on the handle selects it; the second walks to its station and takes it
    // (not in Learn, where the Ropes section has no stations to put it back).
    if (
      partId === 'part_winch_handle' &&
      state.selection === 'part_winch_handle' &&
      state.settings.ropesMode === 'realistic' &&
      state.appMode !== 'learn' &&
      state.realistic.handle.place !== 'carried'
    ) {
      store.dispatch({
        type: 'realistic',
        action: { type: 'station', station: state.realistic.handle.station },
      });
      store.dispatch({ type: 'realistic', action: { type: 'handle', to: 'carry' } });
      return;
    }
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
        /** M49: the spotlight now and the camera's distance to its target. */
        spotlight: () => {
          const now = spotlightNow();
          if (!now) return null;
          const pose = rig.pose();
          const [p, t] = [pose.position, pose.target];
          return {
            partId: now.partId,
            kind: now.kind,
            distanceM: Math.hypot(p[0] - t[0], p[1] - t[1], p[2] - t[2]),
          };
        },
        /** M49: where the camera is now. */
        cameraPose: () => {
          const pose = rig.pose();
          return { position: pose.position, target: pose.target };
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
    seabed.setDetail(detail);
  };
  applyDetail();

  store.subscribe((state, previous) => {
    const preset = state.camera.preset;
    // The map leaves the 3D camera where it is: going back to the same view needs no move.
    if (preset !== 'map' && preset !== previous.camera.preset && preset !== rig.preset) {
      // (A preset chosen drops the focus itself: its own glide runs.)
      stopSpotlight(null);
      rig.goTo(preset);
    }
    // M49: the spotlight ends, and the camera stays, when something else is chosen.
    if (
      spot &&
      ((state.selection !== previous.selection && state.selection !== null) ||
        state.appMode !== previous.appMode ||
        state.settings.detail !== previous.settings.detail)
    ) {
      stopSpotlight(false);
    }
    if (state.settings.detail !== detail) {
      detail = state.settings.detail;
      holder.remove(boatModel.root);
      dispose(boatModel.root);
      boatModel = buildBoat(state.controls, state.rig, detail);
      boatModel.setFendersOut(state.harbour.fendersOut);
      boatModel.setThrusters(state.thrusters);
      boatModel.setAnchorStowed(anchorStowed);
      syncHandle(state, true);
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
    // The boat's own anchor is hidden while the anchor is down (the chain draws it at its end).
    if ((state.anchor.phase === 'stowed') !== anchorStowed) {
      anchorStowed = state.anchor.phase === 'stowed';
      boatModel.setAnchorStowed(anchorStowed);
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

  // M49 (issue #77): the spotlight of "Where is it?" and "Show it working" (PHASE8_SPEC 7.4).
  // The camera glides close to the part, a veil darkens the frame and the part is drawn again
  // over it. It lasts until a tap, Escape, a drag or another choice; the store never knows.
  interface ActiveSpot {
    meshes: THREE.Mesh[];
    lit: THREE.Object3D[];
    removeListeners: () => void;
  }
  let spot: ActiveSpot | null = null;
  let veil: { scene: THREE.Scene; camera: THREE.OrthographicCamera } | undefined;
  const SPOT_LAYER = 1;

  /** Ends the spotlight; `glide` true glides the camera back, false leaves it, null leaves the focus to the caller. */
  function stopSpotlight(glide: boolean | null): void {
    if (!spot) return;
    if (glide !== null) rig.endFocus(glide);
    endSpotlight();
  }

  function clearSpot(): void {
    if (!spot) return;
    for (const object of spot.lit) object.layers.disable(SPOT_LAYER);
    spot.removeListeners();
    spot = null;
  }

  function visibleUpTree(object: THREE.Object3D): boolean {
    for (let o: THREE.Object3D | null = object; o; o = o.parent) if (!o.visible) return false;
    return true;
  }

  function startSpotlight(request: Spotlight): void {
    const ids = new Set(highlightIds(request.partId));
    boatModel.root.updateWorldMatrix(true, true);
    const meshes: THREE.Mesh[] = [];
    boatModel.root.traverse((object) => {
      const data = object.userData as { partId?: string };
      if (
        object instanceof THREE.Mesh &&
        data.partId &&
        ids.has(data.partId) &&
        visibleUpTree(object)
      ) {
        meshes.push(object);
      }
    });
    if (meshes.length === 0) {
      // A part in the world group (the quay) or a hidden one: only today's selection.
      endSpotlight();
      return;
    }
    const box = new THREE.Box3();
    const instance = new THREE.Vector3();
    const half = SCENE.spotlight.instanceHalfM;
    for (const mesh of meshes) {
      const points = (mesh.userData as { hitPoints?: Vec3[] }).hitPoints ?? [];
      if (points.length > 1) {
        // Drawn several times in one mesh (cleats, fenders): the instance nearest to the camera.
        let best = Infinity;
        const nearest = new THREE.Vector3();
        for (const point of points) {
          instance.set(...point).applyMatrix4(mesh.matrixWorld);
          const d = instance.distanceToSquared(camera.position);
          if (d < best) {
            best = d;
            nearest.copy(instance);
          }
        }
        box.expandByPoint(nearest.clone().subScalar(half));
        box.expandByPoint(nearest.clone().addScalar(half));
      } else {
        box.union(new THREE.Box3().setFromObject(mesh));
      }
    }
    const where = request.kind === 'where';
    rig.focus(
      { min: box.min.toArray() as Vec3, max: box.max.toArray() as Vec3 },
      where ? SCENE.spotlight.whereFill : SCENE.spotlight.showFill,
      SCENE.camera.maxDistance,
      // "Show it working" only ever comes closer than the pose the camera is at or gliding to.
      !where,
    );
    // The meshes and every light go on layer 1, so the part can be drawn again over the veil.
    const lit: THREE.Object3D[] = [...meshes];
    scene.traverse((object) => {
      if ((object as THREE.Light).isLight) lit.push(object);
    });
    for (const object of lit) object.layers.enable(SPOT_LAYER);
    // The tap that started it must not end it: the listeners come on the next frame.
    let armed = 0;
    let cancelled = false;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target !== renderer.domElement) stopSpotlight(true);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') stopSpotlight(true);
    };
    const onPopState = () => stopSpotlight(false);
    armed = requestAnimationFrame(() => {
      if (cancelled) return;
      document.addEventListener('pointerdown', onPointerDown, true);
    });
    document.addEventListener('keydown', onKey);
    window.addEventListener('popstate', onPopState);
    spot = {
      meshes,
      lit,
      removeListeners: () => {
        cancelled = true;
        cancelAnimationFrame(armed);
        document.removeEventListener('pointerdown', onPointerDown, true);
        document.removeEventListener('keydown', onKey);
        window.removeEventListener('popstate', onPopState);
      },
    };
  }

  onSpotlight((request) => {
    clearSpot();
    if (request) startSpotlight(request);
  });
  rig.onUserDrag(() => stopSpotlight(false));

  /** A frame with the spotlight: the scene, the veil, then the spotlit meshes again (7.4). */
  function renderSpotlit(): void {
    if (!veil) {
      const quad = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.MeshBasicMaterial({
          color: SCENE.spotlight.dimColor,
          transparent: true,
          opacity: SCENE.spotlight.dimOpacity,
          depthTest: false,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      quad.frustumCulled = false;
      const veilScene = new THREE.Scene();
      veilScene.add(quad);
      veil = { scene: veilScene, camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
    }
    renderer.autoClear = false;
    renderer.clear();
    renderer.render(scene, camera);
    renderer.render(veil.scene, veil.camera);
    camera.layers.set(SPOT_LAYER);
    const shadowAuto = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false;
    renderer.render(scene, camera);
    camera.layers.set(0);
    renderer.shadowMap.autoUpdate = shadowAuto;
    renderer.autoClear = true;
  }

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
      syncHandle(state);
      camera.updateMatrixWorld();
      // Pixel size at 1 m: the projection's vertical scale over the canvas height (CSS px).
      const ropeView = {
        eye: camera.position.toArray() as [number, number, number],
        metresPerPixelAt1m: 2 / (camera.projectionMatrix.elements[5] * canvasHeight),
      };
      boatModel.update(
        state.rig,
        state.controls,
        ropeView,
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
      seabed.update(state);
      bay.update(state, water.heightAt);
      mooringLines.update(state, ropeView);
      anchorChain.update(state, ropeView);
      wake.update(state, state.rig.timeS, water.heightAt);
      // At night the wake and the wind streaks are dimmed (they ignore the light).
      const dim = 1 - SCENE.daylight.nightLineDim * light.night;
      (wake.object.material as THREE.MeshBasicMaterial).color.setScalar(dim);
      (streaks.object.material as THREE.LineBasicMaterial).color
        .set(SCENE.wind.color)
        .multiplyScalar(dim);
      if (detail === 'high') updateReflections(now, light.skyDirection);
      renderer.info.reset();
      if (spot) renderSpotlit();
      else renderer.render(scene, camera);
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
