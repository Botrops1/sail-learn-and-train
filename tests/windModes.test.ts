import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import { mulberry32 } from '../src/model/random';
import {
  gustyEvents,
  initialWindMode,
  sizeRange,
  windAt,
  type WindModeState,
} from '../src/model/windModes';
import { substepCount } from '../src/model/motion';
import { wrap180 } from '../src/model/angles';
import { createStore, initialState, reduce } from '../src/app/store';
import { parseUrlState, serializeUrlState } from '../src/app/urlState';
import { act, run } from './motionHelpers';

const mode = (overrides: Partial<WindModeState>): WindModeState => initialWindMode(overrides);

describe('M10 random numbers', () => {
  it('mulberry32 is repeatable and stays in [0, 1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const c = mulberry32(43);
    const first = Array.from({ length: 1000 }, () => a());
    expect(Array.from({ length: 1000 }, () => b())).toEqual(first);
    expect(Array.from({ length: 5 }, () => c())).not.toEqual(first.slice(0, 5));
    expect(Math.min(...first)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...first)).toBeLessThan(1);
  });
});

describe('M10 determinism', () => {
  it('windAt is a pure function: the same seed and time give the same wind, in any order', () => {
    const wm = mode({ mode: 'gusty', seed: 7 });
    const forward = Array.from({ length: 601 }, (_, t) => windAt(90, 12, wm, t));
    const backward = Array.from({ length: 601 }, (_, i) => windAt(90, 12, wm, 600 - i)).reverse();
    expect(backward).toEqual(forward);
    const other = Array.from({ length: 601 }, (_, t) =>
      windAt(90, 12, mode({ mode: 'gusty', seed: 8 }), t),
    );
    expect(other).not.toEqual(forward);
  });

  it('the store gives the same wind at 30 and 60 fps as windAt directly (t = 0 … 600 s)', () => {
    const wm = { mode: 'gusty', seed: 7, size: 30 } as const;
    for (const fps of [30, 60]) {
      let state = initialState({
        controls: { ctl_wind_dir: 90, ctl_wind_speed: 12 },
        boat: { mode: 'held' },
        windMode: wm,
      });
      for (let second = 1; second <= 600; second += 1) {
        state = run(state, 1, fps);
        const direct = windAt(90, 12, state.windMode, second);
        expect(state.rig.timeS).toBeCloseTo(second, 6);
        expect(state.wind.twsKn).toBeCloseTo(direct.twsKn, 5);
        expect(state.wind.dirDeg).toBeCloseTo(direct.dirDeg, 5);
      }
    }
  });

  it('a link opens the pattern at its beginning: the same seed gives the same first minutes', () => {
    const url = '?wd=90&ws=12&ms=40&js=100&wm=gusty&seed=7&held=1';
    const a = run(parseUrlState(url), 120, 30);
    const b = run(parseUrlState(url), 120, 60);
    expect(a.wind.twsKn).toBeCloseTo(b.wind.twsKn, 5);
    expect(a.wind.dirDeg).toBeCloseTo(b.wind.dirDeg, 5);
  });
});

describe('M10 steady', () => {
  it('steady wind is exactly the means', () => {
    for (const t of [0, 10, 1000]) {
      expect(windAt(-60, 17, mode({}), t)).toEqual({ dirDeg: -60, twsKn: 17 });
    }
    expect(windAt(300, 5, mode({}), 0).dirDeg).toBe(-60);
  });
});

