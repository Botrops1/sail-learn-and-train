import { describe, expect, it } from 'vitest';
import { reduce } from '../src/app/store';
import { mpsToKn } from '../src/model/angles';
import { apparentWind } from '../src/model/apparentWind';
import { steadyState } from '../src/model/motion';
import {
  addedResistanceN,
  initialWaveMotion,
  rigMotion,
  waveYawDeg,
} from '../src/model/waveMotion';
import { initialSea, waveTrains } from '../src/model/waves';
import { act, initialState, run, sampleRun, stdDev, mean, trimmed } from './motionHelpers';

/** M15: the waves act on the sails, the steering and the speed (PHASE3_SPEC 7). */

describe('signs and values', () => {
  it('rigMotion: bow up swings the rig aft, rolling to starboard swings it to starboard', () => {
    const wm = initialWaveMotion();
    expect(Math.abs(rigMotion({ ...wm, pitchRateDegS: 10 }).forwardMps - -1.686)).toBeLessThan(
      0.005,
    );
    expect(Math.abs(rigMotion({ ...wm, rollRateDegS: 10 }).sideMps - 1.686)).toBeLessThan(0.005);
  });

  it('apparentWind: a sideways speed of 1 m/s in no wind seems to come from the starboard beam', () => {
    const w = apparentWind(0, 0, 0, undefined, 1);
    expect(Math.abs(w.awaDeg - 90)).toBeLessThan(1e-9);
    expect(Math.abs(w.awsKn - 1.944)).toBeLessThan(0.005);
  });

  it('addedResistanceN: 237 N in Coastal waves from 45 at 6 m/s; none at rest, astern or without trains', () => {
    const trains = waveTrains(initialSea('coastal', { dirDeg: 45, twsKn: 15 }));
    expect(Math.abs(addedResistanceN(6, 0, trains) - 237)).toBeLessThan(3);
    expect(addedResistanceN(0, 0, trains)).toBe(0);
    expect(addedResistanceN(-1, 0, trains)).toBe(0);
    expect(addedResistanceN(6, 0, [])).toBe(0);
  });

  it('waveYawDeg: 2° of roll from 135 gives +10°; no trains give 0', () => {
    const trains = waveTrains(initialSea('coastal', { dirDeg: 135, twsKn: 15 }));
    const wm = { ...initialWaveMotion(), rollDeg: 2 };
    expect(Math.abs(waveYawDeg(wm, trains, 0) - 10)).toBeLessThan(1e-9);
    expect(waveYawDeg(wm, [], 0)).toBe(0);
  });
});

describe('Held still ignores the waves', () => {
  it('the rig states are equal in Coastal and Flat; the wave motion differs', () => {
    const make = (sea: 'coastal' | 'flat') =>
      run(
        initialState({
          sea,
          boat: { mode: 'held' },
          controls: { ctl_wind_dir: 90, ctl_wind_speed: 15 },
        }),
        30,
        60,
      );
    const coastal = make('coastal');
    const flat = make('flat');
    expect(coastal.rig).toEqual(flat.rig);
    expect(coastal.boat.waves).not.toEqual(flat.boat.waves);
    expect(coastal.motion?.waveResistanceN).toBe(0);
    expect(coastal.motion?.waveYawDeg).toBe(0);
    expect(coastal.motion?.rigSideMps).toBe(0);
  });
});

describe('the sailing does not depend on the frame rate', () => {
  const state = () =>
    initialState({
      sea: 'coastal',
      controls: { ctl_wind_dir: 135, ctl_wind_speed: 15, ctl_mainsheet: 100, ctl_jib_sheet: 100 },
    });
  const rudder = (s: ReturnType<typeof state>) => s.rig.applied.rudder;
  const speed = (s: ReturnType<typeof state>) => mpsToKn(s.boat.speedMps);

  it('30, 60 and 120 fps agree on the mean speed and the rudder spread', () => {
    const results = [30, 60, 120].map((fps) => ({
      speed: mean(sampleRun(state(), 600, fps, 200, speed)),
      rudder: stdDev(sampleRun(state(), 600, fps, 200, rudder)),
    }));
    const speeds = results.map((r) => r.speed);
    expect(Math.max(...speeds) - Math.min(...speeds)).toBeLessThanOrEqual(0.05);
    const rudders = results.map((r) => r.rudder);
    expect(
      (Math.max(...rudders) - Math.min(...rudders)) / Math.min(...rudders),
    ).toBeLessThanOrEqual(0.1);
  }, 240_000);

  it('at ×16 everything stays finite and bounded', () => {
    let s = act(state(), { type: 'setTimeScale', scale: 16 });
    const rudders: number[] = [];
    // Frames of dt 0.1 s (the store's cap): 1.6 s of simulated time per frame.
    while (s.rig.timeS < 600) {
      s = reduce(s, { type: 'step', dt: 0.1 });
      if (s.rig.timeS >= 200) rudders.push(s.rig.applied.rudder);
      for (const v of [
        s.boat.speedMps,
        s.boat.headingDeg,
        s.boat.heelDeg,
        s.rig.wind.awaDeg,
        s.rig.wind.awsKn,
        s.rig.wind.twaDeg,
        s.rig.wind.twsKn,
        s.sea.windKn,
        s.sea.dirDeg,
        s.boat.waves.heaveM,
        s.boat.waves.pitchDeg,
        s.boat.waves.rollDeg,
        s.boat.waves.heaveRateMps,
        s.boat.waves.pitchRateDegS,
        s.boat.waves.rollRateDegS,
        ...s.boat.waves.phases,
      ]) {
        expect(Number.isFinite(v)).toBe(true);
      }
      expect(Math.abs(mpsToKn(s.boat.speedMps))).toBeLessThan(12);
    }
    expect(stdDev(rudders)).toBeLessThan(10);
  }, 240_000);
});

describe('the steady speed in waves', () => {
  it('steadyState with the Open-sea trains from 45 is lower than without', () => {
    const controls = trimmed(20, 45, 20, 0);
    const trains = waveTrains(initialSea('open', { dirDeg: 45, twsKn: 20 }));
    const calm = steadyState(controls, 0, undefined, { heel: true });
    const rough = steadyState(controls, 0, undefined, { heel: true, trains });
    expect(rough.speedMps).toBeLessThan(calm.speedMps);
  });
});
