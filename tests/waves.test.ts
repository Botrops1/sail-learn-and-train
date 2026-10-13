import { describe, expect, it } from 'vitest';
import { DEG, wrap180 } from '../src/model/angles';
import { boatToMap, mapToBoat } from '../src/model/mapFrame';
import { boat } from '../src/model/boat';
import { initialWaveMotion, stepWaveMotion } from '../src/model/waveMotion';
import {
  defaultSeaSetting,
  elevation,
  elevationAndSlope,
  initialSea,
  isSeaSetting,
  seaSize,
  setSeaSetting,
  significantHeightM,
  stepSea,
  waveTrains,
} from '../src/model/waves';
import { lagTowards, smoothstep } from '../src/model/angles';
import { smoothstep as boomSmoothstep } from '../src/model/boomSolver';
import { area, AREAS, DEFAULT_AREA_ID } from '../src/model/area';

/** Waves (PHASE3_SPEC 6.8): the wave model and the boat's motion on it. */

describe('M14 helpers (PHASE3_SPEC 3.2)', () => {
  it('boatToMap is the inverse of mapToBoat', () => {
    expect(boatToMap(1, 0, 90)[0]).toBeCloseTo(1, 12);
    expect(boatToMap(1, 0, 90)[1]).toBeCloseTo(0, 12);
    expect(boatToMap(0, 1, 0)[0]).toBeCloseTo(1, 12);
    expect(boatToMap(0, 1, 0)[1]).toBeCloseTo(0, 12);
    for (const h of [0, 33, 90, 217, 359]) {
      const [e, n] = boatToMap(3.2, -1.7, h);
      const [x, z] = mapToBoat(e, n, h);
      expect(x).toBeCloseTo(3.2, 12);
      expect(z).toBeCloseTo(-1.7, 12);
    }
  });

  it('smoothstep and lagTowards', () => {
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 2)).toBe(1);
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5, 12);
    expect(boomSmoothstep).toBe(smoothstep);
    expect(lagTowards(2, 10, 0, 1)).toBe(2);
    expect(lagTowards(2, 10, 1, 0)).toBe(10);
    expect(lagTowards(0, 1, 1, 1)).toBeCloseTo(1 - Math.exp(-1), 12);
  });

  it('the area is loaded by id', () => {
    expect(AREAS[DEFAULT_AREA_ID]).toBe(area);
    expect(area.sea.fetchKm.coastal).toBe(30);
  });
});

describe('PT-39 wave size (seaSize)', () => {
  const near = (kn: number, km: number, height: number, period: number) => {
    const size = seaSize(kn, km);
    expect(size.heightM, `${kn} kn ${km} km`).toBeCloseTo(height, 2);
    expect(Math.abs(size.heightM - height)).toBeLessThanOrEqual(0.005);
    expect(Math.abs(size.periodS - period)).toBeLessThanOrEqual(0.01);
  };

  it('PT-39 the sizes the spec lists', () => {
    near(15, 30, 0.683, 3.832);
    near(20, 150, 2.036, 7.212);
    near(12, 5, 0.223, 1.958);
    near(25, 30, 1.138, 4.543);
    near(30, 1e7, 5.907, 12.797);
  });

  it('PT-39 no wind or no fetch gives no waves', () => {
    expect(seaSize(0, 30).heightM).toBe(0);
    expect(seaSize(15, 0).heightM).toBe(0);
  });

  it('PT-39 the height grows with the wind and with the fetch', () => {
    let last = -1;
    for (let kn = 2; kn <= 30; kn += 1) {
      const height = seaSize(kn, 30).heightM;
      expect(height, `${kn} kn`).toBeGreaterThan(last);
      last = height;
    }
    const a = seaSize(15, 1).heightM;
    const b = seaSize(15, 5).heightM;
    const c = seaSize(15, 30).heightM;
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });

  it('PT-39 a fully developed sea has a largest size', () => {
    const open = seaSize(15, 150).heightM;
    expect(open).toBeCloseTo(seaSize(15, 1000).heightM, 12);
    const g = boat.physics.constants.gravityMps2;
    const u = 15 * boat.physics.constants.knotMps;
    expect(open).toBeCloseTo((0.2433 * u * u) / g, 3);
    expect(open).toBeCloseTo(1.477, 2);
  });
});

