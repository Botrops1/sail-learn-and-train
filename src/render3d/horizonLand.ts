import * as THREE from 'three';
import { area, type AreaData } from '../model/area';
import { DEG } from '../model/angles';
import { HORIZON_LAYERS, horizonProfile, type HorizonLayer } from '../model/horizonLand';
import { requirePartId } from '../model/registry';
import { SCENE } from './sceneConfig';

/**
 * The distant land (PHASE_HORIZON_SPEC 1.5): hills, mountains and islands round the horizon, one
 * ring (a strip standing on the sea) per layer. The strips follow the camera across the sea but
 * never up or down, and turn with the map, so the land stays on the compass and is never reached.
 */
export interface HorizonLand {
  object: THREE.Group;
  layers: Readonly<Record<HorizonLayer, THREE.Mesh>>;
  /** Every frame, after the camera has moved. `horizon` is the sky's horizon colour (not changed). */
  update(camera: THREE.Camera, headingDeg: number, horizon: THREE.Color, night: number): void;
}

/** One layer's strip: local frame x = north, z = east, y = up (the world group's frame). */
function layerGeometry(profile: readonly number[], radiusM: number): THREE.BufferGeometry {
  const n = profile.length;
  const step = (2 * Math.PI) / n;
  const positions = new Float32Array(2 * (n + 1) * 3);
  const index: number[] = [];
  for (let i = 0; i <= n; i += 1) {
    const b = i * step;
    const x = radiusM * Math.cos(b);
    const z = radiusM * Math.sin(b);
    const top = radiusM * Math.tan((profile[i % n] as number) * DEG);
    positions.set([x, 0, z, x, top, z], i * 6);
    if (i < n) {
      const a = 2 * i;
      index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(index);
  return geometry;
}

export function buildHorizonLand(areaData: AreaData = area): HorizonLand {
  const config = SCENE.horizonLand;
  const partId = requirePartId('env_distant_land');
  const object = new THREE.Group();
  object.name = 'horizon-land';
  const layers = {} as Record<HorizonLayer, THREE.Mesh>;
  const dayColours = {} as Record<HorizonLayer, THREE.Color>;
  for (const layer of HORIZON_LAYERS) {
    const settings = config[layer];
    const profile = horizonProfile(areaData.horizonLand.ridges, layer, config.stepDeg);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(settings.dayColour),
      side: THREE.DoubleSide,
      fog: false,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(layerGeometry(profile, settings.radiusM), material);
    mesh.name = `horizon-land-${layer}`;
    mesh.userData.partId = partId;
    // The strip is seen from inside the ring: never cull it by a bounding sphere at its middle.
    mesh.frustumCulled = false;
    layers[layer] = mesh;
    dayColours[layer] = new THREE.Color(settings.dayColour);
    object.add(mesh);
  }
  const nightHorizon = new THREE.Color();
  const mixed = new THREE.Color();
  return {
    object,
    layers,
    update(camera, headingDeg, horizon, night) {
      object.position.set(camera.position.x, 0, camera.position.z);
      object.rotation.y = headingDeg * DEG;
      nightHorizon.copy(horizon).multiplyScalar(config.nightShade);
      for (const layer of HORIZON_LAYERS) {
        mixed.copy(dayColours[layer]).lerp(horizon, config[layer].haze).lerp(nightHorizon, night);
        (layers[layer].material as THREE.MeshBasicMaterial).color.copy(mixed);
      }
    },
  };
}
