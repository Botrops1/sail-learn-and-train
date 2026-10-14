import { describe, expect, it } from 'vitest';
import { cloudTexture } from '../src/render3d/environment';
import { SCENE } from '../src/render3d/sceneConfig';
import { skyColours } from '../src/render3d/skyColours';

describe('skyColours (M18)', () => {
  it('gives today’s daytime sky at 20° and at 90°', () => {
    for (const elevation of [20, 90]) {
      const sky = skyColours(elevation);
      expect(sky.zenith.getHexString()).toBe('5f97c8');
      expect(sky.horizon.getHexString()).toBe('d6e7f2');
    }
  });

  it('shows all the stars at night and none by day', () => {
    expect(skyColours(-30).stars).toBe(1);
    expect(skyColours(20).stars).toBe(0);
  });

  it('mixes numbers linearly between rows', () => {
    expect(skyColours(3).glowStrength).toBeCloseTo(0.95, 6);
  });

  it('is exactly the row at a row’s own height', () => {
    expect(skyColours(-6).horizon.getHexString()).toBe('3a3f63');
  });

  it('returns the same object on every call (it runs every frame)', () => {
    expect(skyColours(5)).toBe(skyColours(50));
  });

  it('has its rows sorted by elevation', () => {
    const heights = SCENE.skyByElevation.map((row) => row.elevDeg);
    expect(heights).toEqual([...heights].sort((a, b) => a - b));
  });
});

describe('cloudTexture (M18)', () => {
  const texture = cloudTexture();
  const { width, height } = texture.image;
  const data = texture.image.data as Uint8Array;
  const alphaAt = (x: number, y: number) => data[(y * width + x) * 4 + 3] ?? 0;

  it('is 1024 × 512', () => {
    expect([width, height]).toEqual([1024, 512]);
  });

  it('has no cloud in the bottom half (below the horizon)', () => {
    for (let y = 0; y < height / 2; y += 1) {
      for (let x = 0; x < width; x += 7) expect(alphaAt(x, y)).toBe(0);
    }
  });

  it('has clouds above the horizon', () => {
    let max = 0;
    for (let y = height / 2; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) max = Math.max(max, alphaAt(x, y));
    }
    expect(max).toBeGreaterThan(128);
  });
});
