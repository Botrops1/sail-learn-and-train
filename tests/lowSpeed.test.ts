import { describe, expect, it } from 'vitest';
import { DEG } from '../src/model/angles';
import { initialBoat } from '../src/model/motion';
import {
  addForces,
  forceAt,
  hullLowSpeedForces,
  pointVelocity,
  steerShare,
} from '../src/model/lowSpeed';
import { initialState, run } from './motionHelpers';

/** M40 slow-speed handling (PHASE7_SPEC 6.6). */
describe('low-speed model', () => {
  it('forceAt: a push at the bow turns her, at the stern the other way', () => {
    expect(forceAt(6.9, 0, 0, 100).momentNm).toBeCloseTo(790, 6);
    expect(forceAt(-8.0, 0, 0, 100).momentNm).toBeCloseTo(-700, 6);
    expect(forceAt(0, 2, 100, 0).momentNm).toBeCloseTo(-200, 6);
    expect(addForces()).toEqual({ surgeN: 0, sideN: 0, momentNm: 0 });
  });

  it('pointVelocity: spinning at rest, the bow moves to starboard', () => {
    const boat = initialBoat({ yawRateDegS: 10 });
    const [east, north] = pointVelocity(boat, 6.9, 0);
    expect(east).toBeCloseTo(7.9 * 10 * DEG, 3);
    expect(north).toBeCloseTo(0, 3);
  });

  it('hull wind: a side wind pushes to port and fades out at 1 m/s', () => {
    const f = hullLowSpeedForces(0, 0, 15, 90, 0, 0);
    expect(f.sideN).toBeGreaterThan(-1200);
    expect(f.sideN).toBeLessThan(-1135);
    expect(f.momentNm).toBeCloseTo(0.3 * f.sideN, 0);
    expect(hullLowSpeedForces(1.0, 0, 15, 90, 0, 0).sideN).toBeCloseTo(0, 9);
  });

  it('prop walk: astern the stern goes to port and the bow to starboard', () => {
    const f = hullLowSpeedForces(0, 0, 0, 0, -1000, 0);
    expect(f.sideN).toBeCloseTo(-200, 6);
    expect(f.momentNm).toBeCloseTo(680, 6);
    expect(hullLowSpeedForces(0, 0, 0, 0, 1000, 0).sideN).toBeCloseTo(0, 9);
  });

  it('prop wash: ahead with the wheel to starboard turns her to starboard', () => {
    const f = hullLowSpeedForces(0, 0, 0, 0, 1000, 35);
    expect(f.sideN).toBeCloseTo(-286.8, 0);
    expect(f.momentNm).toBeCloseTo(1936, -1);
  });

  it('steerShare is full from 1 kn ahead and 5 kn astern', () => {
    expect(steerShare(0.5)).toBe(1);
    expect(steerShare(0.25)).toBeCloseTo(0.5, 9);
    expect(steerShare(-2.5)).toBe(1);
    expect(steerShare(-1.25)).toBeCloseTo(0.5, 9);
  });

  it('sailing unchanged: no sway at all while she makes way', () => {
    let s = initialState({
      controls: {
        ctl_wind_dir: 90,
        ctl_wind_speed: 15,
        ctl_main_furl: 100,
        ctl_jib_furl: 100,
        ctl_mainsheet: 30,
        ctl_jib_sheet: 30,
      },
    });
    s = { ...s, autopilot: { ...s.autopilot, mode: 'off' } };
    run(s, 60, 60, (next) => {
      expect(next.boat.speedMps).toBeGreaterThan(1.0);
      expect(Math.abs(next.boat.swayMps)).toBeLessThan(1e-6);
      return next;
    });
  });
});
