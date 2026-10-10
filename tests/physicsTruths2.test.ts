import { describe, expect, it } from 'vitest';
import { knToMps, mpsToKn, wrap180 } from '../src/model/angles';
import { defaultControls } from '../src/model/controls';
import { steadyState } from '../src/model/motion';
import { AT_REST, initialRig, step } from '../src/model/sim';
import { act, bestSpeedKn, initialState, run, trimmed } from './motionHelpers';
import { best } from './motionHelpers';

/** Phase 2 physics truths (PHYSICS_TRUTHS.md), implemented from M6 on. */

describe('PT-21 no-go zone', () => {
  it('PT-21 head to wind she stops and both sails luff', () => {
    let s = initialState({
      controls: {
        ctl_wind_dir: 0,
        ctl_wind_speed: 12,
        ctl_mainsheet: 10,
        ctl_jib_sheet: 10,
        ctl_rudder: 0,
      },
      boat: { speedMps: knToMps(6) },
      autopilot: { mode: 'off', targetDeg: 0, integralDeg: 0 },
    });
    s = run(s, 60);
    expect(Math.abs(mpsToKn(s.boat.speedMps))).toBeLessThan(1);
    expect(s.rig.solution.fill).toBeLessThan(0.1);
    expect(s.rig.jibSolution.fill).toBeLessThan(0.1);
  });

  it('PT-21 she hardly moves 20° off the wind and sails well at 45°', () => {
    expect(bestSpeedKn(12, 20)).toBeLessThan(1.5);
    expect(bestSpeedKn(12, 45)).toBeGreaterThan(2 * bestSpeedKn(12, 25));
  });
});

describe('PT-22 bearing away eases the sails', () => {
  it('PT-22 the best main sheet does not decrease from close-hauled to a broad reach', () => {
    const closeHauled = best(12, 45).main;
    const beam = best(12, 90).main;
    const broad = best(12, 135).main;
    expect(beam).toBeGreaterThanOrEqual(closeHauled);
    expect(broad).toBeGreaterThanOrEqual(beam);
    expect(broad).toBeGreaterThan(closeHauled);
  });
});

describe('PT-28 self-tacking jib: a tack needs no sheet work', () => {
  it('PT-28 the autopilot tacks, the jib crosses by itself and both sheets stay put', () => {
    let s = initialState({
      controls: {
        ctl_wind_dir: 0,
        ctl_wind_speed: 12,
        ctl_mainsheet: 12,
        ctl_jib_sheet: 0,
      },
      boat: { headingDeg: 315 },
      autopilot: { mode: 'wind', targetDeg: 45, integralDeg: 0 },
    });
    s = run(s, 20);
    expect(Math.abs(wrap180(s.controls.ctl_wind_dir - s.boat.headingDeg) - 45)).toBeLessThan(3);
    expect(s.rig.jibSolution.side).toBe(-1);
    s = act(s, { type: 'autopilot', command: 'tack' });
    let lowest = Infinity;
    s = run(s, 50, 60, (state) => {
      lowest = Math.min(lowest, mpsToKn(state.boat.speedMps));
      return state;
    });
    const twa = wrap180(s.controls.ctl_wind_dir - s.boat.headingDeg);
    expect(twa).toBeGreaterThan(-50);
    expect(twa).toBeLessThan(-40);
    expect(s.rig.jibSolution.side).toBe(1);
    expect(s.controls.ctl_mainsheet).toBe(12);
    expect(s.controls.ctl_jib_sheet).toBe(0);
    expect(lowest).toBeGreaterThan(2);
  });
});

describe('PT-35 no speed, no steering', () => {
  it('PT-35 a stopped boat does not answer the wheel', () => {
    let s = initialState({
      controls: { ctl_wind_speed: 0, ctl_rudder: 35 },
      boat: { speedMps: 0 },
      autopilot: { mode: 'off', targetDeg: 0, integralDeg: 0 },
    });
    s = run(s, 10);
    expect(Math.abs(wrap180(s.boat.headingDeg))).toBeLessThan(0.5);
    expect(s.boat.speedMps).toBe(0);
  });

  it('PT-35 with way on, the wheel turns her: to starboard for + rudder, and astern the other way', () => {
    const base = {
      controls: { ctl_wind_speed: 0, ctl_rudder: 20 },
      autopilot: { mode: 'off' as const, targetDeg: 0, integralDeg: 0 },
    };
    const ahead = run(initialState({ ...base, boat: { speedMps: knToMps(3) } }), 5);
    expect(wrap180(ahead.boat.headingDeg)).toBeGreaterThan(5);
    const astern = run(initialState({ ...base, boat: { speedMps: -knToMps(2) } }), 3);
    expect(wrap180(astern.boat.headingDeg)).toBeLessThan(-0.5);
  });
});

