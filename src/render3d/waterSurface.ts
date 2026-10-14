import * as THREE from 'three';
import type { AppState } from '../app/store';
import { smoothstep } from '../model/angles';
import { boat } from '../model/boat';
import { modulo } from '../model/mapFrame';
import { requirePartId } from '../model/registry';
import type { Detail } from '../model/settings';
import { elevation, type WaveTrain } from '../model/waves';
import {
  gustAt,
  gustProfile,
  upwindDistanceM,
  whitecapAmount,
  whitecapCoverage,
  whitecapPatch,
  type GustProfile,
} from '../model/windOnWater';
import { SCENE } from './sceneConfig';

export interface WaterSurface {
  /** Added to the world group (moved by `world.update`). */
  object: THREE.Group;
  /** The flat invisible plane the picker hits (part id env_water). */
  pickTarget: THREE.Object3D;
  setDetail(detail: Detail): void;
  /**
   * Heights, normals and ripples for the state; `shift` is what `world.update` returned;
   * `trains` = waveTrains(state.sea), computed once per frame in scene.render; `night`
   * (0 … 1, M17) takes the colours towards the dark night water.
   */
  update(
    state: AppState,
    shift: { x: number; z: number; centreEastM: number; centreNorthM: number },
    trains: readonly WaveTrain[],
    night: number,
  ): void;
  /**
   * The drawn surface height at a map offset from the boat: elevation × the inner mesh's fade at
   * that point (0 beyond the inner mesh), for the wake and (M16) the buoys.
   */
  heightAt(dEastM: number, dNorthM: number): number;
  /** The gust profile of the last frame (the debug hook of the browser checks), or null. */
  gustProfile(): GustProfile | null;
}

/**
 * Water (PHASE3_SPEC 6.6): an inner mesh of vertices around the boat that carries the waves, with
 * the scale grid drawn along its edges, a flat outer mesh out to the edge of the water, and an
 * invisible flat plane to tap. The group steps along the map in whole `stepM` so every vertex
 * stays on a fixed map point; the ripples stay fixed on the map too. Local x is north, z is east.
 *
 * M16: both meshes carry vertex colours (the base colour of the detail level goes into them):
 * darker water in more wind, a dark patch where a gust is about to arrive (and a light one for a
 * lull), and white crests on the inner mesh (PHASE3_SPEC 8.4).
 */
