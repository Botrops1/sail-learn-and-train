import * as THREE from 'three';
import { SCENE } from '../sceneConfig';

/**
 * Procedural textures for the boat (M3b): teak planking, non-slip deck pattern, sailcloth
 * seams. Made from typed arrays (no canvas, no image files), so they also build in tests and
 * carry no licence questions. Each is made once and shared.
 */

/** Small deterministic random generator (mulberry32), so every build looks the same. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dataTexture(
  data: Uint8Array,
  width: number,
  height: number,
  colorSpace: THREE.ColorSpace,
): THREE.DataTexture {
  const texture = new THREE.DataTexture(data, width, height);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.colorSpace = colorSpace;
  texture.needsUpdate = true;
  return texture;
}

let teak: THREE.DataTexture | undefined;

/**
 * Teak planks with black caulking. u runs along the planks (fore and aft), v across them; one
 * tile is `SCENE.textures.teak.tileLengthM` long and `planksPerTile` planks wide.
 */
export function teakTexture(): THREE.DataTexture {
  if (teak) return teak;
  const t = SCENE.textures.teak;
  const width = 512;
  const height = 128;
  const random = seededRandom(508);
  const base = new THREE.Color(t.color);
  const caulk = new THREE.Color(t.caulkColor);
  const plankTexels = height / t.planksPerTile;
  const planks = Array.from({ length: t.planksPerTile }, () => ({
    shade: 1 + (random() - 0.5) * t.plankShadeVariation,
    joint: Math.floor(random() * width),
    grain: random() * 100,
  }));
  const data = new Uint8Array(width * height * 4);
  const colour = new THREE.Color();
  const srgb = { r: 0, g: 0, b: 0 };
  for (let y = 0; y < height; y += 1) {
    const plank = planks[Math.floor(y / plankTexels)] ?? planks[0];
    const inPlank = y % plankTexels;
    for (let x = 0; x < width; x += 1) {
      const atJoint = plank && Math.abs(x - plank.joint) < 2;
      const seam = inPlank < t.caulkTexels || atJoint;
      if (seam) colour.copy(caulk);
      else {
        // Grain: thin streaks along the plank.
        const g = plank?.grain ?? 0;
        const streak =
          0.5 * Math.sin((inPlank + g) * 1.7 + Math.sin(x * 0.02 + g) * 1.5) +
          0.5 * Math.sin((inPlank * 0.6 + g) * 3.1 + x * 0.004);
        const shade = (plank?.shade ?? 1) * (1 + t.grainStrength * streak);
        colour.copy(base).multiplyScalar(shade);
      }
      const i = (y * width + x) * 4;
      colour.getRGB(srgb, THREE.SRGBColorSpace);
      data[i] = Math.round(Math.min(1, srgb.r) * 255);
      data[i + 1] = Math.round(Math.min(1, srgb.g) * 255);
      data[i + 2] = Math.round(Math.min(1, srgb.b) * 255);
      data[i + 3] = 255;
    }
  }
  teak = dataTexture(data, width, height, THREE.SRGBColorSpace);
  return teak;
}

let nonSlip: THREE.DataTexture | undefined;

/** Non-slip deck: a grid of small raised dots, as a bump map. One tile = `tileM` square. */
export function nonSlipTexture(): THREE.DataTexture {
  if (nonSlip) return nonSlip;
  const size = 64;
  const dots = SCENE.textures.nonSlip.dotsPerTile;
  const cell = size / dots;
  const radius = cell * 0.32;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (x % cell) - cell / 2 + 0.5;
      const dy = (y % cell) - cell / 2 + 0.5;
      const d = Math.hypot(dx, dy);
      const value = d < radius ? 255 : Math.max(0, 255 * (1 - (d - radius) / 1.5));
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = Math.round(value);
      data[i + 3] = 255;
    }
  }
  nonSlip = dataTexture(data, size, size, THREE.NoColorSpace);
  return nonSlip;
}

let seams: THREE.DataTexture | undefined;

/**
 * Sailcloth: white with a faint double-stitched seam at the bottom of each tile (v) and a
 * very slight weave. The sail mesh's v runs up the sail, so seams are horizontal panels.
 */
export function sailSeamTexture(): THREE.DataTexture {
  if (seams) return seams;
  const width = 4;
  const height = 64;
  const s = SCENE.textures.sail;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const seam = y < 2 || y === 4;
    const value = seam ? s.seamShade : 1;
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = Math.round(255 * value);
      data[i + 3] = 255;
    }
  }
  seams = dataTexture(data, width, height, THREE.SRGBColorSpace);
  return seams;
}
