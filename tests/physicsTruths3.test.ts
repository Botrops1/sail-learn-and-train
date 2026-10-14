import { describe, expect, it } from 'vitest';
import { reduce } from '../src/app/store';
import { stepBoat } from '../src/model/motion';
import { wrap180, mpsToKn, knToMps } from '../src/model/angles';
import { elevation, initialSea, waveTrains } from '../src/model/waves';
import { gustAt, gustProfile, whitecapAmount, whitecapCoverage } from '../src/model/windOnWater';
import { gustyEvents, initialWindMode } from '../src/model/windModes';
import { area } from '../src/model/area';
import { sunPosition, sunTimes } from '../src/model/sun';
import { act, initialState, run, sampleRun, stdDev, mean } from './motionHelpers';

/** Phase 3 physics truths (PHYSICS_TRUTHS.md), implemented from M14 on. */

/** Held still on the waves for 120 s at 30 fps; the largest motions from t = 40 s on. */
function heldMaxima(
  windDir: number,
  windKn: number,
  sea: 'coastal' | 'open',
): { heave: number; pitch: number; roll: number } {
  const maxima = { heave: 0, pitch: 0, roll: 0 };
  run(
    initialState({
      sea,
      boat: { mode: 'held' },
      controls: { ctl_wind_dir: windDir, ctl_wind_speed: windKn },
    }),
    120,
    30,
    (s, t) => {
      if (t >= 40) {
        maxima.heave = Math.max(maxima.heave, Math.abs(s.boat.waves.heaveM));
        maxima.pitch = Math.max(maxima.pitch, Math.abs(s.boat.waves.pitchDeg));
        maxima.roll = Math.max(maxima.roll, Math.abs(s.boat.waves.rollDeg));
      }
      return s;
    },
  );
  return maxima;
}

describe('PT-40 the boat follows the waves', () => {
  it('PT-40 waves from ahead mostly pitch her', () => {
    const m = heldMaxima(0, 15, 'coastal');
    expect(m.pitch).toBeGreaterThan(2.3);
    expect(m.pitch).toBeLessThan(3.5);
    expect(m.roll).toBeLessThan(m.pitch);
  });

  it('PT-40 waves from the side mostly roll her', () => {
    const m = heldMaxima(90, 15, 'coastal');
    expect(m.roll).toBeGreaterThan(4.1);
    expect(m.roll).toBeLessThan(6.1);
    expect(m.pitch).toBeLessThan(m.roll);
  });

  it('PT-40 in the open sea at 20 kn she heaves and pitches clearly', () => {
    const m = heldMaxima(0, 20, 'open');
    expect(m.heave).toBeGreaterThan(0.65);
    expect(m.heave).toBeLessThan(1.0);
    expect(m.pitch).toBeGreaterThan(4.0);
    expect(m.pitch).toBeLessThan(6.0);
  });
});

describe('Flat water is Phase 2', () => {
  it('the wave motion stays exactly 0 and the phases unchanged, sailing and held', () => {
    for (const mode of ['sailing', 'held'] as const) {
      const start = initialState({
        sea: 'flat',
        boat: { mode },
        controls: { ctl_wind_dir: 90, ctl_wind_speed: 15 },
      });
      const end = run(start, 60, 30);
      expect(end.boat.waves.heaveM).toBe(0);
      expect(end.boat.waves.pitchDeg).toBe(0);
      expect(end.boat.waves.rollDeg).toBe(0);
      expect(end.boat.waves.phases).toEqual(start.boat.waves.phases);
    }
  });

  it('Held still + Flat: stepBoat returns the input boat object', () => {
    const state = initialState({ sea: 'flat', boat: { mode: 'held' } });
    const moved = stepBoat(
      state.boat,
      {
        windDirDeg: state.wind.dirDeg,
        twsKn: state.wind.twsKn,
        rudderDeg: 0,
        rig: state.rig,
        controls: state.controls,
        engineThrustN: 0,
        trains: [],
      },
      1 / 30,
    );
    expect(moved.boat).toBe(state.boat);
  });
});