describe('M10 gusty', () => {
  const MEAN = 12;
  const stats = (seed: number) => {
    const wm = mode({ mode: 'gusty', seed, size: 30 });
    let max = 0;
    let sum = 0;
    const samples = 3601;
    for (let t = 0; t < samples; t += 1) {
      const tws = windAt(90, MEAN, wm, t).twsKn;
      max = Math.max(max, tws);
      sum += tws;
    }
    const gusts = gustyEvents(seed, 3600).filter((event) => event.gust).length;
    return { max, average: sum / samples, gusts };
  };

  it('30 %, mean 12 kn, 1 h at 1 Hz: peak 14.4–17.4 kn and average within 5 %, for seeds 1–200', () => {
    // Overlapping gusts are capped at what one event can reach, so every seed keeps the band.
    for (let seed = 1; seed <= 200; seed += 1) {
      const { max, average } = stats(seed);
      expect(max, `seed ${seed} max`).toBeGreaterThanOrEqual(14.4);
      expect(max, `seed ${seed} max`).toBeLessThanOrEqual(17.4);
      expect(Math.abs(average / MEAN - 1), `seed ${seed} average`).toBeLessThan(0.05);
    }
  });

  it('30 %, 1 h: at least 30 gusts (seeds 1 and 7)', () => {
    for (const seed of [1, 7]) {
      expect(stats(seed).gusts, `seed ${seed} gusts`).toBeGreaterThanOrEqual(30);
    }
  });

  it('a lull never takes away more than half of a single event, however many overlap', () => {
    for (const size of [10, 30, 60]) {
      for (let seed = 1; seed <= 50; seed += 1) {
        const wm = mode({ mode: 'gusty', seed, size });
        for (let t = 0; t <= 3600; t += 3) {
          const tws = windAt(90, MEAN, wm, t).twsKn;
          expect(tws).toBeGreaterThanOrEqual(MEAN * (1 - 0.5 * 1.3 * (size / 100) - 0.05) - 1e-9);
          expect(tws).toBeLessThanOrEqual(MEAN * (1 + 1.3 * (size / 100) + 0.05) + 1e-9);
        }
      }
    }
  });

  it('gusts veer clockwise (a gust turns the wind to a larger bearing), lulls do not turn it', () => {
    const wm = mode({ mode: 'gusty', seed: 7, size: 30 });
    const directions = Array.from({ length: 3600 }, (_, t) => windAt(90, MEAN, wm, t).dirDeg);
    expect(Math.min(...directions)).toBeGreaterThanOrEqual(90 - 1e-9);
    expect(Math.max(...directions)).toBeGreaterThan(95);
    expect(Math.max(...directions)).toBeLessThanOrEqual(100 + 1e-9);
  });

  it('a bigger gust strength gives bigger gusts', () => {
    const peak = (size: number) => {
      const wm = mode({ mode: 'gusty', seed: 7, size });
      return Math.max(...Array.from({ length: 1800 }, (_, t) => windAt(90, MEAN, wm, t).twsKn));
    };
    expect(peak(60)).toBeGreaterThan(peak(30));
    expect(peak(30)).toBeGreaterThan(peak(10));
  });

  it('never goes below 0 or above maxTwsKn', () => {
    const wm = mode({ mode: 'gusty', seed: 3, size: 60 });
    for (let t = 0; t < 1800; t += 1) {
      const { twsKn } = windAt(90, 30, wm, t);
      expect(twsKn).toBeGreaterThanOrEqual(0);
      expect(twsKn).toBeLessThanOrEqual(boat.windModes.maxTwsKn);
    }
  });

  it('starts at `startS`, not at the rig clock 0', () => {
    const wm = mode({ mode: 'gusty', seed: 7, startS: 500 });
    expect(windAt(90, MEAN, wm, 500 + 77)).toEqual(windAt(90, MEAN, { ...wm, startS: 0 }, 77));
  });
});

describe('M10 shifty', () => {
  it('15°: the direction stays within the mean ± 15° and passes ± 10° within 10 minutes', () => {
    for (const seed of [1, 7, 42, 99999]) {
      const wm = mode({ mode: 'shifty', seed, size: 15 });
      let beyond10 = false;
      for (let t = 0; t <= 600; t += 1) {
        const offset = wrap180(windAt(90, 12, wm, t).dirDeg - 90);
        expect(Math.abs(offset), `seed ${seed} t ${t}`).toBeLessThanOrEqual(15 + 1e-9);
        if (Math.abs(offset) > 10) beyond10 = true;
      }
      expect(beyond10, `seed ${seed}`).toBe(true);
    }
  });

  it('the speed varies only a little (±5 %) and the direction wraps through 180°', () => {
    const wm = mode({ mode: 'shifty', seed: 7, size: 40 });
    for (let t = 0; t <= 600; t += 1) {
      const wind = windAt(175, 12, wm, t);
      expect(Math.abs(wind.twsKn / 12 - 1)).toBeLessThanOrEqual(0.05 + 1e-9);
      expect(wind.dirDeg).toBeGreaterThan(-180);
      expect(wind.dirDeg).toBeLessThanOrEqual(180);
    }
  });
});

