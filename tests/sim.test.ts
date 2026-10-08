import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import { defaultControls, type Controls } from '../src/model/controls';
import { AT_REST, initialRig, lag, springTo, step, type RigState } from '../src/model/sim';

function run(rig: RigState, controls: Controls, seconds: number, dt = 1 / 60): RigState {
  let current = rig;
  for (let t = 0; t < seconds - 1e-9; t += dt)
    current = step({ controls, rig: current }, dt, AT_REST);
  return current;
}

describe('rig step (PHASE1_SPEC 7.1, 8.3 step 5, 9.1)', () => {
  it('first-order lag reaches about 63 % after one time constant', () => {
    const tau = boat.visual.controlResponseTimeS;
    let value = 0;
    for (let i = 0; i < 100; i += 1) value = lag(value, 100, tau / 100, tau);
    expect(value).toBeCloseTo(100 * (1 - Math.exp(-1)), 6);
  });

  it('the critically damped spring arrives without overshoot, for any frame time', () => {
    for (const dt of [1 / 120, 1 / 30, 0.1]) {
      let spring = { value: 0, velocity: 0 };
      let max = 0;
      for (let t = 0; t < 5; t += dt) {
        spring = springTo(spring, 50, dt, 0.3);
        max = Math.max(max, spring.value);
      }
      expect(max).toBeLessThanOrEqual(50 + 1e-9);
      expect(spring.value).toBeCloseTo(50, 3);
    }
  });

  it('a rope control does not jump: the rope follows with a lag, the boom follows the rope', () => {
    const start = { ...defaultControls(), ctl_wind_dir: 90, ctl_mainsheet: 10 };
    const eased = { ...start, ctl_mainsheet: 80 };
    const rig = initialRig(start);
    const soon = run(rig, eased, 0.1);
    expect(soon.applied.mainsheet).toBeGreaterThan(10);
    expect(soon.applied.mainsheet).toBeLessThan(40);
    expect(Math.abs(soon.theta.value)).toBeLessThan(Math.abs(soon.solution.thetaDeg) + 1e-9);
    const later = run(soon, eased, 4);
    const settled = initialRig(eased);
    expect(later.applied.mainsheet).toBeCloseTo(80, 2);
    expect(later.theta.value).toBeCloseTo(settled.solution.thetaDeg, 1);
    expect(later.psi.value).toBeCloseTo(settled.solution.psiDeg, 1);
    expect(later.fill).toBeCloseTo(settled.solution.fill, 2);
  });

  it('step accepts a boat velocity and heading (zero in Phase 1) and advances time', () => {
    const controls = defaultControls();
    const rig = initialRig(controls);
    const next = step({ controls, rig }, 0.5, { velocity: [0, 0, 0], headingDeg: 0 });
    expect(next.timeS).toBeCloseTo(0.5, 9);
  });

  it('no wind: the boom keeps its swing (nothing pushes it), the sail does not fill', () => {
    const reach = { ...defaultControls(), ctl_wind_dir: 90, ctl_mainsheet: 60 };
    const rig = run(initialRig(reach), reach, 1);
    const calm = run(rig, { ...reach, ctl_wind_speed: 0 }, 2);
    expect(calm.solution.thetaDeg).toBeCloseTo(rig.solution.thetaDeg, 6);
    expect(calm.solution.fill).toBe(0);
  });

  it('the GYBE label shows for gybeLabelS seconds, then goes', () => {
    const sheet = { ...defaultControls(), ctl_mainsheet: 100 };
    let rig = run(initialRig({ ...sheet, ctl_wind_dir: 170 }), { ...sheet, ctl_wind_dir: -170 }, 1);
    rig = run(rig, { ...sheet, ctl_wind_dir: -165 }, 1 / 60);
    expect(rig.gybeLabelS).toBeGreaterThan(boat.visual.gybeLabelS - 0.1);
    rig = run(rig, { ...sheet, ctl_wind_dir: -165 }, boat.visual.gybeLabelS + 0.1);
    expect(rig.gybeLabelS).toBe(0);
    expect(rig.gybing).toBe(false);
  });

  it('a tack (wind crossing the bow) changes sides without a GYBE label', () => {
    const base = { ...defaultControls(), ctl_mainsheet: 20 };
    let rig = initialRig({ ...base, ctl_wind_dir: 40 });
    rig = run(rig, { ...base, ctl_wind_dir: -40 }, 1);
    expect(rig.solution.side).toBe(1);
    expect(rig.gybeLabelS).toBe(0);
  });
});
