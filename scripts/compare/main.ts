// Proportion check for M1 (PHASE1_SPEC 12): renders the 3D model with an orthographic camera
// at the same scale and origin as the reference sketches in docs/reference/ and lays the sketch
// on top. Used by `npm run shots` (served by the Vite dev server, not part of the app).
import * as THREE from 'three';
import { buildBoat } from '../../src/render3d/boat';
import { SCENE } from '../../src/render3d/sceneConfig';

/** Sketch frames, read from the SVG files: size in px, 40 px per metre, origin in px. */
const SKETCHES = {
  side: {
    file: 'hanse508-side.svg',
    width: 824,
    height: 1168,
    pxPerM: 40,
    origin: [428, 964],
    // Looking from starboard: bow to the right, as in the sketch.
    eye: [0, 0, 100],
    up: [0, 1, 0],
  },
  plan: {
    file: 'hanse508-plan.svg',
    width: 792,
    height: 400,
    pxPerM: 40,
    origin: [428, 196],
    // From above with port at the top and the bow to the right, as in the sketch.
    eye: [0, 100, 0],
    up: [0, 0, -1],
  },
} as const;

const view = new URLSearchParams(window.location.search).get('view') === 'plan' ? 'plan' : 'side';
const sketch = SKETCHES[view];
const stack = document.getElementById('stack') as HTMLElement;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(1);
renderer.setSize(sketch.width, sketch.height);
stack.append(renderer.domElement);

const scene = new THREE.Scene();
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
scene.add(sun, fill, buildBoat().root);

const [ox, oy] = sketch.origin;
const m = sketch.pxPerM;
const camera = new THREE.OrthographicCamera(
  -ox / m,
  (sketch.width - ox) / m,
  oy / m,
  -(sketch.height - oy) / m,
  0.1,
  500,
);
camera.position.fromArray(sketch.eye);
camera.up.fromArray(sketch.up);
camera.lookAt(0, 0, 0);
renderer.render(scene, camera);

const img = document.createElement('img');
img.src = `/sail-learn-and-train/docs/reference/${sketch.file}`;
img.width = sketch.width;
img.height = sketch.height;
img.addEventListener('load', () => {
  document.body.dataset.ready = '1';
});
stack.append(img);