describe('M10 building and dying', () => {
  it('building +10 kn from 12 kn: 12 at 0 s, 17 ± 0.2 at 300 s, 22 ± 0.1 from 600 s on', () => {
    const wm = mode({ mode: 'building' });
    expect(windAt(60, 12, wm, 0).twsKn).toBeCloseTo(12, 6);
    expect(Math.abs(windAt(60, 12, wm, 300).twsKn - 17)).toBeLessThan(0.2);
    for (const t of [600, 900, 5000]) {
      expect(Math.abs(windAt(60, 12, wm, t).twsKn - 22)).toBeLessThan(0.1);
    }
  });

  it('building rises smoothly and never falls', () => {
    const wm = mode({ mode: 'building', size: 20 });
    let last = 0;
    for (let t = 0; t <= 700; t += 5) {
      const tws = windAt(60, 10, wm, t).twsKn;
      expect(tws).toBeGreaterThanOrEqual(last - 1e-9);
      last = tws;
    }
    expect(last).toBeLessThanOrEqual(boat.windModes.maxTwsKn);
  });

  it('dying −8 kn from 14 kn ends at 6 kn; it clamps at 0 and never goes negative', () => {
    expect(windAt(60, 14, mode({ mode: 'dying' }), 600).twsKn).toBeCloseTo(6, 6);
    const strong = mode({ mode: 'dying', size: 20 });
    expect(windAt(60, 10, strong, 600).twsKn).toBe(0);
    expect(windAt(60, 10, strong, 100).twsKn).toBeGreaterThan(0);
  });

  it('building clamps at maxTwsKn', () => {
    expect(windAt(60, 30, mode({ mode: 'building', size: 20 }), 600).twsKn).toBe(
      boat.windModes.maxTwsKn,
    );
  });
});

describe('M10 size ranges', () => {
  it('come from the data; steady has none', () => {
    expect(sizeRange('steady')).toBeNull();
    expect(sizeRange('gusty')).toEqual({ min: 10, max: 60, default: 30 });
    expect(sizeRange('shifty')).toEqual({ min: 5, max: 40, default: 15 });
    expect(sizeRange('building')?.default).toBe(10);
    expect(sizeRange('dying')?.default).toBe(8);
  });
});

