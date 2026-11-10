import { describe, expect, it } from 'vitest';
import { area } from '../src/model/area';
import { utcFromLocal } from '../src/model/clock';
import { defaultControls } from '../src/model/controls';
import {
  localHourOf,
  localWindMean,
  scriptMean,
  trueWind,
  type WindKey,
} from '../src/model/localWinds';
import { initialWindMode, sizeRange, windAt } from '../src/model/windModes';

/** 1 June 2026 (or `day` of June) at a local time. */
const at = (h: number, m = 0, day = 1) => utcFromLocal(2026, 6, day, h, m, area);
const mean = (id: 'summer' | 'bura' | 'jugo', size: number, utc: number, patternS = 0) =>
  localWindMean(id, size, utc, patternS);

describe('local winds (PHASE10_SPEC 24.3)', () => {
  it('the summer day, size 14: calm, the maestral rising, holding and falling, the burin by night', () => {
    const cases: [number, number, number, number | null][] = [
      // hour, day, kn, band
      [8, 1, 1.5, 0.01],
      [11, 1, 2.19, 0.02],
      [12, 1, 7.0, 0.02],
      [13, 1, 11.81, 0.02],
      [14, 1, 14.0, 0.01],
      [15, 1, 14.0, 0.01],
      [17, 1, 9.75, 0.05],
      [19, 1, 2.49, 0.05],
      [21, 1, 1.5, 0.01],
      [23, 1, 5.17, 0.05],
      [1, 2, 6.0, 0.01],
      [6, 2, 3.06, 0.05],
    ].map(([h, d, kn, band]) => [h, d, kn, band] as [number, number, number, number]);
    for (const [h, d, kn, band] of cases) {
      const m = mean('summer', 14, at(h, 0, d));
      expect(Math.abs(m.twsKn - kn), `${h}:00 on ${d} June: ${m.twsKn}`).toBeLessThanOrEqual(
        band as number,
      );
    }
    for (const h of [8, 14]) expect(mean('summer', 14, at(h)).dirDeg).toBeCloseTo(-45, 6);
    expect(mean('summer', 14, at(14)).gustPct).toBeCloseTo(15, 6);
    expect(mean('summer', 14, at(23)).dirDeg).toBeCloseTo(45, 0);
    expect(mean('summer', 14, at(1, 0, 2)).dirDeg).toBeCloseTo(45, 6);
    expect(mean('summer', 14, at(1, 0, 2)).gustPct).toBeCloseTo(10, 6);
  });

  it('a size 20 maestral first reaches a mean of 15 kn between 12:40 and 12:43', () => {
    let first = -1;
    for (let minute = 0; minute < 180; minute += 1) {
      if (mean('summer', 20, at(12, minute)).twsKn >= 15) {
        first = minute;
        break;
      }
    }
    expect(first).toBeGreaterThanOrEqual(40);
    expect(first).toBeLessThanOrEqual(43);
  });

  it('the bura, size 18: a two-minute rise, stronger at night', () => {
    expect(mean('bura', 18, at(12), 0).twsKn).toBeCloseTo(1.5, 6);
    expect(mean('bura', 18, at(12), 60).twsKn).toBeCloseTo(9.0, 2);
    expect(mean('bura', 18, at(12), 120).twsKn).toBeCloseTo(18.0, 2);
    expect(mean('bura', 18, at(23), 600).twsKn).toBeCloseTo(21.6, 2);
    expect(mean('bura', 18, at(3, 0, 2), 600).twsKn).toBeCloseTo(21.6, 2);
    expect(Math.abs(mean('bura', 18, at(6, 30, 2), 600).twsKn - 18)).toBeLessThanOrEqual(0.05);
    const m = mean('bura', 18, at(12), 600);
    expect(m.dirDeg).toBe(45);
    expect(m.gustPct).toBe(50);
  });

  it('the jugo, size 16: from the south-east at its strength after two minutes', () => {
    const m = mean('jugo', 16, at(12), 120);
    expect(m.twsKn).toBeCloseTo(16.0, 2);
    expect(m.dirDeg).toBe(135);
    expect(m.gustPct).toBe(10);
  });

  it('the strength sliders: the area file gives each local wind its range', () => {
    expect(sizeRange('summer')).toEqual({ min: 8, max: 22, default: 14 });
    expect(sizeRange('bura')).toEqual({ min: 10, max: 24, default: 18 });
    expect(sizeRange('jugo')).toEqual({ min: 10, max: 28, default: 16 });
    expect(initialWindMode({ mode: 'jugo' }).size).toBe(16);
  });

  it('trueWind for a pattern mode is exactly windAt of the controls', () => {
    const controls = { ...defaultControls(), ctl_wind_dir: 60, ctl_wind_speed: 12 };
    for (const mode of ['steady', 'gusty'] as const) {
      const wm = initialWindMode({ mode, seed: 1 });
      for (let s = 0; s <= 600; s += 7) {
        expect(trueWind(wm, controls, at(12), s, null)).toEqual(
          windAt(controls.ctl_wind_dir, controls.ctl_wind_speed, wm, s),
        );
      }
    }
  });

  it('trueWind of a summer afternoon: gusts add more than lulls take away', () => {
    const wm = initialWindMode({ mode: 'summer', size: 20, seed: 1 });
    const controls = defaultControls();
    let sum = 0;
    let n = 0;
    for (let s = 0; s <= 900; s += 1) {
      const w = trueWind(wm, controls, at(14), s, null);
      expect(w.twsKn).toBeGreaterThanOrEqual(16.0);
      expect(w.twsKn).toBeLessThanOrEqual(25.0);
      sum += w.twsKn;
      n += 1;
    }
    expect(Math.abs(sum / n - 20.4)).toBeLessThanOrEqual(0.5);
  });
});