describe('Pause freezes the water (issue #32)', () => {
  it('while paused the sea and the wave motion are the same objects', () => {
    const start = { ...initialState({ sea: 'coastal' }), paused: true };
    let s = start;
    for (let i = 0; i < 100; i += 1) s = reduce(s, { type: 'step', dt: 1 / 30 });
    expect(s.sea).toBe(start.sea);
    expect(s.boat.waves).toBe(start.boat.waves);
  });
});

describe('the motion does not depend on the frame rate', () => {
  it('Held still, Coastal, 15 kn from 45: 30, 60 and 120 fps agree at 60 s', () => {
    const at = (fps: number) =>
      run(
        initialState({
          sea: 'coastal',
          boat: { mode: 'held' },
          controls: { ctl_wind_dir: 45, ctl_wind_speed: 15 },
        }),
        60,
        fps,
      ).boat.waves;
    const a = at(30);
    for (const other of [at(60), at(120)]) {
      expect(Math.abs(other.heaveM - a.heaveM)).toBeLessThan(0.01);
      expect(Math.abs(other.pitchDeg - a.pitchDeg)).toBeLessThan(0.1);
      expect(Math.abs(other.rollDeg - a.rollDeg)).toBeLessThan(0.1);
    }
  });
});

describe('the Waves setting', () => {
  it('setSeaSetting changes the setting, refuses the same or an unknown one', () => {
    const s = initialState({ sea: 'coastal' });
    const open = act(s, { type: 'setSeaSetting', setting: 'open' });
    expect(open.sea.setting).toBe('open');
    expect(act(open, { type: 'setSeaSetting', setting: 'open' })).toBe(open);
    expect(act(open, { type: 'setSeaSetting', setting: 'storm' as never })).toBe(open);
  });

  it('switching to Flat in Held still un-pauses (issue #34 rule)', () => {
    let s = initialState({ sea: 'coastal', boat: { mode: 'held' } });
    s = act(s, { type: 'setPaused', paused: true });
    expect(s.paused).toBe(true);
    s = act(s, { type: 'setSeaSetting', setting: 'flat' });
    expect(s.paused).toBe(false);
  });

  it('Reset gives Coastal with the waves matching the wind now', () => {
    const s = act(initialState({ sea: 'open' }), { type: 'reset' });
    expect(s.sea.setting).toBe('coastal');
    expect(s.sea.windKn).toBe(s.wind.twsKn);
  });
});

/** A 300 s Sailing run holding heading 0 (the autopilot), sampled from t = 100 s (PHASE3_SPEC 7.6). */
function sail(
  dir: number,
  kn: number,
  main: number,
  jib: number,
  sea: 'flat' | 'sheltered' | 'coastal' | 'open',
  pick: (s: ReturnType<typeof initialState>) => number,
): number[] {
  return sampleRun(
    initialState({
      sea,
      controls: {
        ctl_wind_dir: dir,
        ctl_wind_speed: kn,
        ctl_mainsheet: main,
        ctl_jib_sheet: jib,
      },
    }),
    300,
    30,
    100,
    pick,
  );
}

const awa = (s: ReturnType<typeof initialState>) => s.rig.wind.awaDeg;
const rudder = (s: ReturnType<typeof initialState>) => s.rig.applied.rudder;
const heading = (s: ReturnType<typeof initialState>) => wrap180(s.boat.headingDeg);
const speedKn = (s: ReturnType<typeof initialState>) => mpsToKn(s.boat.speedMps);

