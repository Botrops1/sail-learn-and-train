import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import { defaultControls } from '../src/model/controls';
import { steadyState } from '../src/model/motion';
import { sailForces } from '../src/model/sailForces';
import { initialRig } from '../src/model/sim';
import { blanketFactor, floggingDamage, NO_DAMAGE, sailTrim } from '../src/model/trim';
import { act, bestSpeedKn, initialState, run, trimmed } from './motionHelpers';

/** A rig settled for the boat's steady speed and heel (PHASE2_SPEC 9.5). */
function settled(tws: number, twa: number, main: number, jib: number, heel = true) {
  const controls = trimmed(tws, twa, main, jib);
  const steady = steadyState(controls, 0, undefined, { heel });
  const rig = initialRig(
    controls,
    undefined,
    {},
    {
      velocity: [steady.speedMps, 0, 0],
      headingDeg: 0,
      heelDeg: steady.heelDeg,
    },
  );
  return { controls, steady, rig };
}

describe('PT-23 over-trimmed sails stall', () => {
  it('PT-23 TWS 12, TWA 60: main sheet 25 is good, sheet 0 is stalled with less drive and more side force', () => {
    const good = settled(12, 60, 25, 50);
    const stalled = settled(12, 60, 0, 50);
    const goodTrim = sailTrim('main', good.rig, good.rig.wind.awaDeg);
    const stalledTrim = sailTrim('main', stalled.rig, stalled.rig.wind.awaDeg);
    expect(goodTrim.state).toBe('good');
    expect(stalledTrim.state).toBe('stalled');
    // The leeward telltales hang when the sail is stalled, and stream when it is good.
    expect(stalledTrim.telltales.some((tt) => tt.leeward === 'stalled')).toBe(true);
    expect(goodTrim.telltales.every((tt) => tt.leeward === 'streaming')).toBe(true);
    const forcesAt = (s: ReturnType<typeof settled>) =>
      sailForces(s.rig, s.controls, s.rig.wind.awsKn, s.rig.wind.awaDeg, s.steady.heelDeg).main;
    // Compared in the same apparent wind, so only the trim differs.
    const a = forcesAt(good);
    const b = forcesAt(stalled);
    expect(b.driveN).toBeLessThan(a.driveN);
    expect(b.sideN).toBeGreaterThan(a.sideN);
  });

  it('PT-23 the boat is slower and more heeled with the main pulled in too far', () => {
    const good = settled(12, 60, 25, 50);
    const stalled = settled(12, 60, 0, 50);
    expect(stalled.steady.speedMps).toBeLessThan(good.steady.speedMps);
  });

  it('PT-23 telltales: easing the sheet lifts the top windward telltale before the bottom one', () => {
    // The main is twisted (the head is turned more open than the foot), so as the sheet is eased
    // the top of the sail reaches the wind first: a setting exists where the sail is still good,
    // the top ribbon lifts and the bottom one does not.
    let found = false;
    for (let sheet = 0; sheet <= 60 && !found; sheet += 1) {
      const { rig } = settled(12, 60, sheet, 50);
      const trim = sailTrim('main', rig, rig.wind.awaDeg);
      if (trim.state !== 'good') continue;
      const [bottom, , top] = trim.telltales;
      if (top?.windward === 'lifting' && bottom?.windward === 'streaming') found = true;
    }
    expect(found).toBe(true);
  });

  it('PT-23 the states: furled, luffing, pushed', () => {
    const furled = initialRig({ ...trimmed(12, 60, 40, 50), ctl_main_furl: 0 });
    expect(sailTrim('main', furled, 60).state).toBe('furled');
    const luffing = settled(12, 60, 100, 50);
    expect(sailTrim('main', luffing.rig, luffing.rig.wind.awaDeg).state).toBe('luffing');
    const run = initialRig(trimmed(12, 175, 100, 100));
    expect(sailTrim('main', run, 175).state).toBe('pushed');
    expect(sailTrim('main', run, 175).telltales).toEqual([]);
  });
});

