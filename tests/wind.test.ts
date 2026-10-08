import { describe, expect, it } from 'vitest';
import { clampControl, normalizeWindFrom, snapControl } from '../src/model/controls';
import { beaufort, WIND_PRESETS, windSide } from '../src/model/wind';
import { windFromVector } from '../src/render3d/wind';

describe('test wind (PHASE1_SPEC 4, 6.3, 7.1)', () => {
  it('presets are the five from the spec, all 12 kn', () => {
    expect(WIND_PRESETS.map((p) => p.windFromDeg)).toEqual([0, 45, 90, 135, 175]);
    for (const preset of WIND_PRESETS) expect(preset.speedKn).toBe(12);
  });

  it('Beaufort force from knots (WMO table)', () => {
    const cases: [number, number][] = [
      [0, 0],
      [1, 1],
      [3, 1],
      [4, 2],
      [10, 3],
      [11, 4],
      [12, 4],
      [16, 4],
      [17, 5],
      [21, 5],
      [22, 6],
      [27, 6],
      [28, 7],
      [30, 7],
      [64, 12],
    ];
    for (const [kn, force] of cases) expect(beaufort(kn), `${kn} kn`).toBe(force);
  });

  it('wind direction wraps into (−180, 180] and snaps to the step', () => {
    expect(normalizeWindFrom(-180)).toBe(180);
    expect(normalizeWindFrom(185)).toBe(-175);
    expect(normalizeWindFrom(-190)).toBe(170);
    expect(normalizeWindFrom(360)).toBe(0);
    expect(snapControl('ctl_wind_dir', 178, 5)).toBe(180);
    expect(snapControl('ctl_wind_dir', 183, 5)).toBe(-175);
    expect(snapControl('ctl_mainsheet', 37, 5)).toBe(35);
    expect(snapControl('ctl_mainsheet', 103, 5)).toBe(100);
    expect(clampControl('ctl_wind_speed', 45)).toBe(30);
  });

  it('wind from starboard comes from +z, from ahead +x (boat frame)', () => {
    const fromStarboard = windFromVector(90);
    expect(fromStarboard.z).toBeCloseTo(1, 9);
    expect(fromStarboard.x).toBeCloseTo(0, 9);
    expect(windFromVector(0).x).toBeCloseTo(1, 9);
    expect(windSide(60)).toBe('starboard');
    expect(windSide(-60)).toBe('port');
    expect(windSide(180)).toBe('astern');
  });
});
