import * as THREE from 'three';
import { seededRandom } from './boat/textures';
import { SCENE } from './sceneConfig';

/**
 * Sky and water (M3b), procedural: no image files. The sky is an equirectangular texture
 * (gradient, a soft glow round the sun, cloud patches) used as the background and, blurred by
 * three.js (PMREM), for reflections. The water gets a tiling ripple normal map.
 */

/** Unit vector towards the sun (the same as the sun light). */
export function sunDirection(): THREE.Vector3 {
  return new THREE.Vector3(...SCENE.light.sunDirection).normalize();
}

/** Smooth value noise on a grid that wraps every `period` cells (tileable). */
function valueNoise(random: () => number, period: number): (x: number, y: number) => number {
  const grid = Array.from({ length: period * period }, () => random());
  const at = (i: number, j: number) =>
    grid[(((j % period) + period) % period) * period + (((i % period) + period) % period)] ?? 0;
  const fade = (t: number) => t * t * (3 - 2 * t);
  return (x, y) => {
    const i = Math.floor(x);
    const j = Math.floor(y);
    const u = fade(x - i);
    const v = fade(y - j);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * u;
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * u;
    return a + (b - a) * v;
  };
}

export function skyTexture(): THREE.DataTexture {
  const s = SCENE.sky;
  const width = s.width;
  const height = s.height;
  const random = seededRandom(2018);
  const octaves = [8, 16, 32].map((period) => ({ period, noise: valueNoise(random, period) }));
  const zenith = new THREE.Color(s.zenith);
  const horizon = new THREE.Color(s.horizon);
  const below = new THREE.Color(s.belowHorizon);
  const glow = new THREE.Color(s.sunGlow);
  const cloud = new THREE.Color(s.cloud);
  const sun = sunDirection();
  const data = new Uint8Array(width * height * 4);
  const colour = new THREE.Color();
  const srgb = { r: 0, g: 0, b: 0 };
  const direction = new THREE.Vector3();
  for (let y = 0; y < height; y += 1) {
    // Row 0 is the bottom of the texture (straight down), the last row straight up.
    const elevation = ((y + 0.5) / height - 0.5) * Math.PI;
    for (let x = 0; x < width; x += 1) {
      const u = (x + 0.5) / width;
      const azimuth = (u - 0.5) * 2 * Math.PI;
      direction.set(
        Math.cos(elevation) * Math.cos(azimuth),
        Math.sin(elevation),
        Math.cos(elevation) * Math.sin(azimuth),
      );
      if (elevation < 0) {
        colour.copy(horizon).lerp(below, Math.min(1, -elevation / 0.25));
      } else {
        colour.copy(horizon).lerp(zenith, Math.pow(Math.sin(elevation), 0.6));
        // Clouds: patches of noise, thinning towards the horizon and the zenith.
        let n = 0;
        let weight = 0;
        octaves.forEach(({ period, noise }, k) => {
          const amplitude = 1 / (k + 1);
          // Stretch along the horizon, so clouds near it look flatter.
          n += amplitude * noise(u * period, (elevation / (Math.PI / 2)) * period * 0.5);
          weight += amplitude;
        });
        n /= weight;
        const band = Math.sin(Math.min(1, elevation / 0.9) * Math.PI);
        const amount = THREE.MathUtils.smoothstep(n, 0.5, 0.72) * band * s.cloudOpacity;
        colour.lerp(cloud, amount);
      }
      const sunAmount = Math.pow(Math.max(0, direction.dot(sun)), 48);
      colour.lerp(glow, sunAmount * 0.8);
      colour.getRGB(srgb, THREE.SRGBColorSpace);
      const i = (y * width + x) * 4;
      data[i] = Math.round(Math.min(1, srgb.r) * 255);
      data[i + 1] = Math.round(Math.min(1, srgb.g) * 255);
      data[i + 2] = Math.round(Math.min(1, srgb.b) * 255);
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, width, height);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** Ripples: a tileable normal map from a few crossing wave trains. */
export function rippleNormalMap(): THREE.DataTexture {
  const size = 256;
  const random = seededRandom(73);
  // Integer wave numbers keep the pattern tileable.
  const waves = Array.from({ length: 9 }, () => {
    const kx = Math.round((random() - 0.5) * 16);
    const ky = Math.round((random() - 0.5) * 16) || 3;
    return { kx, ky, amplitude: 1 / Math.hypot(kx, ky), phase: random() * 2 * Math.PI };
  });
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let dx = 0;
      let dy = 0;
      for (const w of waves) {
        const arg = (2 * Math.PI * (w.kx * x + w.ky * y)) / size + w.phase;
        const slope = w.amplitude * Math.cos(arg);
        dx += slope * w.kx;
        dy += slope * w.ky;
      }
      const normal = new THREE.Vector3(-dx * 0.08, -dy * 0.08, 1).normalize();
      const i = (y * size + x) * 4;
      data[i] = Math.round((normal.x * 0.5 + 0.5) * 255);
      data[i + 1] = Math.round((normal.y * 0.5 + 0.5) * 255);
      data[i + 2] = Math.round((normal.z * 0.5 + 0.5) * 255);
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}
