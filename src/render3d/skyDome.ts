import * as THREE from 'three';
import { DEG, smoothstep } from '../model/angles';
import type { SkyColours } from './skyColours';
import { SCENE } from './sceneConfig';

/**
 * The sky (PHASE3_SPEC 10.4): a big sphere seen from inside that follows the camera, painted by
 * a shader from the colours for the sun's height (`skyColours.ts`): a gradient, cloud patches,
 * the glow and the disc of the sun, and stars at night. Clouds and stars stay fixed over the sea
 * while the boat turns. Not tone-mapped, like the fogged water it meets at the horizon.
 */
export interface SkyDome {
  object: THREE.Mesh;
  /** After rig.update and camera.updateMatrixWorld. `skyDirection`: towards the sun at its true elevation, boat frame. */
  update(
    camera: THREE.Camera,
    colours: SkyColours,
    skyDirection: THREE.Vector3,
    headingDeg: number,
    below: THREE.Color,
  ): void;
}

const VERTEX = /* glsl */ `
varying vec3 vDir;
void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uBelow;
uniform vec3 uGlow;
uniform vec3 uCloud;
uniform vec3 uSunDir;
uniform float uGlowStrength;
uniform float uHalo;
uniform float uStars;
uniform float uHeading;
uniform float uCloudOpacity;
uniform float uStarThreshold;
uniform float uStarCells;
uniform float uSunCore;
uniform vec2 uSunCoreCos;
uniform sampler2D uClouds;
varying vec3 vDir;

void main() {
  vec3 d = normalize(vDir);
  float el = asin(clamp(d.y, -1.0, 1.0));
  float t = el < 0.0 ? min(1.0, -el / 0.25) : pow(max(0.0, sin(el)), 0.6);
  vec3 col = mix(uHorizon, el < 0.0 ? uBelow : uZenith, t);

  // The direction on the map: the world group turns the map by +heading about y, undo it.
  float mx = d.x * cos(uHeading) - d.z * sin(uHeading);
  float mz = d.x * sin(uHeading) + d.z * cos(uHeading);

  float u = atan(mz, mx) / 6.2831853 + 0.5;
  float v = el / 3.1415927 + 0.5;
  float a = texture2D(uClouds, vec2(u, v)).a;
  float band = el > 0.0 ? sin(min(1.0, el / 0.9) * 3.1415927) : 0.0;
  col = mix(col, uCloud, a * band * uCloudOpacity);

  float s = max(0.0, dot(d, uSunDir));
  col = mix(col, uGlow, clamp(pow(s, 48.0) * uGlowStrength + pow(s, 4.0) * 0.25 * uHalo, 0.0, 1.0));
  // The sun's disc: a bright core in the glow, fading out as it sets.
  col = mix(col, mix(uGlow, vec3(1.0), 0.6), smoothstep(uSunCoreCos.y, uSunCoreCos.x, s) * uSunCore);

  if (uStars > 0.0 && el > 0.0) {
    vec2 g = vec2(degrees(atan(mz, mx)) * cos(el), degrees(el)) * uStarCells;
    vec2 cell = floor(g);
    vec2 p = fract(cell * vec2(0.1031, 0.1030));
    p += dot(p, p.yx + 33.33);
    float n = fract((p.x + p.y) * p.x);
    float r = length(fract(g) - 0.5);
    col += vec3(step(uStarThreshold, n) * (1.0 - smoothstep(0.05, 0.15, r)) * uStars * smoothstep(0.0, 0.15, el));
  }

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

export function buildSkyDome(clouds: THREE.Texture): SkyDome {
  const s = SCENE.sky;
  const uniforms = {
    uZenith: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uBelow: { value: new THREE.Color() },
    uGlow: { value: new THREE.Color() },
    uCloud: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uGlowStrength: { value: 0 },
    uHalo: { value: 0 },
    uStars: { value: 0 },
    uHeading: { value: 0 },
    uCloudOpacity: { value: s.cloudOpacity },
    uStarThreshold: { value: s.starThreshold },
    uStarCells: { value: s.starCellsPerDeg },
    uSunCore: { value: 0 },
    uSunCoreCos: {
      value: new THREE.Vector2(
        Math.cos(s.sunCore.innerDeg * DEG),
        Math.cos(s.sunCore.outerDeg * DEG),
      ),
    },
    uClouds: { value: clouds },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(s.domeRadiusM, s.domeWidthSegments, s.domeHeightSegments),
    material,
  );
  mesh.name = 'skyDome';
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;
  return {
    object: mesh,
    update(camera, colours, skyDirection, headingDeg, below) {
      mesh.position.copy(camera.position);
      uniforms.uZenith.value.copy(colours.zenith);
      uniforms.uHorizon.value.copy(colours.horizon);
      uniforms.uBelow.value.copy(below);
      uniforms.uGlow.value.copy(colours.glow);
      uniforms.uCloud.value.copy(colours.cloud);
      uniforms.uSunDir.value.copy(skyDirection);
      uniforms.uGlowStrength.value = colours.glowStrength;
      uniforms.uHalo.value = colours.haloStrength;
      uniforms.uStars.value = colours.stars;
      uniforms.uHeading.value = headingDeg * DEG;
      const elevationDeg = Math.asin(Math.min(1, Math.max(-1, skyDirection.y))) / DEG;
      uniforms.uSunCore.value = smoothstep(
        s.sunCore.fadeFromDeg,
        s.sunCore.fadeToDeg,
        elevationDeg,
      );
    },
  };
}
