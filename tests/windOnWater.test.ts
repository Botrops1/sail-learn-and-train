import { describe, expect, it } from 'vitest';
import { initialState } from '../src/app/store';
import {
  buoyOffsets,
  gustAt,
  gustProfile,
  upwindDistanceM,
  whitecapAmount,
  whitecapCoverage,
  whitecapPatch,
} from '../src/model/windOnWater';
import { elevation, initialSea, waveTrains } from '../src/model/waves';
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

describe('whitecapPatch (foam in scattered patches, owner M16 PR)', () => {
  it('is always between 0 and 1 and the same for the same place', () => {
    for (let i = 0; i < 500; i += 1) {
      const east = ((i * 37.3) % 400) - 200;
      const north = ((i * 91.7) % 400) - 200;
      const value = whitecapPatch(east, north);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
      expect(whitecapPatch(east, north)).toBe(value);
    }
  });

  it('lets foam show on about a fifth of the sea, in patches a few metres across', () => {
    let shown = 0;
    let total = 0;
    for (let east = 0; east < 300; east += 0.5) {
      for (let north = 0; north < 300; north += 0.5) {
        total += 1;
        if (whitecapPatch(east, north) > 0.5) shown += 1;
      }
    }
    expect(shown / total).toBeGreaterThan(0.1);
    expect(shown / total).toBeLessThan(0.3);
    // Points 5 cm apart hardly differ: the patches have edges, they are not speckle.
    let jump = 0;
    for (let east = 0; east < 100; east += 1) {
      jump = Math.max(jump, Math.abs(whitecapPatch(east, 10) - whitecapPatch(east + 0.05, 10)));
    }
    expect(jump).toBeLessThan(0.5);
  });

  it('a larger size makes larger patches', () => {
    const run = (size: number) => {
      let length = 0;
      let longest = 0;
      for (let east = 0; east < 600; east += 0.25) {
        if (whitecapPatch(east, 5, size) > 0.5) length += 0.25;
        else {
          longest = Math.max(longest, length);
          length = 0;
        }
      }
      return longest;
    };
    expect(run(12)).toBeGreaterThan(run(3));
  });

  it('the visible foam in 22 kn Open sea waves is a few per cent of the sea', () => {
    const trains = waveTrains(initialSea('open', { dirDeg: 0, twsKn: 22 }));
    const phases = [0, 2.1, 4.2];
    const sum = trains.reduce((total, train) => total + train.amplitudeM, 0);
    const coverage = whitecapCoverage(22);
    let white = 0;
    for (let east = 0; east < 200; east += 1) {
      for (let north = 0; north < 200; north += 1) {
        const crest = whitecapAmount(elevation(trains, phases, east, north), sum, coverage);
        if (crest * whitecapPatch(east, north) > 0.5) white += 1;
      }
    }
    // Measured sea: about 1 to 2 % at this wind (Monahan and O'Muircheartaigh 1980, from
    // search summaries; to-verify); the teaching sea shows a few times more so it can be seen.
    expect(white / 40_000).toBeGreaterThan(0.015);
    expect(white / 40_000).toBeLessThan(0.06);
  });
});
