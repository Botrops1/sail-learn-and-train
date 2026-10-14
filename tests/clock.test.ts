import { describe, expect, it } from 'vitest';
import { daylighting } from '../src/render3d/daylight';
import { act, initialState, run } from './motionHelpers';
import {
  clockParam,
  daylight,
  defaultClockUtcMs,
  isClockTime,
  isSummerTime,
  lastSundayUtcMs,
  localParts,
  parseClockParam,
  utcFromLocal,
} from '../src/model/clock';

const utc = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0) =>
  Date.UTC(y, mo - 1, d, h, mi, s);

describe('lastSundayUtcMs', () => {
  it('is 01:00 UTC on the last Sunday of March and October', () => {
    expect(lastSundayUtcMs(2026, 3)).toBe(1_774_746_000_000);
    expect(lastSundayUtcMs(2026, 3)).toBe(utc(2026, 3, 29, 1));
    expect(lastSundayUtcMs(2026, 10)).toBe(utc(2026, 10, 25, 1));
    expect(lastSundayUtcMs(2027, 3)).toBe(utc(2027, 3, 28, 1));
    expect(lastSundayUtcMs(2027, 10)).toBe(utc(2027, 10, 31, 1));
  });
});

describe('localParts', () => {
  it('reads summer time in June and standard time in December', () => {
    const june = localParts(utc(2026, 6, 1, 10));
    expect([june.hour, june.minute, june.weekday, june.offsetMin, june.summer]).toEqual([
      12,
      0,
      1,
      120,
      true,
    ]);
    const december = localParts(utc(2026, 12, 21, 11));
    expect([december.hour, december.offsetMin, december.summer]).toEqual([12, 60, false]);
  });

  it('switches at 01:00 UTC on the last Sunday of March', () => {
    const before = localParts(lastSundayUtcMs(2026, 3) - 1000);
    expect([before.hour, before.minute, before.second, before.summer]).toEqual([1, 59, 59, false]);
    const at = localParts(lastSundayUtcMs(2026, 3));
    expect([at.hour, at.minute, at.second, at.summer]).toEqual([3, 0, 0, true]);
    expect(isSummerTime(lastSundayUtcMs(2026, 10) - 1)).toBe(true);
    expect(isSummerTime(lastSundayUtcMs(2026, 10))).toBe(false);
  });
});

describe('utcFromLocal', () => {
  it('converts local time to UTC', () => {
    expect(utcFromLocal(2026, 6, 1, 12, 0)).toBe(defaultClockUtcMs());
    expect(defaultClockUtcMs()).toBe(1_780_308_000_000);
    expect(utcFromLocal(2026, 12, 21, 12, 0)).toBe(utc(2026, 12, 21, 11));
    expect(utcFromLocal(2026, 3, 29, 2, 30)).toBe(utc(2026, 3, 29, 1, 30));
    expect(utcFromLocal(2026, 10, 25, 2, 30)).toBe(utc(2026, 10, 25, 0, 30));
  });

  it('round-trips through localParts for every hour of two days', () => {
    for (const [month, day] of [
      [6, 1],
      [12, 21],
    ] as const) {
      for (let hour = 0; hour < 24; hour++) {
        const ms = utcFromLocal(2026, month, day, hour, 0);
        const p = localParts(ms);
        expect([p.year, p.month, p.day, p.hour, p.minute]).toEqual([2026, month, day, hour, 0]);
      }
    }
  });
});

describe('clock parameter', () => {
  it('parses local YYYYMMDDHHmm', () => {
    expect(parseClockParam('202612211200')).toBe(utc(2026, 12, 21, 11));
    expect(parseClockParam('202603290230')).toBe(utc(2026, 3, 29, 1, 30));
    expect(clockParam(defaultClockUtcMs())).toBe('202606011200');
  });

  it('rejects what is not a real time', () => {
    for (const bad of [
      '202602301200',
      '202613011200',
      '202606012460',
      '202606012400',
      '12',
      'abc',
      '',
      '189912311200',
      '210101011200',
    ]) {
      expect(parseClockParam(bad), bad).toBeNull();
    }
  });

  it('drops the seconds when writing', () => {
    expect(clockParam(utc(2026, 6, 1, 10, 0, 59))).toBe('202606011200');
    expect(clockParam(utc(2026, 6, 1, 10, 1, 0))).toBe('202606011201');
  });
});