describe('Held still is Phase 1', () => {
  it('the rig is identical to Phase 1 and the boat does not move', () => {
    const controls = {
      ...defaultControls(),
      ctl_wind_dir: 70,
      ctl_wind_speed: 14,
      ctl_mainsheet: 45,
      ctl_jib_sheet: 60,
    };
    let s = initialState({ controls, boat: { mode: 'held' } });
    let rig = initialRig(controls);
    for (let i = 0; i < 600; i += 1) {
      s = act(s, { type: 'step', dt: 1 / 60 });
      rig = step({ controls, rig }, 1 / 60, AT_REST);
    }
    expect(Math.abs(s.rig.theta.value - rig.theta.value)).toBeLessThan(1e-9);
    expect(Math.abs(s.rig.psi.value - rig.psi.value)).toBeLessThan(1e-9);
    expect(Math.abs(s.rig.jibPhi.value - rig.jibPhi.value)).toBeLessThan(1e-9);
    expect(s.boat.speedMps).toBe(0);
    expect(s.boat.headingDeg).toBe(0);
    expect(s.rig.wind.awaDeg).toBe(70);
    expect(s.rig.wind.awsKn).toBe(14);
  });

  it('Sailing to Held zeroes the speed at once and keeps the heading; Held to Sailing starts at 0', () => {
    let s = run(initialState({ boat: { headingDeg: 130 } }), 2);
    expect(s.boat.speedMps).toBeGreaterThan(1);
    s = act(s, { type: 'setBoatMode', mode: 'held' });
    expect(s.boat.speedMps).toBe(0);
    expect(s.boat.yawRateDegS).toBe(0);
    expect(s.boat.headingDeg).toBeCloseTo(130, 3);
    const heading = s.boat.headingDeg;
    s = run(s, 2);
    expect(s.boat.headingDeg).toBe(heading);
    s = act(s, { type: 'setBoatMode', mode: 'sailing' });
    expect(s.boat.speedMps).toBe(0);
    s = run(s, 3);
    expect(s.boat.speedMps).toBeGreaterThan(0);
  });
});

describe('model sanity', () => {
  it('symmetry: the same trim on either tack gives the same speed', () => {
    const port = steadyState(trimmed(12, -60, 25, 50), 0).speedMps;
    const starboard = steadyState(trimmed(12, 60, 25, 50), 0).speedMps;
    expect(Math.abs(mpsToKn(port) - mpsToKn(starboard))).toBeLessThan(0.01);
  });

  it('frame-rate independence: 30, 60 and 120 fps end in the same place', () => {
    const results = [30, 60, 120].map((fps) => {
      let s = initialState({
        controls: { ctl_wind_dir: 90, ctl_wind_speed: 12, ctl_mainsheet: 40, ctl_jib_sheet: 100 },
        autopilot: { mode: 'off', targetDeg: 0, integralDeg: 0 },
      });
      s = act(s, { type: 'setControls', values: { ctl_rudder: 10 } });
      s = run(s, 30, fps);
      s = act(s, { type: 'setControls', values: { ctl_rudder: 0 } });
      return run(s, 30, fps).boat;
    });
    const [a, ...others] = results;
    for (const b of others) {
      expect(Math.abs(wrap180((a?.headingDeg ?? 0) - b.headingDeg))).toBeLessThan(0.5);
      expect(Math.abs(mpsToKn((a?.speedMps ?? 0) - b.speedMps))).toBeLessThan(0.05);
      expect(Math.hypot((a?.eastM ?? 0) - b.eastM, (a?.northM ?? 0) - b.northM)).toBeLessThan(1);
    }
  });

  it('no NaN and no runaway over wind speeds, angles and sheets', () => {
    for (const tws of [0, 12, 30]) {
      for (let twa = -150; twa <= 180; twa += 30) {
        for (const main of [0, 100]) {
          const start = initialState({
            controls: { ctl_wind_dir: twa, ctl_wind_speed: tws, ctl_mainsheet: main },
          });
          run(start, 60, 10, (state) => {
            const { boat } = state;
            for (const value of [
              boat.speedMps,
              boat.headingDeg,
              boat.yawRateDegS,
              boat.eastM,
              boat.northM,
              state.controls.ctl_rudder,
            ]) {
              expect(Number.isFinite(value)).toBe(true);
            }
            expect(Math.abs(mpsToKn(boat.speedMps))).toBeLessThan(12);
            expect(boat.headingDeg).toBeGreaterThanOrEqual(0);
            expect(boat.headingDeg).toBeLessThan(360);
            return state;
          });
        }
      }
    }
  });
});
