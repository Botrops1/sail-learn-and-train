import { describe, expect, it } from 'vitest';
import { sunPosition, sunTimes } from '../src/model/sun';

const LAT = 43.508;
const LON = 16.44;
const MIN = 60_000;
const utc = (y: number, mo: number, d: number, h = 0, mi = 0) => Date.UTC(y, mo - 1, d, h, mi);

describe('sunTimes at Split', () => {
  const cases: [string, [number, number, number], number | null, number | null, number | null][] = [
    ['1 June', [2026, 6, 1], 3 * 60 + 16, 18 * 60 + 28, 10 * 60 + 52],
    ['21 June', [2026, 6, 21], 3 * 60 + 13, 18 * 60 + 39, null],
    ['21 December', [2026, 12, 21], 6 * 60 + 24, 15 * 60 + 21, null],
    ['20 March', [2026, 3, 20], 4 * 60 + 57, 17 * 60 + 6, 11 * 60 + 2],
  ];
  for (const [name, [y, mo, d], rise, set, noon] of cases) {
    it(`${name}: sunrise, sunset and noon within 2 minutes`, () => {
      const t = sunTimes(y, mo, d, LAT, LON);
      const day0 = utc(y, mo, d);
      expect(t.polar).toBe('none');
      expect(Math.abs(((t.sunriseUtcMs ?? NaN) - day0) / MIN - (rise ?? NaN))).toBeLessThanOrEqual(
        2,
      );
      expect(Math.abs(((t.sunsetUtcMs ?? NaN) - day0) / MIN - (set ?? NaN))).toBeLessThanOrEqual(2);
      if (noon !== null) expect(Math.abs((t.noonUtcMs - day0) / MIN - noon)).toBeLessThanOrEqual(2);
    });
  }

  it('polar night and polar day at latitude 80, without NaN', () => {
    const night = sunTimes(2026, 12, 21, 80, LON);
    expect(night.polar).toBe('night');
    expect(night.sunriseUtcMs).toBeNull();
    expect(night.sunsetUtcMs).toBeNull();
    expect(Number.isFinite(night.noonUtcMs)).toBe(true);
    const day = sunTimes(2026, 6, 21, 80, LON);
    expect(day.polar).toBe('day');
    expect(day.sunriseUtcMs).toBeNull();
  });
});

describe('sunPosition at Split on 1 June 2026', () => {
  const cases: [number, number, number][] = [
    [4, 6.15, 65.27],
    [6, 27.06, 84.46],
    [10, 66.01, 149.1],
    [14, 45.86, 256.52],
    [18, 3.63, 297.4],
  ];
  for (const [hour, elevation, azimuth] of cases) {
    it(`${hour}:00 UTC: elevation ${elevation}, azimuth ${azimuth}`, () => {
      const p = sunPosition(utc(2026, 6, 1, hour), LAT, LON);
      expect(Math.abs(p.elevationDeg - elevation)).toBeLessThan(0.3);
      expect(Math.abs(p.azimuthDeg - azimuth)).toBeLessThan(0.3);
    });
  }

  it('at solar noon the sun is 68.6° high', () => {
    const noon = sunTimes(2026, 6, 1, LAT, LON).noonUtcMs;
    expect(Math.abs(sunPosition(noon, LAT, LON).elevationDeg - 68.6)).toBeLessThan(0.3);
  });
});
