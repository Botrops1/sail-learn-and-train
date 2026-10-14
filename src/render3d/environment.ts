import * as THREE from 'three';
import { seededRandom } from './boat/textures';
import { SCENE } from './sceneConfig';

/**
 * Clouds and water ripples (M3b, M18), procedural: no image files. The cloud texture is drawn
 * by the sky dome; the water gets a tiling ripple normal map.
 */

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

/**
 * The cloud patches (M18): an equirectangular RGBA texture, white, whose alpha is the cloud
 * amount (0 below the horizon). The sky dome (`skyDome.ts`) colours and places it.
 */
export function cloudTexture(): THREE.DataTexture {
  const { width, height } = SCENE.sky;
  const random = seededRandom(2018);
  const octaves = [8, 16, 32].map((period, k) => ({
    period,
    amplitude: 1 / (k + 1),
    noise: valueNoise(random, period),
  }));
  const weight = octaves.reduce((sum, o) => sum + o.amplitude, 0);
  const data = new Uint8Array(width * height * 4);
  data.fill(255);
  for (let y = 0; y < height; y += 1) {
    // Row 0 is the bottom of the texture (straight down), the last row straight up.
    const elevation = ((y + 0.5) / height - 0.5) * Math.PI;
    const v = elevation / (Math.PI / 2);
    for (let x = 0; x < width; x += 1) {
      let alpha = 0;
      if (elevation > 0) {
        const u = (x + 0.5) / width;
        let n = 0;
        // Stretched along the horizon, so clouds near it look flatter.
        for (const o of octaves) n += o.amplitude * o.noise(u * o.period, v * o.period * 0.5);
        alpha = THREE.MathUtils.smoothstep(n / weight, 0.5, 0.72);
      }
      data[(y * width + x) * 4 + 3] = Math.round(alpha * 255);
    }
  }
  const texture = new THREE.DataTexture(data, width, height);
  texture.colorSpace = THREE.NoColorSpace;
  texture.flipY = false;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.wrapS = THREE.RepeatWrapping;
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