describe('localHourOf (M96, PHASE10_SPEC 23.3)', () => {
  it('is the local hour on board, in the area time zone', () => {
    expect(localHourOf(utcFromLocal(2026, 6, 1, 13, 30, area))).toBe(13.5);
    expect(localHourOf(utcFromLocal(2026, 6, 1, 0, 0, area))).toBe(0);
    expect(localHourOf(utcFromLocal(2026, 12, 1, 7, 15, area))).toBe(7.25);
  });
});

describe('scriptMean (M97, PHASE10_SPEC 27.3)', () => {
  const bura: WindKey[] = [
    { at: '08:00', fromDeg: 45, kn: 3, gustPct: 0 },
    { at: '08:04', fromDeg: 45, kn: 3, gustPct: 0 },
    { at: '08:06', fromDeg: 45, kn: 18, gustPct: 50 },
    { at: '10:00', fromDeg: 45, kn: 18, gustPct: 50 },
  ];

  it("the bura's points: calm, a straight ramp, then held", () => {
    expect(scriptMean(bura, at(8, 2))).toEqual({ dirDeg: 45, twsKn: 3, gustPct: 0 });
    expect(scriptMean(bura, utcFromLocal(2026, 6, 1, 8, 3, area) + 59_000).twsKn).toBe(3);
    const mid = scriptMean(bura, at(8, 5));
    expect(mid.twsKn).toBeCloseTo(10.5, 6);
    expect(mid.gustPct).toBeCloseTo(25, 6);
    expect(scriptMean(bura, at(8, 6)).twsKn).toBeCloseTo(18, 6);
    expect(scriptMean(bura, at(9, 0))).toEqual({ dirDeg: 45, twsKn: 18, gustPct: 50 });
    expect(scriptMean(bura, at(11, 0))).toEqual({ dirDeg: 45, twsKn: 18, gustPct: 50 });
  });

  // The spec's 27.5 lists this case as −90 → 90, but 27.3's formula (and M98's night, 90 → −90)
  // gives south only for 90 → −90: that is what is tested (decided in the M97 PR).
  it('a turn of exactly 180° goes through south, over midnight', () => {
    const night: WindKey[] = [
      { at: '23:00', fromDeg: 90, kn: 6, gustPct: 0 },
      { at: '01:00', fromDeg: -90, kn: 2, gustPct: 0 },
    ];
    const m = scriptMean(night, at(0, 0, 2));
    expect(m.twsKn).toBeCloseTo(4, 2);
    expect(m.dirDeg).toBeCloseTo(180, 2);
  });

  it('a turn of less than 180° goes the shorter way, through north', () => {
    const night: WindKey[] = [
      { at: '23:00', fromDeg: -80, kn: 6, gustPct: 0 },
      { at: '01:00', fromDeg: 80, kn: 2, gustPct: 0 },
    ];
    expect(scriptMean(night, at(0, 0, 2)).dirDeg).toBeCloseTo(0, 2);
  });
});
