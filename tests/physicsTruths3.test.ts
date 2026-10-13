import { describe, expect, it } from 'vitest';
import { reduce, type AppState } from '../src/app/store';
import { stepBoat } from '../src/model/motion';
import { act, initialState, run } from './motionHelpers';

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

describe('M14 waves do not change the sailing yet', () => {
  const sail = (sea: 'coastal' | 'flat'): AppState =>
    run(
      initialState({
        sea,
        controls: {
          ctl_wind_dir: 135,
          ctl_wind_speed: 15,
          ctl_mainsheet: 100,
          ctl_jib_sheet: 100,
        },
      }),
      60,
      30,
    );

  it('speed, heading, heel, position and the rig wind are identical to flat water', () => {
    const coastal = sail('coastal');
    const flat = sail('flat');
    expect(coastal.boat.speedMps).toBe(flat.boat.speedMps);
    expect(coastal.boat.headingDeg).toBe(flat.boat.headingDeg);
    expect(coastal.boat.heelDeg).toBe(flat.boat.heelDeg);
    expect(coastal.boat.eastM).toBe(flat.boat.eastM);
    expect(coastal.boat.northM).toBe(flat.boat.northM);
    expect(coastal.rig.wind).toEqual(flat.rig.wind);
    expect(coastal.boat.waves.heaveM).not.toBe(0);
    expect(
      Math.abs(coastal.boat.waves.rollDeg) + Math.abs(coastal.boat.waves.pitchDeg),
    ).toBeGreaterThan(0);
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
