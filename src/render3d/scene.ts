import * as THREE from 'three';
import { hullBounds, type Box3 } from '../model/boat';
import { requirePartId } from '../model/registry';
import { SCENE } from './sceneConfig';

export interface SceneView {
  readonly pixelRatio: number;
  /** Resizes the drawing buffer to the host element. */
  resize(width: number, height: number): void;
  render(): void;
}

/**
 * M0 scene: sky colour, semi-transparent water plane at y = 0 with a scale grid,
 * and a placeholder box where the hull will be. Boat frame = three.js frame:
 * x forward, y up, z starboard (PHASE1_SPEC 4).
 */
export function createScene(host: HTMLElement): SceneView {
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
  scene.add(sun);

  const bounds = hullBounds();
  scene.add(buildPlaceholder(bounds));
  scene.add(buildWater());

  const camera = new THREE.PerspectiveCamera(
    SCENE.camera.verticalFovDeg,
    1,
    SCENE.camera.near,
    SCENE.camera.far,
  );
  const target = new THREE.Vector3(
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  );
  const radius =
    new THREE.Vector3(...bounds.max).sub(new THREE.Vector3(...bounds.min)).length() / 2;

  function frameCamera(aspect: number): void {
    const vFov = THREE.MathUtils.degToRad(SCENE.camera.verticalFovDeg);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const distance = (radius * SCENE.camera.framingMargin) / Math.sin(Math.min(vFov, hFov) / 2);
    const azimuth = THREE.MathUtils.degToRad(SCENE.camera.azimuthFromBowDeg);
    const elevation = THREE.MathUtils.degToRad(SCENE.camera.elevationDeg);
    // Port is -z; azimuth 0 = towards the bow (+x).
    const direction = new THREE.Vector3(
      Math.cos(elevation) * Math.cos(azimuth),
      Math.sin(elevation),
      -Math.cos(elevation) * Math.sin(azimuth),
    );
    camera.position.copy(target).addScaledVector(direction, distance);
    camera.lookAt(target);
  }

  return {
    pixelRatio,
    resize(width, height) {
      if (width <= 0 || height <= 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      frameCamera(camera.aspect);
    },
    render() {
      renderer.render(scene, camera);
    },
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

/** Stand-in for the hull until M1 builds the real model: the hull's bounding box. */
function buildPlaceholder(bounds: Box3): THREE.Object3D {
  const size = new THREE.Vector3(...bounds.max).sub(new THREE.Vector3(...bounds.min));
  const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
  const box = new THREE.Mesh(
    geometry,
    new THREE.MeshLambertMaterial({ color: SCENE.placeholder.color }),
  );
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color: SCENE.placeholder.edgeColor }),
  );
  box.add(edges);
  box.position.set(
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  );
  box.userData.partId = requirePartId('part_hull');
  edges.userData.partId = box.userData.partId;
  return box;
}