export function buildWaterSurface(ripples: THREE.Texture): WaterSurface {
  const w = SCENE.water;
  const partId = requirePartId('env_water');
  const group = new THREE.Group();
  group.userData.partId = partId;
  ripples.repeat.set(1, 1);

  const high = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: w.roughness,
    metalness: 0,
    normalMap: ripples,
    normalScale: new THREE.Vector2(w.rippleStrength, w.rippleStrength),
    transparent: true,
    opacity: w.opacity,
    depthWrite: false,
  });
  const low = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    vertexColors: true,
    transparent: true,
    opacity: w.lowOpacity,
    depthWrite: false,
  });
  const gridMaterial = new THREE.LineBasicMaterial({
    color: SCENE.grid.color,
    transparent: true,
    opacity: SCENE.grid.opacity,
    depthWrite: false,
  });

  const half = w.waves.halfSizeM;
  const fadeStart = w.waves.fadeStartM;
  let cell: number = w.waves.cellM;
  let perSide = 0;
  let innerPositions = new Float32Array(0);
  let innerNormals = new Float32Array(0);
  let innerColours = new Float32Array(0);
  let outerPositions = new Float32Array(0);
  let outerColours = new Float32Array(0);
  let innerGeometry = new THREE.BufferGeometry();
  const inner = new THREE.Mesh<THREE.BufferGeometry, THREE.Material>(innerGeometry, high);
  inner.receiveShadow = true;
  inner.frustumCulled = false;
  inner.userData.partId = partId;
  const grid = new THREE.LineSegments(new THREE.BufferGeometry(), gridMaterial);
  grid.frustumCulled = false;
  grid.renderOrder = 1;
  grid.userData.partId = partId;
  const outer = new THREE.Mesh<THREE.BufferGeometry, THREE.Material>(
    new THREE.BufferGeometry(),
    high,
  );
  outer.userData.partId = partId;
  outer.receiveShadow = false;

  const pickTarget = new THREE.Mesh(
    new THREE.PlaneGeometry(w.size, w.size),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  pickTarget.rotation.x = -Math.PI / 2;
  pickTarget.userData.partId = partId;

  group.add(inner, grid, outer, pickTarget);

  /** True while the inner mesh is already flat, so the height work can be skipped. */
  let flat = false;
  /** True after a rebuild: the colours of both meshes must be written again. */
  let coloursStale = true;
  let baseColour = new THREE.Color(w.color);
  let lastWindKn = Number.NaN;
  let lastNight = Number.NaN;
  let lastProfile: GustProfile | null = null;
  const windyColour = new THREE.Color(w.windyColor);
  const gustColour = new THREE.Color(w.gustColor);
  const lullColour = new THREE.Color(w.lullColor);
  const whitecapColour = new THREE.Color(w.whitecapColor);
  const nightWaterColour = new THREE.Color(SCENE.daylight.nightWater);
  const crestColour = new THREE.Color();
  const nightTint = new THREE.Color();
  const gustNow = new THREE.Color();
  const lullNow = new THREE.Color();
  const colour = new THREE.Color();
  const windy = new THREE.Color();

  /** The inner mesh for the current cell size, and the grid lines that share its positions. */
  const buildInner = () => {
    perSide = Math.round((2 * half) / cell) + 1;
    const count = perSide * perSide;
    innerPositions = new Float32Array(count * 3);
    innerNormals = new Float32Array(count * 3);
    innerColours = new Float32Array(count * 3);
    const uvs = new Float32Array(count * 2);
    for (let iz = 0; iz < perSide; iz += 1) {
      for (let ix = 0; ix < perSide; ix += 1) {
        const i = iz * perSide + ix;
        const x = -half + ix * cell;
        const z = -half + iz * cell;
        innerPositions.set([x, 0, z], i * 3);
        innerNormals.set([0, 1, 0], i * 3);
        uvs.set([x / w.rippleTileM, -z / w.rippleTileM], i * 2);
      }
    }
    const triangles: number[] = [];
    const lines: number[] = [];
    for (let iz = 0; iz < perSide; iz += 1) {
      for (let ix = 0; ix < perSide; ix += 1) {
        const i = iz * perSide + ix;
        if (ix < perSide - 1) lines.push(i, i + 1);
        if (iz < perSide - 1) lines.push(i, i + perSide);
        if (ix < perSide - 1 && iz < perSide - 1) {
          // Counter-clockwise seen from above (+y), with x north and z east.
          triangles.push(i, i + perSide, i + 1, i + 1, i + perSide, i + perSide + 1);
        }
      }
    }
    const position = new THREE.BufferAttribute(innerPositions, 3);
    position.setUsage(THREE.DynamicDrawUsage);
    const normal = new THREE.BufferAttribute(innerNormals, 3);
    normal.setUsage(THREE.DynamicDrawUsage);
    const next = new THREE.BufferGeometry();
    next.setAttribute('position', position);
    next.setAttribute('normal', normal);
    next.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    const colour = new THREE.BufferAttribute(innerColours, 3);
    colour.setUsage(THREE.DynamicDrawUsage);
    next.setAttribute('color', colour);
    next.setIndex(triangles);
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', position);
    lineGeometry.setIndex(lines);
    inner.geometry = next;
    grid.geometry.dispose();
    grid.geometry = lineGeometry;
    innerGeometry.dispose();
    innerGeometry = next;
    flat = true;
    coloursStale = true;
  };

  /**
   * The flat outer water: a grid of shared vertices `outerCellM` apart, with the triangles of the
   * cells whose centres lie outside the inner square (so the inner mesh's waves meet it at y = 0).
   */
  const buildOuter = () => {
    const cellM = w.outerCellM;
    const cells = Math.round(w.size / cellM);
    const perSideOuter = cells + 1;
    const origin = -w.size / 2;
    outerPositions = new Float32Array(perSideOuter * perSideOuter * 3);
    outerColours = new Float32Array(perSideOuter * perSideOuter * 3);
    const normals = new Float32Array(perSideOuter * perSideOuter * 3);
    const uvs = new Float32Array(perSideOuter * perSideOuter * 2);
    for (let ix = 0; ix < perSideOuter; ix += 1) {
      for (let iz = 0; iz < perSideOuter; iz += 1) {
        const i = ix * perSideOuter + iz;
        const x = origin + ix * cellM;
        const z = origin + iz * cellM;
        outerPositions.set([x, 0, z], i * 3);
        normals[i * 3 + 1] = 1;
        uvs.set([x / w.rippleTileM, -z / w.rippleTileM], i * 2);
      }
    }
    const triangles: number[] = [];
    for (let ix = 0; ix < cells; ix += 1) {
      for (let iz = 0; iz < cells; iz += 1) {
        const x0 = origin + ix * cellM;
        const z0 = origin + iz * cellM;
        if (Math.max(Math.abs(x0 + cellM / 2), Math.abs(z0 + cellM / 2)) < half) continue;
        const i = ix * perSideOuter + iz;
        triangles.push(i, i + 1, i + perSideOuter, i + perSideOuter, i + 1, i + perSideOuter + 1);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(outerPositions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    const colour = new THREE.BufferAttribute(outerColours, 3);
    colour.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('color', colour);
    geometry.setIndex(triangles);
    outer.geometry.dispose();
    outer.geometry = geometry;
    coloursStale = true;
  };

  buildInner();
  buildOuter();

  let lastShift = { x: 0, z: 0 };
  let lastTrains: readonly WaveTrain[] = [];
  let lastPhases: readonly number[] = [];
  const fadeAt = (x: number, z: number) =>
    1 - smoothstep(fadeStart, half, Math.max(Math.abs(x), Math.abs(z)));

  return {
    object: group,
    pickTarget,
    setDetail(detail) {
      const material = detail === 'high' ? high : low;
      inner.material = material;
      outer.material = material;
      gridMaterial.opacity = detail === 'high' ? SCENE.grid.opacityHigh : SCENE.grid.opacity;
      cell = detail === 'high' ? w.waves.cellM : w.waves.cellLowM;
      baseColour = new THREE.Color(detail === 'high' ? w.color : w.lowColor);
      buildInner();
      buildOuter();
    },
    update(state, shift, trains, night) {
      lastShift = shift;
      lastTrains = trains;
      lastPhases = state.boat.waves.phases;
      // The ripples grow with the wind (M10): TWS / 12 kn, between 0.3 and 2.
      const scale = Math.min(
        w.rippleScaleMax,
        Math.max(w.rippleScaleMin, state.wind.twsKn / w.rippleReferenceKn),
      );
      high.normalScale.set(w.rippleStrength * scale, w.rippleStrength * scale);
      // The ripples drift with the simulation clock (they stand still while paused, issue #32).
      // The plane's u runs north, its v runs west. Offsets wrap: keep them small for precision.
      const drift = (w.rippleDriftMPerS * state.rig.timeS) / w.rippleTileM;
      ripples.offset.set(
        modulo(drift + shift.centreNorthM / w.rippleTileM, 1),
        modulo(drift * 0.6 - shift.centreEastM / w.rippleTileM, 1),
      );

      // Colours (M16): darker in more wind, a dark patch where a gust will arrive, white crests.
      const windKn = state.wind.twsKn;
      const profile = gustProfile(state.controls, state.windMode, state.rig.timeS);
      lastProfile = profile;
      const nightChanged = night !== lastNight;
      const windChanged = windKn !== lastWindKn || nightChanged;
      lastWindKn = windKn;
      lastNight = night;
      const darkness = w.windDarkAmount * smoothstep(w.windDarkFromKn, w.windDarkToKn, windKn);
      // At night the base colour goes dark first, then the wind darkens it (PHASE3_SPEC 9.6).
      // The wind, gust and lull colours go dark with it, or they would light the night water.
      windy
        .copy(baseColour)
        .lerp(nightWaterColour, night)
        .lerp(nightTint.copy(windyColour).lerp(nightWaterColour, night), darkness);
      gustNow.copy(gustColour).lerp(nightWaterColour, night);
      lullNow.copy(lullColour).lerp(nightWaterColour, night);
      crestColour
        .copy(whitecapColour)
        .lerp(nightWaterColour, SCENE.daylight.nightWhitecapDim * night);
      const windDir = state.controls.ctl_wind_dir;
      const coverage = trains.length > 0 ? whitecapCoverage(windKn) : 0;
      const amplitudeSum = trains.reduce((sum, train) => sum + train.amplitudeM, 0);
      const boatEast = state.boat.eastM;
      const boatNorth = state.boat.northM;
      // Patches are never smaller than 1.5 vertex cells, or they could not be drawn.
      const patchSizeM = Math.max(boat.waves.whitecaps.patchSizeM, 1.5 * cell);
      /** Writes the colour of the vertex at a map offset from the boat (before any crest). */
      const tint = (east: number, north: number) => {
        colour.copy(windy);
        if (!profile) return;
        const g = gustAt(profile, upwindDistanceM(east, north, windDir));
        if (g > 0) colour.lerp(gustNow, w.gustAmount * g);
        else if (g < 0) colour.lerp(lullNow, w.lullAmount * -g);
      };

      if (coloursStale || windChanged || profile) {
        const next = outerColours;
        const side = Math.round(w.size / w.outerCellM) + 1;
        const outerOrigin = -w.size / 2;
        for (let ix = 0; ix < side; ix += 1) {
          const north = shift.x + outerOrigin + ix * w.outerCellM;
          for (let iz = 0; iz < side; iz += 1) {
            tint(shift.z + outerOrigin + iz * w.outerCellM, north);
            const i = (ix * side + iz) * 3;
            next[i] = colour.r;
            next[i + 1] = colour.g;
            next[i + 2] = colour.b;
          }
        }
        outer.geometry.getAttribute('color').needsUpdate = true;
      }

      const heights = trains.length > 0;
      if (!heights && !flat) {
        for (let i = 0; i < perSide * perSide; i += 1) {
          innerPositions[i * 3 + 1] = 0;
          innerNormals[i * 3] = 0;
          innerNormals[i * 3 + 1] = 1;
          innerNormals[i * 3 + 2] = 0;
        }
        flat = true;
        inner.geometry.getAttribute('position').needsUpdate = true;
        inner.geometry.getAttribute('normal').needsUpdate = true;
      }
      const rows = trains.map((train, j) => ({
        a: train.amplitudeM,
        k: train.k,
        dE: train.dirEast,
        dN: train.dirNorth,
        phase: lastPhases[j] ?? 0,
      }));
      if (heights) flat = false;
      // Without waves the inner colours only change with the wind, as the outer ones do.
      const innerColoursChange = heights || coloursStale || windChanged || profile !== null;
      if (heights || innerColoursChange) {
        for (let iz = 0; iz < perSide; iz += 1) {
          const z = -half + iz * cell;
          const east = shift.z + z;
          for (let ix = 0; ix < perSide; ix += 1) {
            const x = -half + ix * cell;
            const north = shift.x + x;
            const f = fadeAt(x, z);
            const i = (iz * perSide + ix) * 3;
            let eta = 0;
            if (heights) {
              let slopeEast = 0;
              let slopeNorth = 0;
              for (const r of rows) {
                const arg = r.phase + r.k * (r.dE * east + r.dN * north);
                eta += r.a * Math.cos(arg);
                const slope = r.a * r.k * Math.sin(arg);
                slopeEast -= slope * r.dE;
                slopeNorth -= slope * r.dN;
              }
              innerPositions[i + 1] = f * eta;
              const nx = -f * slopeNorth;
              const nz = -f * slopeEast;
              const length = Math.hypot(nx, 1, nz);
              innerNormals[i] = nx / length;
              innerNormals[i + 1] = 1 / length;
              innerNormals[i + 2] = nz / length;
            }
            tint(east, north);
            if (heights) {
              // Foam only in scattered patches fixed on the map, not along whole crest lines.
              const crest = f * whitecapAmount(eta, amplitudeSum, coverage);
              if (crest > 0) {
                const white =
                  w.whitecapMax *
                  crest *
                  whitecapPatch(boatEast + east, boatNorth + north, patchSizeM);
                if (white > 0) colour.lerp(crestColour, white);
              }
            }
            innerColours[i] = colour.r;
            innerColours[i + 1] = colour.g;
            innerColours[i + 2] = colour.b;
          }
        }
        if (heights) {
          inner.geometry.getAttribute('position').needsUpdate = true;
          inner.geometry.getAttribute('normal').needsUpdate = true;
        }
        inner.geometry.getAttribute('color').needsUpdate = true;
      }
      coloursStale = false;
    },
    gustProfile() {
      return lastProfile;
    },
    heightAt(dEastM, dNorthM) {
      const x = dNorthM - lastShift.x;
      const z = dEastM - lastShift.z;
      if (Math.max(Math.abs(x), Math.abs(z)) >= half) return 0;
      return fadeAt(x, z) * elevation(lastTrains, lastPhases, dEastM, dNorthM);
    },
  };
}
