import { describe, expect, it } from 'vitest';
import {
  adjustAutopilot,
  autopilotHeadingDeg,
  engageAutopilot,
  stepAutopilot,
  tackAutopilot,
} from '../src/model/autopilot';
import { wrap180 } from '../src/model/angles';
import { initialBoat } from '../src/model/motion';
import { act, initialState, run } from './motionHelpers';

const boatAt = (headingDeg: number) => initialBoat({ headingDeg });

describe('autopilot commands', () => {
  it('engages on the heading or the true wind angle the boat has now', () => {
    expect(engageAutopilot('heading', boatAt(314.6), 0)).toEqual({
      mode: 'heading',
      targetDeg: 315,
      integralDeg: 0,
    });
    expect(engageAutopilot('wind', boatAt(315), 0)).toEqual({
      mode: 'wind',
      targetDeg: 45,
      integralDeg: 0,
    });
    expect(engageAutopilot('wind', boatAt(45), 0).targetDeg).toBe(-45);
    expect(engageAutopilot('heading', boatAt(359.7), 0).targetDeg).toBe(0);
  });

  it('turnDeg + turns the boat to starboard in both modes', () => {
    const heading = engageAutopilot('heading', boatAt(350), 0);
    expect(adjustAutopilot(heading, 20).targetDeg).toBe(10);
    expect(adjustAutopilot(heading, -10).targetDeg).toBe(340);
    // Wind on the starboard side (+45): turning to starboard bears away, the angle grows.
    const wind = engageAutopilot('wind', boatAt(315), 0);
    expect(adjustAutopilot(wind, -10).targetDeg).toBe(55);
    expect(adjustAutopilot(wind, 10).targetDeg).toBe(35);
  });

  it('the integral resets for a big turn only', () => {
    const ap = { ...engageAutopilot('heading', boatAt(0), 0), integralDeg: 3 };
    expect(adjustAutopilot(ap, 1).integralDeg).toBe(3);
    expect(adjustAutopilot(ap, 10).integralDeg).toBe(0);
  });

  it('tack mirrors the course across the wind', () => {
    const wind = engageAutopilot('wind', boatAt(315), 0);
    expect(tackAutopilot(wind, boatAt(315), 0).targetDeg).toBe(-45);
    const heading = engageAutopilot('heading', boatAt(315), 0);
    expect(tackAutopilot(heading, boatAt(315), 0).targetDeg).toBe(45);
    const gybe = engageAutopilot('heading', boatAt(135), 0);
    expect(tackAutopilot(gybe, boatAt(135), 0).targetDeg).toBe(225);
    expect(tackAutopilot({ ...wind, mode: 'off' }, boatAt(315), 0).mode).toBe('off');
  });

  it('knows the heading it steers to', () => {
    expect(autopilotHeadingDeg(engageAutopilot('heading', boatAt(120), 0), 0)).toBe(120);
    expect(autopilotHeadingDeg({ mode: 'wind', targetDeg: 45, integralDeg: 0 }, 90)).toBe(45);
    expect(autopilotHeadingDeg({ mode: 'wind', targetDeg: -45, integralDeg: 0 }, 0)).toBe(45);
  });

  it('moves the wheel no faster than the rudder rate and never beyond its limit', () => {
    const ap = engageAutopilot('heading', boatAt(0), 0);
    const turned = { ...ap, targetDeg: 90 };
    const step = stepAutopilot(turned, boatAt(0), 0, 0, 0.5);
    expect(step.rudderTargetDeg).toBeCloseTo(4, 9);
    let rudder = 0;
    for (let i = 0; i < 200; i += 1)
      rudder = stepAutopilot(turned, boatAt(0), 0, rudder, 0.1).rudderTargetDeg;
    expect(rudder).toBe(25);
  });

  it('Standby does not touch the wheel', () => {
    const off = { mode: 'off' as const, targetDeg: 0, integralDeg: 0 };
    expect(stepAutopilot(off, boatAt(90), 0, 7, 1).rudderTargetDeg).toBe(7);
  });
});

/** Wind from 90°, heading 0, main 40, jib 100, steady speed, autopilot holding 0. */
function beamReach(windKn: number) {
  return initialState({
    controls: { ctl_wind_dir: 90, ctl_wind_speed: windKn, ctl_mainsheet: 40, ctl_jib_sheet: 100 },
  });
}

describe('autopilot holds a course', () => {
  for (const [windKn, settleS] of [
    [12, 20],
    [6, 30],
  ] as const) {
    it(`a 20° course change at ${windKn} kn overshoots by at most 3° and settles within ±2°`, () => {
      let s = run(beamReach(windKn), 60);
      expect(Math.abs(wrap180(s.boat.headingDeg))).toBeLessThan(0.5);
      s = act(s, { type: 'autopilot', command: { turnDeg: 20 } });
      let worst = 0;
      let late = 0;
      s = run(s, 60, 60, (state, t) => {
        worst = Math.max(worst, wrap180(state.boat.headingDeg));
        if (t >= settleS) late = Math.max(late, Math.abs(wrap180(state.boat.headingDeg - 20)));
        return state;
      });
      expect(worst - 20).toBeLessThanOrEqual(3);
      expect(late).toBeLessThanOrEqual(2);
      if (windKn === 12) expect(Math.abs(s.controls.ctl_rudder)).toBeLessThan(6);
    });
  }

  it('turning the wheel takes the wheel and shows the notice for 3 s', () => {
    let s = beamReach(12);
    expect(s.autopilot.mode).toBe('heading');
    s = act(s, { type: 'setControls', values: { ctl_rudder: 10 } });
    expect(s.autopilot.mode).toBe('off');
    expect(s.autopilotNoticeS).toBe(3);
    s = run(s, 3.5);
    expect(s.autopilotNoticeS).toBe(0);
    expect(s.controls.ctl_rudder).toBe(10);
  });

  it('the autopilot moving the wheel does not switch itself off', () => {
    let s = act(beamReach(12), { type: 'autopilot', command: { turnDeg: 30 } });
    s = run(s, 5);
    expect(s.autopilot.mode).toBe('heading');
    expect(s.controls.ctl_rudder).not.toBe(0);
  });

  it('wind mode keeps the true wind angle when the wind turns', () => {
    let s = act(beamReach(12), { type: 'autopilot', command: 'wind' });
    expect(s.autopilot.targetDeg).toBe(90);
    s = run(s, 5);
    s = act(s, { type: 'setControls', values: { ctl_wind_dir: 110 } });
    s = run(s, 50);
    const twa = wrap180(s.controls.ctl_wind_dir - s.boat.headingDeg);
    expect(Math.abs(twa - 90)).toBeLessThan(2);
  });
});