describe('M10 the store', () => {
  const base = () =>
    initialState({
      controls: { ctl_wind_dir: 90, ctl_wind_speed: 12, ctl_mainsheet: 40, ctl_jib_sheet: 100 },
    });

  it('changing the mode starts the pattern now with the mode’s default size', () => {
    let state = run(base(), 5);
    state = act(state, { type: 'setWindMode', mode: 'shifty' });
    expect(state.windMode).toMatchObject({ mode: 'shifty', size: 15, startS: state.rig.timeS });
    state = run(state, 5);
    state = act(state, { type: 'setWindSize', size: 30 });
    expect(state.windMode).toMatchObject({ size: 30, startS: state.rig.timeS });
    state = act(state, { type: 'setWindMode', mode: 'gusty' });
    expect(state.windMode.size).toBe(30);
    expect(state.windMode.seed).toBe(1);
  });

  it('the size is clamped to the mode’s range and ignored when steady', () => {
    let state = act(base(), { type: 'setWindSize', size: 50 });
    expect(state.windMode.mode).toBe('steady');
    expect(state.windMode.size).toBe(0);
    state = act(state, { type: 'setWindMode', mode: 'shifty' }, { type: 'setWindSize', size: 500 });
    expect(state.windMode.size).toBe(40);
    state = act(state, { type: 'setWindSize', size: -3 });
    expect(state.windMode.size).toBe(5);
  });

  it('a new pattern takes a new seed and restarts it; an invalid seed keeps the old one', () => {
    let state = act(base(), { type: 'setWindMode', mode: 'gusty' });
    state = run(state, 3);
    state = act(state, { type: 'newWindPattern', seed: 4321 });
    expect(state.windMode).toMatchObject({ seed: 4321, startS: state.rig.timeS });
    state = act(state, { type: 'newWindPattern', seed: 0 });
    expect(state.windMode.seed).toBe(4321);
    state = act(state, { type: 'newWindPattern', seed: 100000 });
    expect(state.windMode.seed).toBe(4321);
  });

  it('only 1, 4 and 16 are time speed-ups', () => {
    let state = act(base(), { type: 'setTimeScale', scale: 4 });
    expect(state.settings.timeScale).toBe(4);
    state = act(state, { type: 'setTimeScale', scale: 5 });
    expect(state.settings.timeScale).toBe(4);
  });

  it('the wind now follows the pattern; the dial’s mean stays as set', () => {
    let state = act(base(), { type: 'setWindMode', mode: 'building' });
    state = run(state, 300, 10);
    expect(state.controls.ctl_wind_speed).toBe(12);
    expect(state.wind.twsKn).toBeCloseTo(17, 0);
    expect(state.rig.wind.twsKn).toBeCloseTo(state.wind.twsKn, 6);
  });

  it('the pattern stands still while paused', () => {
    let state = act(
      base(),
      { type: 'setWindMode', mode: 'gusty' },
      { type: 'setPaused', paused: true },
    );
    state = run(state, 30, 10);
    expect(state.rig.timeS).toBe(0);
    expect(state.wind).toEqual(windAt(90, 12, state.windMode, 0));
  });

  it('Reset gives back a steady wind at ×1', () => {
    let state = act(
      base(),
      { type: 'setWindMode', mode: 'gusty' },
      { type: 'setTimeScale', scale: 16 },
    );
    state = run(state, 5);
    state = reduce(state, { type: 'reset' });
    expect(state.windMode.mode).toBe('steady');
    expect(state.settings.timeScale).toBe(1);
  });

  it('a wind mode keeps working while held still, and a steady held rig is untouched', () => {
    const held = initialState({
      controls: { ctl_wind_dir: 90, ctl_wind_speed: 12, ctl_mainsheet: 40, ctl_jib_sheet: 100 },
      boat: { mode: 'held' },
      windMode: { mode: 'gusty', seed: 7 },
    });
    const after = run(held, 120, 30);
    expect(after.boat.speedMps).toBe(0);
    expect(after.rig.wind.twsKn).toBeCloseTo(after.wind.twsKn, 1);
    const seen = new Set<number>();
    run(held, 120, 30, (s) => {
      seen.add(s.rig.wind.awsKn);
      return s;
    });
    expect(seen.size).toBeGreaterThan(20);
  });

  it('gusts change the boat: heel and speed rise in a gust and drop after it', () => {
    const state = initialState({
      controls: { ctl_wind_dir: 90, ctl_wind_speed: 12, ctl_mainsheet: 40, ctl_jib_sheet: 100 },
      windMode: { mode: 'gusty', seed: 7, size: 60 },
    });
    const heel: number[] = [];
    const speed: number[] = [];
    const tws: number[] = [];
    run(state, 240, 10, (s) => {
      heel.push(Math.abs(s.boat.heelDeg));
      speed.push(s.boat.speedMps);
      tws.push(s.wind.twsKn);
      return s;
    });
    const at = (series: number[], pick: (...values: number[]) => number) => pick(...series);
    // The strongest moment of the wind heels her more than the weakest.
    const strongest = tws.indexOf(at(tws, Math.max));
    const weakest = tws.indexOf(at(tws, Math.min));
    // One second after the strongest wind she leans more than one second after the weakest.
    expect(heel[strongest + 10] ?? 0).toBeGreaterThan(heel[weakest + 10] ?? 99);
    expect(at(heel, Math.max) - at(heel, Math.min)).toBeGreaterThan(3);
    expect(at(speed, Math.max)).toBeGreaterThan(at(speed, Math.min));
  });
});

