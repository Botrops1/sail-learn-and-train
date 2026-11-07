import { describe, expect, it } from 'vitest';
import { DEFAULT_SOUND_PREFS } from '../src/audio/prefs';
import { pulses, poissonTimes } from '../src/audio/pulses';
import { clamp01, ramp, soundTargets } from '../src/audio/levels';
import { SOUND } from '../src/audio/soundData';
import { VOICE_GROUP, VOICE_IDS, VOICE_KIND, type SoundPrefs } from '../src/audio/types';
import type { AppState } from '../src/app/store';
import { mulberry32 } from '../src/model/random';
import { initialState } from './motionHelpers';

const on: SoundPrefs = { ...DEFAULT_SOUND_PREFS, on: true };
const base = initialState();

const withAws = (s: AppState, awsKn: number): AppState => ({
  ...s,
  rig: { ...s.rig, wind: { ...s.rig.wind, awsKn } },
});
const withSea = (s: AppState, setting: AppState['sea']['setting'], windKn: number): AppState => ({
  ...s,
  sea: { setting, windKn, dirDeg: 0 },
});
const withSpeed = (s: AppState, speedMps: number, paused = false): AppState => ({
  ...s,
  paused,
  boat: { ...s.boat, speedMps },
});
const targets = (s: AppState, prefs = on) => soundTargets(s, s, prefs, 0.016);

describe('sound data (M87)', () => {
  it('every number is finite and every gain is in 0–1', () => {
    const walk = (value: unknown, path: string): void => {
      if (typeof value === 'number') {
        expect(Number.isFinite(value), path).toBe(true);
        if (/gain/i.test(path) || /groupGain/.test(path)) {
          expect(value >= 0 && value <= 1, path).toBe(true);
        }
      } else if (value !== null && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`);
      }
    };
    walk(SOUND, 'sound');
  });

  it('every voice has a group and a kind', () => {
    for (const id of VOICE_IDS) {
      expect(VOICE_GROUP[id]).toBeDefined();
      expect(VOICE_KIND[id]).toBeDefined();
    }
  });

  it('clamp01 and ramp are NaN-safe', () => {
    expect(clamp01(Number.NaN)).toBe(0);
    expect(ramp(5, 0, 10)).toBe(0.5);
    expect(ramp(-1, 0, 10)).toBe(0);
  });
});

describe('wind and whistle (M87)', () => {
  it('wind follows the apparent wind', () => {
    expect(targets(withAws(base, 2)).voices.wind.gain).toBe(0);
    const top = targets(withAws(base, 35)).voices.wind;
    expect(top.gain).toBeCloseTo(0.5, 6);
    expect(top.hz).toBeCloseTo(1200, 6);
    const mid = targets(withAws(base, 18.5)).voices.wind;
    expect(mid.gain).toBeCloseTo(0.2872, 3);
    expect(Math.abs(mid.hz - 816.9)).toBeLessThan(0.5);
    expect(targets(withAws(base, 40)).voices.wind.gain).toBeCloseTo(0.5, 6);
    expect(targets(withAws(base, 0)).voices.wind.gain).toBe(0);
  });

  it('whistle starts at 20 kn and tops out at 35', () => {
    expect(targets(withAws(base, 20)).voices.whistle.gain).toBe(0);
    const mid = targets(withAws(base, 27.5)).voices.whistle;
    expect(mid.gain).toBeCloseTo(0.06, 6);
    expect(mid.hz).toBeCloseTo(1250, 6);
    expect(targets(withAws(base, 35)).voices.whistle.gain).toBeCloseTo(0.12, 6);
  });

  it('a gust makes the wind louder', () => {
    expect(targets(withAws(base, 18)).voices.wind.gain).toBeGreaterThan(
      targets(withAws(base, 12)).voices.wind.gain,
    );
  });
});

describe('waves (M87)', () => {
  it('open sea at 15 kn', () => {
    const w = targets(withSea(base, 'open', 15)).voices.waves;
    expect(Math.abs(w.gain - 0.316)).toBeLessThan(0.005);
    expect(Math.abs(w.rate - 0.156)).toBeLessThan(0.003);
    expect(w.hz).toBe(600);
  });

  it('a flat sea is a faint lap at the floor', () => {
    expect(Math.abs(targets(withSea(base, 'flat', 15)).voices.waves.gain - 0.027)).toBeLessThan(
      0.0005,
    );
  });

  it('coastal at 15 kn is quieter than open', () => {
    expect(Math.abs(targets(withSea(base, 'coastal', 15)).voices.waves.gain - 0.214)).toBeLessThan(
      0.005,
    );
  });
});

describe('hull (M87)', () => {
  it('rises with the speed and is silent when still or paused', () => {
    expect(targets(withSpeed(base, 0)).voices.hull.gain).toBe(0);
    const half = targets(withSpeed(base, 2.315)).voices.hull;
    expect(half.gain).toBeCloseTo(0.15, 3);
    expect(Math.abs(half.hz - 1200)).toBeLessThan(1);
    expect(targets(withSpeed(base, 6)).voices.hull.gain).toBeCloseTo(0.3, 6);
    expect(targets(withSpeed(base, 2.315, true)).voices.hull.gain).toBe(0);
  });
});

describe('groups (M87)', () => {
  it('Sound off is silent in every group', () => {
    const g = targets(base, { ...on, on: false }).groups;
    expect(g).toEqual({ music: 0, surroundings: 0, boat: 0 });
  });

  it('volume 70 scales the groups', () => {
    const g = targets(base).groups;
    expect(g.surroundings).toBeCloseTo(0.7, 6);
    expect(g.boat).toBeCloseTo(0.7, 6);
    expect(Math.abs(g.music - 0.231)).toBeLessThan(0.0005);
  });

  it('Pause stops the boat, halves the surroundings, keeps the music', () => {
    const g = targets({ ...base, paused: true }).groups;
    expect(g.surroundings).toBeCloseTo(0.35, 6);
    expect(g.boat).toBe(0);
    expect(Math.abs(g.music - 0.231)).toBeLessThan(0.0005);
  });

  it('a group switched off is silent', () => {
    expect(targets(base, { ...on, music: false }).groups.music).toBe(0);
  });
});

describe('pulses and Poisson times (M87)', () => {
  it('pulses gives one offset for every whole number crossed', () => {
    const a = pulses(0, 10, 0.25);
    expect(a.offsetsS).toHaveLength(2);
    expect(a.offsetsS[0]).toBeCloseTo(0.1, 9);
    expect(a.offsetsS[1]).toBeCloseTo(0.2, 9);
    expect(a.phase).toBeCloseTo(0.5, 9);
    const b = pulses(0.5, 10, 0.2);
    expect(b.offsetsS[0]).toBeCloseTo(0.05, 9);
    expect(b.offsetsS[1]).toBeCloseTo(0.15, 9);
    expect(b.phase).toBeCloseTo(0.5, 9);
    expect(pulses(0.2, 0, 1)).toEqual({ offsetsS: [], phase: 0.2 });
    expect(pulses(0, 1000, 1).offsetsS).toHaveLength(40);
  });

  it('poissonTimes: none at rate 0, about the rate over time, inside the frame', () => {
    expect(poissonTimes(mulberry32(1), 0, 1)).toEqual([]);
    const rng = mulberry32(7);
    let count = 0;
    for (let i = 0; i < 1000; i += 1) {
      const times = poissonTimes(rng, 2, 0.05);
      count += times.length;
      for (const t of times) expect(t >= 0 && t < 0.05).toBe(true);
    }
    expect(Math.abs(count - 100)).toBeLessThan(20);
  });
});
