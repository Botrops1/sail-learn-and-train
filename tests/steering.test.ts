import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import { controlSpec, defaultControls } from '../src/model/controls';
import { initialRig, step } from '../src/model/sim';
import { wheelTurnDeg, wheelTurns } from '../src/model/steering';

describe('wheel and rudder (PHASE1_SPEC 4, 7.1)', () => {
  it('lock to lock is wheelTurnsLockToLock turns of the wheel', () => {
    const spec = controlSpec('ctl_rudder');
    expect(spec.min).toBe(-35);
    expect(spec.max).toBe(35);
    expect(wheelTurns(spec.max) - wheelTurns(spec.min)).toBeCloseTo(
      boat.cockpitHardware.wheelTurnsLockToLock,
      9,
    );
  });

  it('same sign as the rudder: + = clockwise wheel, back edge of the rudder to starboard', () => {
    expect(wheelTurnDeg(0)).toBe(0);
    expect(wheelTurnDeg(10)).toBeGreaterThan(0);
    expect(wheelTurnDeg(-10)).toBeCloseTo(-wheelTurnDeg(10), 9);
  });

  it('the rudder follows the wheel control with the usual lag, not in a jump', () => {
    const controls = defaultControls();
    let rig = initialRig(controls);
    expect(rig.applied.rudder).toBe(0);
    const turned = { ...controls, ctl_rudder: 20 };
    rig = step({ controls: turned, rig }, 0.05);
    expect(rig.applied.rudder).toBeGreaterThan(0);
    expect(rig.applied.rudder).toBeLessThan(20);
    for (let i = 0; i < 300; i += 1) rig = step({ controls: turned, rig }, 1 / 60);
    expect(rig.applied.rudder).toBeCloseTo(20, 3);
  });
});