describe('PT-41 the sails feel the rocking', () => {
  it('PT-41 Coastal, 15 kn from 90: the apparent wind angle swings; Flat it is still', () => {
    const coastal = sail(90, 15, 50, 100, 'coastal', awa);
    expect(stdDev(coastal)).toBeGreaterThan(1.6);
    expect(stdDev(coastal)).toBeLessThan(3.4);
    expect(Math.max(...coastal) - Math.min(...coastal)).toBeGreaterThanOrEqual(6);
    expect(stdDev(sail(90, 15, 50, 100, 'flat', awa))).toBeLessThan(0.05);
  }, 120_000);

  it('PT-41 Sheltered, 12 kn from 60: a smaller swing', () => {
    const sd = stdDev(sail(60, 12, 20, 25, 'sheltered', awa));
    expect(sd).toBeGreaterThan(1.4);
    expect(sd).toBeLessThan(2.8);
  }, 120_000);
});

describe('PT-42 waves knock her off course', () => {
  it('PT-42 Coastal, 15 kn from 135: the rudder works and the heading wanders; Flat it does not', () => {
    const rudderSd = stdDev(sail(135, 15, 100, 100, 'coastal', rudder));
    expect(rudderSd).toBeGreaterThan(3.5);
    expect(rudderSd).toBeLessThan(7);
    const headingSd = stdDev(sail(135, 15, 100, 100, 'coastal', heading));
    expect(headingSd).toBeGreaterThan(0.8);
    expect(headingSd).toBeLessThan(2.2);
    expect(stdDev(sail(135, 15, 100, 100, 'flat', rudder))).toBeLessThan(0.3);
    // From ahead of the beam the push is much smaller than from behind at an angle.
    expect(stdDev(sail(45, 15, 15, 0, 'coastal', rudder))).toBeLessThan(rudderSd / 2);
  }, 120_000);
});

describe('PT-43 head seas slow her most', () => {
  const loss = (dir: number, kn: number, main: number, jib: number, sea: 'coastal' | 'open') =>
    mean(sail(dir, kn, main, jib, 'flat', speedKn)) - mean(sail(dir, kn, main, jib, sea, speedKn));

  it('PT-43 Open sea, 20 kn: from 45 she loses about 0.9 kn, from 135 hardly any', () => {
    const head = loss(45, 20, 20, 0, 'open');
    expect(head).toBeGreaterThan(0.6);
    expect(head).toBeLessThan(1.3);
    const behind = loss(135, 20, 100, 100, 'open');
    expect(behind).toBeLessThan(0.4);
    expect(head).toBeGreaterThan(3 * behind);
  }, 120_000);

  it('PT-43 Coastal, 15 kn from 45: a smaller loss', () => {
    const l = loss(45, 15, 15, 0, 'coastal');
    expect(l).toBeGreaterThan(0.15);
    expect(l).toBeLessThan(0.45);
  }, 120_000);
});

describe('PT-44 white horses', () => {
  it('PT-44 none in light wind, more of them as the wind rises', () => {
    expect(whitecapCoverage(0)).toBe(0);
    expect(whitecapCoverage(6.9)).toBe(0);
    expect(whitecapCoverage(8)).toBeGreaterThan(0);
    expect(whitecapCoverage(10)).toBeCloseTo(0.02, 9);
    expect(whitecapCoverage(16)).toBeCloseTo(0.06, 9);
    expect(whitecapCoverage(27)).toBeCloseTo(0.2, 9);
    for (let kn = 7; kn < 40; kn += 1) {
      expect(whitecapCoverage(kn + 1)).toBeGreaterThan(whitecapCoverage(kn));
    }
  });

  /** The share of a 200 × 200 m patch of Coastal sea that is white (amount above 0.5). */
  const whiteShare = (kn: number) => {
    const trains = waveTrains(initialSea('coastal', { dirDeg: 0, twsKn: kn }));
    const phases = trains.map((_, i) => [0, 2.1, 4.2][i] ?? 0);
    const sum = trains.reduce((total, train) => total + train.amplitudeM, 0);
    const coverage = whitecapCoverage(kn);
    let white = 0;
    for (let east = 0; east < 200; east += 1) {
      for (let north = 0; north < 200; north += 1) {
        const eta = elevation(trains, phases, east, north);
        if (whitecapAmount(eta, sum, coverage) > 0.5) white += 1;
      }
    }
    return white / 40_000;
  };

  it('PT-44 the white share of the sea grows with the wind (16 kn and 27 kn)', () => {
    const light = whiteShare(16);
    expect(light).toBeGreaterThan(0.04);
    expect(light).toBeLessThan(0.12);
    const strong = whiteShare(27);
    expect(strong).toBeGreaterThan(0.11);
    expect(strong).toBeLessThan(0.32);
    expect(strong).toBeGreaterThan(light);
  });
});