describe('isClockTime', () => {
  it('accepts years 1900 to 2100 only, and finite numbers', () => {
    expect(isClockTime(defaultClockUtcMs())).toBe(true);
    expect(isClockTime(Number.NaN)).toBe(false);
    expect(isClockTime(Infinity)).toBe(false);
    expect(isClockTime(utc(2200, 1, 1))).toBe(false);
    expect(isClockTime(utc(1800, 1, 1))).toBe(false);
  });
});

describe('daylight', () => {
  it('names the light by the sun height', () => {
    expect(daylight(10)).toBe('day');
    expect(daylight(3)).toBe('golden');
    expect(daylight(-3)).toBe('twilight');
    expect(daylight(-10)).toBe('night');
    expect(daylight(6)).toBe('day');
    expect(daylight(0)).toBe('golden');
    expect(daylight(-6)).toBe('twilight');
  });
});

describe('the clock in the store', () => {
  it('runs with the time scale: 60 s at ×16 is 960 s', () => {
    const start = initialState();
    const state = run(act(start, { type: 'setTimeScale', scale: 16 }), 60, 60);
    expect(state.settings.timeScale).toBe(16);
    expect(Math.abs((state.clock.utcMs - start.clock.utcMs) / 1000 - 960)).toBeLessThanOrEqual(1);
  });

  it('stands still while paused (the same object)', () => {
    const paused = act(initialState({ boat: { mode: 'sailing' } }), {
      type: 'setPaused',
      paused: true,
    });
    expect(run(paused, 5, 60).clock).toBe(paused.clock);
  });

  it('runs at ×1 in Held still with a steady wind and Flat water', () => {
    const start = initialState({ boat: { mode: 'held' } });
    const state = run(start, 10, 60);
    expect(Math.abs((state.clock.utcMs - start.clock.utcMs) / 1000 - 10)).toBeLessThanOrEqual(0.01);
  });

  it('setClock ignores NaN and a year outside 1900 to 2100', () => {
    const start = initialState();
    expect(act(start, { type: 'setClock', utcMs: Number.NaN })).toBe(start);
    expect(act(start, { type: 'setClock', utcMs: Date.UTC(2200, 0, 1) })).toBe(start);
    const set = act(start, { type: 'setClock', utcMs: utcFromLocal(2026, 12, 21, 12, 0) });
    expect(set.clock.utcMs).toBe(Date.UTC(2026, 11, 21, 11));
  });

  it('starts at the default and Reset brings it back, with the chip shown', () => {
    const start = initialState();
    expect(start.clock.utcMs).toBe(defaultClockUtcMs());
    const changed = act(
      start,
      { type: 'setClock', utcMs: utcFromLocal(2026, 12, 21, 12, 0) },
      { type: 'setClockShown', shown: false },
    );
    expect(changed.settings.clock).toBe(false);
    const reset = act(changed, { type: 'reset' });
    expect(reset.clock.utcMs).toBe(defaultClockUtcMs());
    expect(reset.settings.clock).toBe(true);
  });
});

describe('daylighting', () => {
  it('is full day at 30°, fully dark at −20°', () => {
    const day = daylighting(30, 180, 0);
    expect([day.sun, day.sky, day.night]).toEqual([1, 1, 0]);
    const night = daylighting(-20, 180, 0);
    expect([night.sun, night.sky, night.night]).toEqual([0, 0.25, 1]);
  });

  it('puts the sun on the right side of the boat', () => {
    // Sun due south, 10° up: astern when sailing north, to starboard when sailing east.
    expect(daylighting(10, 180, 0).sunDirection.x).toBeLessThan(-0.9);
    expect(daylighting(10, 180, 90).sunDirection.z).toBeGreaterThan(0.9);
  });

  it('never lights from below the water', () => {
    expect(daylighting(-30, 90, 0).sunDirection.y).toBeGreaterThan(0);
  });
});