describe('M10 time speed-up', () => {
  it('×16: 60 s of frames at 60 fps advance the clock by 960 ± 1 s', () => {
    const state = act(initialState({ controls: { ctl_wind_dir: 90, ctl_wind_speed: 12 } }), {
      type: 'setTimeScale',
      scale: 16,
    });
    const after = run(state, 60, 60);
    expect(Math.abs(after.rig.timeS - 960)).toBeLessThan(1);
  });

  it('no substep is longer than maxStepS, whatever the time scale or frame time', () => {
    const { maxStepS } = boat.physics.integration;
    for (const frame of [1 / 120, 1 / 60, 1 / 30, 0.1]) {
      for (const scale of boat.windModes.timeScales) {
        const dt = frame * scale;
        const count = substepCount(dt);
        expect(dt / count).toBeLessThanOrEqual(maxStepS + 1e-12);
        expect(count).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('the world stays finite and the boat sane at ×16, at 60 and at 10 fps', () => {
    for (const fps of [60, 10]) {
      const state = act(
        initialState({
          controls: { ctl_wind_dir: 90, ctl_wind_speed: 16, ctl_mainsheet: 40, ctl_jib_sheet: 100 },
          windMode: { mode: 'gusty', seed: 7 },
        }),
        { type: 'setTimeScale', scale: 16 },
      );
      run(state, 120, fps, (s) => {
        expect(Number.isFinite(s.boat.speedMps)).toBe(true);
        expect(Number.isFinite(s.boat.headingDeg)).toBe(true);
        expect(Math.abs(s.boat.speedMps)).toBeLessThan(6.2);
        return s;
      });
    }
  });
});

describe('M10 the autopilot in a shifting wind', () => {
  it('wind mode holds the true wind angle within 6° for 90 % of the time in a 20° shifty wind', () => {
    let state = initialState({
      controls: { ctl_wind_dir: 90, ctl_wind_speed: 12, ctl_mainsheet: 40, ctl_jib_sheet: 100 },
      windMode: { mode: 'shifty', seed: 7, size: 20 },
    });
    state = act(state, { type: 'autopilot', command: 'wind' });
    // The target is the angle she is sailing at when the autopilot is switched on.
    const target = state.autopilot.targetDeg;
    expect(Math.abs(target - 90)).toBeLessThanOrEqual(20);
    // Five minutes to settle through a few shifts, then five minutes of measuring.
    state = run(state, 300, 30);
    let within = 0;
    let frames = 0;
    run(state, 300, 30, (s) => {
      frames += 1;
      if (Math.abs(wrap180(s.rig.wind.twaDeg - target)) < 6) within += 1;
      return s;
    });
    expect(within / frames).toBeGreaterThanOrEqual(0.9);
  });
});

describe('M10 link', () => {
  it('round-trips wm, seed, wg and tx', () => {
    const state = parseUrlState('?wd=60&ws=10&wm=build&seed=7&wg=12&tx=16');
    expect(state.windMode).toMatchObject({ mode: 'building', seed: 7, size: 12, startS: 0 });
    expect(state.settings.timeScale).toBe(16);
    const again = parseUrlState(serializeUrlState(state));
    expect(again.windMode).toEqual(state.windMode);
    expect(again.settings.timeScale).toBe(16);
    const text = serializeUrlState(state);
    expect(text).toContain('wm=build');
    expect(text).toContain('seed=7');
    expect(text).toContain('wg=12');
    expect(text).toContain('tx=16');
  });

  it('writes only what is not the default', () => {
    expect(serializeUrlState(parseUrlState('?wd=60'))).not.toMatch(/wm=|seed=|wg=|tx=/);
    const gusty = serializeUrlState(parseUrlState('?wm=gusty'));
    expect(gusty).toContain('wm=gusty');
    expect(gusty).not.toMatch(/seed=|wg=|tx=/);
    expect(serializeUrlState(parseUrlState('?wm=die&wg=10'))).toContain('wg=10');
  });

  it('knows the four mode names and falls back to steady for anything else', () => {
    for (const [name, expected] of [
      ['gusty', 'gusty'],
      ['shifty', 'shifty'],
      ['build', 'building'],
      ['die', 'dying'],
    ] as const) {
      expect(parseUrlState(`?wm=${name}`).windMode.mode).toBe(expected);
    }
    for (const bad of ['steady', 'building', 'x', '']) {
      expect(parseUrlState(`?wm=${bad}`).windMode.mode).toBe('steady');
    }
  });

  it('bad seeds, sizes and time scales fall back', () => {
    const state = parseUrlState('?wm=shifty&seed=0&wg=99&tx=5');
    expect(state.windMode).toMatchObject({ mode: 'shifty', seed: 1, size: 15 });
    expect(state.settings.timeScale).toBe(1);
    expect(parseUrlState('?wm=gusty&seed=100000').windMode.seed).toBe(1);
    expect(parseUrlState('?wm=gusty&seed=abc').windMode.seed).toBe(1);
    expect(parseUrlState('?tx=4').settings.timeScale).toBe(4);
    expect(parseUrlState('?tx=1').settings.timeScale).toBe(1);
  });

  it('an old link has a steady wind and ×1', () => {
    const state = parseUrlState('?wd=90&ws=12&ms=40');
    expect(state.windMode.mode).toBe('steady');
    expect(state.settings.timeScale).toBe(1);
    expect(state.wind).toEqual({ dirDeg: 90, twsKn: 12 });
  });

  it('createStore keeps the wind state on dispatch', () => {
    const store = createStore(parseUrlState('?wm=gusty&seed=3'));
    store.dispatch({ type: 'step', dt: 0.05 });
    expect(store.getState().windMode.seed).toBe(3);
  });
});