describe('PT-45 a gust shows upwind before it arrives', () => {
  const controls = {
    ...initialState().controls,
    ctl_wind_dir: 0,
    ctl_wind_speed: 12,
  };
  const windMode = initialWindMode({ mode: 'gusty', seed: 1, size: 30, startS: 0 });

  it('PT-45 the patch 120 m upwind is the gust that reaches the boat 120 / U seconds later', () => {
    const first = gustyEvents(1, 3600)[0];
    expect(first?.gust).toBe(true);
    const g = { riseS: 3 };
    const peak = (first?.atS ?? 0) + g.riseS + (first?.holdS ?? 0) / 2;
    const u = knToMps(12);
    const early = gustProfile(controls, windMode, peak - 120 / u);
    const atPeak = gustProfile(controls, windMode, peak);
    expect(early && atPeak).toBeTruthy();
    if (!early || !atPeak) return;
    expect(gustAt(early, 120)).toBeCloseTo(gustAt(atPeak, 0), 9);
    expect(gustAt(atPeak, 0)).toBeCloseTo(1, 9);
  });

  it('PT-45 the value at the boat is the wind the store shows', () => {
    const start = act(initialState({ controls: { ctl_wind_dir: 0, ctl_wind_speed: 12 } }), {
      type: 'setWindMode',
      mode: 'gusty',
    });
    const state = run(start, 50, 60);
    const profile = gustProfile(state.controls, state.windMode, state.rig.timeS);
    expect(profile).not.toBeNull();
    if (!profile) return;
    const expected = Math.min(1, Math.max(-1, (state.wind.twsKn - 12) / (12 * 0.3)));
    expect(gustAt(profile, 0)).toBeCloseTo(expected, 9);
  });
});

describe("PT-46 the sun's path", () => {
  const { latitudeDeg, longitudeDeg } = area.position;
  const MIN = 60_000;

  it('PT-46 at Split on 1 June it rises in the north-east, stands due south at noon and sets in the north-west', () => {
    const t = sunTimes(2026, 6, 1, latitudeDeg, longitudeDeg);
    const azimuthAt = (ms: number | null) =>
      sunPosition(ms ?? Number.NaN, latitudeDeg, longitudeDeg).azimuthDeg;
    const rise = azimuthAt(t.sunriseUtcMs);
    const set = azimuthAt(t.sunsetUtcMs);
    expect(rise).toBeGreaterThanOrEqual(45);
    expect(rise).toBeLessThanOrEqual(90);
    expect(set).toBeGreaterThanOrEqual(270);
    expect(set).toBeLessThanOrEqual(315);
    expect(Math.abs(azimuthAt(t.noonUtcMs) - 180)).toBeLessThan(1);
  });

  it('PT-46 the June day is more than 5 hours longer than the December day', () => {
    const length = (month: number, day: number) => {
      const t = sunTimes(2026, month, day, latitudeDeg, longitudeDeg);
      return ((t.sunsetUtcMs ?? 0) - (t.sunriseUtcMs ?? 0)) / MIN / 60;
    };
    expect(length(6, 1) - length(12, 21)).toBeGreaterThan(5);
  });
});
