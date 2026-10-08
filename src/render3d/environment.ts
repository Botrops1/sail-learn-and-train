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

/** Linear 0..1 → sRGB byte, through a lookup table (the sky has half a million pixels). */
const SRGB_STEPS = 4096;
const srgbTable = Uint8Array.from({ length: SRGB_STEPS + 1 }, (_, i) => {
  const c = i / SRGB_STEPS;
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, v)) * 255);
});
function toByte(linear: number): number {
  return srgbTable[Math.round(Math.min(1, Math.max(0, linear)) * SRGB_STEPS)] ?? 0;
}

export function skyTexture(): THREE.DataTexture {
  const s = SCENE.sky;
  const width = s.width;
  const height = s.height;
  const random = seededRandom(2018);
  const octaves = [8, 16, 32].map((period, k) => ({
    period,
    amplitude: 1 / (k + 1),
    noise: valueNoise(random, period),
  }));
  const weight = octaves.reduce((sum, o) => sum + o.amplitude, 0);
  // Colours in the linear working space, as plain numbers.
  const rgb = (hex: string) => {
    const c = new THREE.Color(hex);
    return [c.r, c.g, c.b] as const;
  };
  const zenith = rgb(s.zenith);
  const horizon = rgb(s.horizon);
  const below = rgb(s.belowHorizon);
  const glow = rgb(s.sunGlow);
  const cloud = rgb(s.cloud);
  const sun = sunDirection();
  const data = new Uint8Array(width * height * 4);
  const cosAz = Float32Array.from({ length: width }, (_, x) =>
    Math.cos(((x + 0.5) / width - 0.5) * 2 * Math.PI),
  );
  const sinAz = Float32Array.from({ length: width }, (_, x) =>
    Math.sin(((x + 0.5) / width - 0.5) * 2 * Math.PI),
  );
  const base = [0, 0, 0];
  for (let y = 0; y < height; y += 1) {
    // Row 0 is the bottom of the texture (straight down), the last row straight up.
    const elevation = ((y + 0.5) / height - 0.5) * Math.PI;
    const cosEl = Math.cos(elevation);
    const sinEl = Math.sin(elevation);
    const t = elevation < 0 ? Math.min(1, -elevation / 0.25) : Math.pow(Math.max(0, sinEl), 0.6);
    const far = elevation < 0 ? below : zenith;
    for (let k = 0; k < 3; k += 1) {
      base[k] = (horizon[k] ?? 0) + ((far[k] ?? 0) - (horizon[k] ?? 0)) * t;
    }
    // Clouds thin out towards the horizon and the zenith.
    const band = elevation > 0 ? Math.sin(Math.min(1, elevation / 0.9) * Math.PI) : 0;
    const v = elevation / (Math.PI / 2);
    for (let x = 0; x < width; x += 1) {
      let r = base[0] ?? 0;
      let g = base[1] ?? 0;
      let b = base[2] ?? 0;
      if (band > 0.01) {
        const u = (x + 0.5) / width;
        let n = 0;
        // Stretched along the horizon, so clouds near it look flatter.
        for (const o of octaves) n += o.amplitude * o.noise(u * o.period, v * o.period * 0.5);
        const amount = THREE.MathUtils.smoothstep(n / weight, 0.5, 0.72) * band * s.cloudOpacity;
        r += (cloud[0] - r) * amount;
        g += (cloud[1] - g) * amount;
        b += (cloud[2] - b) * amount;
      }
      const facing =
        cosEl * (cosAz[x] ?? 0) * sun.x + sinEl * sun.y + cosEl * (sinAz[x] ?? 0) * sun.z;
      if (facing > 0) {
        const amount = Math.pow(facing, 48) * 0.8;
        r += (glow[0] - r) * amount;
        g += (glow[1] - g) * amount;
        b += (glow[2] - b) * amount;
      }
      const i = (y * width + x) * 4;
      data[i] = toByte(r);
      data[i + 1] = toByte(g);
      data[i + 2] = toByte(b);
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