describe('waveTrains', () => {
  it('Flat has no trains; Coastal at 1 kn too, at 2 kn it has three', () => {
    expect(waveTrains(initialSea('flat', { dirDeg: 0, twsKn: 20 }))).toEqual([]);
    expect(waveTrains(initialSea('coastal', { dirDeg: 0, twsKn: 1 }))).toEqual([]);
    const trains = waveTrains(initialSea('coastal', { dirDeg: 0, twsKn: 2 }));
    expect(trains).toHaveLength(3);
    expect(significantHeightM(trains)).toBeCloseTo(0.026, 3);
    expect(trains[0]?.periodS).toBeCloseTo(1, 6);
  });

  it('the sum has the formula height; the main train comes from the wind', () => {
    for (const setting of ['sheltered', 'coastal', 'open'] as const) {
      const sea = initialSea(setting, { dirDeg: 45, twsKn: 17 });
      const trains = waveTrains(sea);
      const fetch = area.sea.fetchKm[setting];
      expect(Math.abs(significantHeightM(trains) - seaSize(17, fetch).heightM)).toBeLessThan(1e-9);
      expect(trains[0]?.fromDeg).toBe(45);
    }
    const north = waveTrains(initialSea('coastal', { dirDeg: 0, twsKn: 15 }))[0];
    expect(Math.abs(north?.dirEast ?? 1)).toBeLessThan(1e-12);
    expect(Math.abs((north?.dirNorth ?? 0) + 1)).toBeLessThan(1e-12);
  });

  it('settings: names and the default', () => {
    expect(isSeaSetting('open')).toBe(true);
    expect(isSeaSetting('storm')).toBe(false);
    expect(defaultSeaSetting()).toBe('coastal');
    const sea = initialSea('coastal', { dirDeg: 10, twsKn: 12 });
    expect(setSeaSetting(sea, 'open')).toEqual({ ...sea, setting: 'open' });
    expect(setSeaSetting(sea, 'coastal')).toBe(sea);
  });
});

describe('phase at the boat is the map-fixed wave', () => {
  it('after sailing 60 s the surface is the same fixed pattern', () => {
    const trains = waveTrains(initialSea('coastal', { dirDeg: 20, twsKn: 15 }));
    let wm = initialWaveMotion();
    let east = 0;
    let north = 0;
    for (let i = 0; i < 3600; i += 1) {
      wm = stepWaveMotion(wm, trains, 6, 30, 1 / 60);
      east += (6 * Math.sin(30 * DEG)) / 60;
      north += (6 * Math.cos(30 * DEG)) / 60;
    }
    const rows = boat.waves.trains;
    for (const [pE, pN] of [
      [0, 0],
      [30, -20],
      [-40, 10],
      [12, 45],
      [-25, -35],
    ] as const) {
      const expected = trains.reduce((sum, t, i) => {
        const phase0 = rows[i]?.phaseRad ?? 0;
        return (
          sum +
          t.amplitudeM * Math.cos(t.k * (t.dirEast * pE + t.dirNorth * pN) - t.omega * 60 + phase0)
        );
      }, 0);
      expect(Math.abs(elevation(trains, wm.phases, pE - east, pN - north) - expected)).toBeLessThan(
        1e-6,
      );
    }
  });

  it('the slopes are the derivative of the height', () => {
    const trains = waveTrains(initialSea('coastal', { dirDeg: 70, twsKn: 18 }));
    const phases = initialWaveMotion().phases;
    const here = elevationAndSlope(trains, phases, 5, -7);
    expect(here.eta).toBeCloseTo(elevation(trains, phases, 5, -7), 12);
    const d = 1e-4;
    const dE =
      (elevation(trains, phases, 5 + d, -7) - elevation(trains, phases, 5 - d, -7)) / (2 * d);
    const dN =
      (elevation(trains, phases, 5, -7 + d) - elevation(trains, phases, 5, -7 - d)) / (2 * d);
    expect(here.dEast).toBeCloseTo(dE, 6);
    expect(here.dNorth).toBeCloseTo(dN, 6);
  });
});

describe('stepSea', () => {
  const lagged = (from: { dirDeg: number; twsKn: number }, to: typeof from, fps: number) => {
    let sea = initialSea('coastal', from);
    for (let i = 0; i < 180 * fps; i += 1) sea = stepSea(sea, to, 1 / fps);
    return sea;
  };

  it('the wind speed follows with a 3-minute lag, at any frame rate', () => {
    const a = lagged({ dirDeg: 0, twsKn: 10 }, { dirDeg: 0, twsKn: 20 }, 60);
    expect(Math.abs(a.windKn - 16.32)).toBeLessThan(0.01);
    expect(lagged({ dirDeg: 0, twsKn: 10 }, { dirDeg: 0, twsKn: 20 }, 30).windKn).toBeCloseTo(
      a.windKn,
      6,
    );
    expect(lagged({ dirDeg: 0, twsKn: 10 }, { dirDeg: 0, twsKn: 20 }, 120).windKn).toBeCloseTo(
      a.windKn,
      6,
    );
  });

  it('the direction turns the short way', () => {
    const east = lagged({ dirDeg: 0, twsKn: 10 }, { dirDeg: 90, twsKn: 10 }, 60);
    expect(Math.abs(east.dirDeg - 56.9)).toBeLessThan(0.1);
    const across = lagged({ dirDeg: 170, twsKn: 10 }, { dirDeg: -170, twsKn: 10 }, 60);
    expect(Math.abs(across.dirDeg - -177.4)).toBeLessThan(0.1);
    expect(wrap180(across.dirDeg)).toBe(across.dirDeg);
  });

  it('dt = 0 returns the same object', () => {
    const sea = initialSea('coastal', { dirDeg: 0, twsKn: 10 });
    expect(stepSea(sea, { dirDeg: 90, twsKn: 20 }, 0)).toBe(sea);
  });
});