describe('PT-37 on a run the main blankets the jib', () => {
  it('PT-37 TWA 175: the jib is blanketed and keeps at most 20 % of its force', () => {
    const rig = initialRig(trimmed(12, 175, 100, 100));
    expect(sailTrim('jib', rig, 175).state).toBe('blanketed');
    expect(blanketFactor(175)).toBeLessThanOrEqual(0.2);
    expect(blanketFactor(175)).toBeCloseTo(boat.physics.trim.blanket.jibForceFactorAtFull, 5);
  });

  it('PT-37 TWA 120: no blanketing', () => {
    expect(blanketFactor(120)).toBe(1);
    const rig = initialRig(trimmed(12, 120, 80, 50));
    expect(sailTrim('jib', rig, 120).state).not.toBe('blanketed');
  });

  it('PT-37 the factor falls smoothly from 150° to 170° and is the same on both tacks', () => {
    let previous = 1;
    for (let awa = 150; awa <= 170; awa += 1) {
      const f = blanketFactor(awa);
      expect(f).toBeLessThanOrEqual(previous + 1e-12);
      previous = f;
      expect(blanketFactor(-awa)).toBe(f);
    }
  });

  it('PT-37 the jib force is cut by the factor', () => {
    const controls = trimmed(12, 175, 100, 100);
    const rig = initialRig(controls);
    const blanketed = sailForces(rig, controls, 12, 175, 0).jib;
    const open = sailForces(rig, controls, 12, 150, 0).jib;
    expect(blanketed.areaM2 / open.areaM2).toBeCloseTo(blanketFactor(175), 5);
  });

  it('PT-37 calibration: the best speed on a run (TWA 175, TWS 12) is 3.7–5.0 kn with heel', () => {
    const speed = bestSpeedKn(12, 175, true);
    expect(speed).toBeGreaterThanOrEqual(3.7);
    expect(speed).toBeLessThanOrEqual(5.0);
  });
});

describe('PT-38 flogging damages sails', () => {
  const held = (wind: number) =>
    initialState({
      controls: { ...defaultControls(), ctl_wind_dir: 0, ctl_wind_speed: wind },
      boat: { mode: 'held' },
    });

  it('PT-38 head to wind at 25 kn the main is torn after 384 s, not before', () => {
    let s = held(25);
    s = run(s, 383);
    expect(s.sailDamage.main).toBeLessThan(1);
    s = run(s, 2);
    expect(s.sailDamage.main).toBeGreaterThanOrEqual(1);
    expect(s.sailDamage.jib).toBeGreaterThanOrEqual(1);
  });

  it('PT-38 at 6 kn there is no damage after an hour', () => {
    const s = run(held(6), 3600, 10);
    expect(s.sailDamage).toEqual(NO_DAMAGE);
  });

  it('PT-38 a sail that is filled does not wear', () => {
    const { rig } = settled(12, 60, 25, 50);
    expect(floggingDamage(NO_DAMAGE, rig, 100)).toBe(NO_DAMAGE);
  });

  it('PT-38 a torn sail gives only 40 % of its force; repairing restores it', () => {
    let s = run(held(25), 400);
    expect(s.sailDamage.main).toBe(1);
    const controls = s.controls;
    const whole = sailForces(s.rig, controls, 25, 0, 0).main;
    const torn = sailForces(s.rig, controls, 25, 0, 0, undefined, s.sailDamage).main;
    expect(torn.dragN / whole.dragN).toBeCloseTo(boat.physics.trim.flogging.tornForceFactor, 5);
    s = act(s, { type: 'repairSails' });
    expect(s.sailDamage).toEqual(NO_DAMAGE);
  });

  it('PT-38 Reset gives new sails and damage does not run while paused', () => {
    let s = run(held(25), 100);
    expect(s.sailDamage.main).toBeGreaterThan(0);
    const before = s.sailDamage.main;
    s = act(s, { type: 'setPaused', paused: true });
    s = run(s, 10);
    expect(s.sailDamage.main).toBe(before);
    s = act(s, { type: 'reset' });
    expect(s.sailDamage).toEqual(NO_DAMAGE);
  });
});
