import { describe, expect, it } from 'vitest';
import { initialState } from '../src/app/store';
import {
  whitecapAmount,
  buoyOffsets,
  gustAt,
  gustProfile,
  upwindDistanceM,
} from '../src/model/windOnWater';
import { initialWindMode } from '../src/model/windModes';

/** M16 (PHASE3_SPEC 8.7): the model behind the wind on the water and the buoys. */

describe('whitecapAmount', () => {
  it('is 0 without crests (amplitude sum 0) or without coverage, never NaN', () => {
    expect(whitecapAmount(0.3, 0, 0.06)).toBe(0);
    expect(whitecapAmount(0.3, 1, 0)).toBe(0);
  });
  it('rises from 0 to 1 over the crest edge', () => {
    expect(whitecapAmount(-1, 1, 0.1)).toBe(0);
    expect(whitecapAmount(1, 1, 0.1)).toBe(1);
  });
});

describe('gustProfile', () => {
  const controls = { ...initialState().controls, ctl_wind_dir: 0, ctl_wind_speed: 12 };
  const gusty = initialWindMode({ mode: 'gusty', seed: 1, size: 30 });

  it('is null for every other wind mode', () => {
    for (const mode of ['steady', 'shifty', 'building', 'dying'] as const) {
      expect(gustProfile(controls, initialWindMode({ mode }), 40)).toBeNull();
    }
  });
  it('is null for a mean wind under 1 m/s', () => {
    expect(gustProfile({ ...controls, ctl_wind_speed: 1.5 }, gusty, 40)).toBeNull();
  });
  it('has 21 values from −100 m to 300 m, each between −1 and 1', () => {
    const profile = gustProfile(controls, gusty, 40);
    expect(profile?.values).toHaveLength(21);
    expect(profile?.fromM).toBe(-100);
    for (const value of profile?.values ?? []) {
      expect(Math.abs(value)).toBeLessThanOrEqual(1);
    }
  });
});

describe('gustAt', () => {
  const profile = { fromM: -100, stepM: 20, values: Array.from({ length: 21 }, (_, i) => i / 20) };
  it('interpolates linearly inside the range', () => {
    expect(gustAt(profile, -100)).toBeCloseTo(0, 9);
    expect(gustAt(profile, -90)).toBeCloseTo(0.025, 9);
    expect(gustAt(profile, 300)).toBeCloseTo(1, 9);
  });
  it('fades to 0 over one step beyond the ends', () => {
    expect(gustAt(profile, 310)).toBeCloseTo(0.5, 9);
    expect(gustAt(profile, 320)).toBe(0);
    expect(gustAt(profile, 1000)).toBe(0);
    expect(gustAt({ ...profile, values: profile.values.map(() => 1) }, -110)).toBeCloseTo(0.5, 9);
  });
});

describe('upwindDistanceM', () => {
  it('is + towards where the wind comes from', () => {
    expect(upwindDistanceM(0, 100, 0)).toBeCloseTo(100, 9);
    expect(upwindDistanceM(100, 0, 90)).toBeCloseTo(100, 9);
    expect(upwindDistanceM(-100, 0, 90)).toBeCloseTo(-100, 9);
  });
});

describe('buoyOffsets', () => {
  it('gives each buoy relative to the boat', () => {
    const offsets = buoyOffsets({ eastM: 50, northM: -20 });
    expect(offsets.map((o) => o.id)).toEqual(['N', 'E', 'S', 'W']);
    expect(offsets[0]).toMatchObject({ id: 'N', dEastM: -50, dNorthM: 220 });
    expect(offsets[1]).toMatchObject({ id: 'E', dEastM: 150, dNorthM: 20 });
  });
});
