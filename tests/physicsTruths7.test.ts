import { describe, expect, it } from 'vitest';
import { boat as boatData } from '../src/model/boat';
import { mpsToKn, wrap180 } from '../src/model/angles';
import { act, harbourStart, run } from './motionHelpers';

/** Phase 7 physics truths (PHYSICS_TRUTHS.md PT-47 … PT-49 and PT-27), from M40 on. */

const lowSpeed = boatData.physics.lowSpeed as { propWalkSide: number; propWashFraction: number };

describe('PT-47 wind on a slow boat', () => {
  it('PT-47 a side wind slides her to port and turns the bow to port, then she lies beam-on', () => {
    const at30 = run(harbourStart({ windDirDeg: 90, twsKn: 15 }), 30);
    expect(at30.boat.swayMps).toBeGreaterThan(-0.4);
    expect(at30.boat.swayMps).toBeLessThan(-0.24);
    expect(wrap180(at30.boat.headingDeg)).toBeGreaterThan(-18);
    expect(wrap180(at30.boat.headingDeg)).toBeLessThan(-9);
    const at300 = run(harbourStart({ windDirDeg: 90, twsKn: 15 }), 300);
    const twa = wrap180(at300.controls.ctl_wind_dir - at300.boat.headingDeg);
    expect(twa).toBeGreaterThan(96);
    expect(twa).toBeLessThan(116);
  });

  it('PT-47 more wind slides her faster', () => {
    const sway = (tws: number) =>
      Math.abs(run(harbourStart({ windDirDeg: 90, twsKn: tws }), 30).boat.swayMps);
    expect(sway(10)).toBeLessThan(sway(15));
    expect(sway(15)).toBeLessThan(sway(20));
  });

  it('PT-47 the bow blows off downwind, the same on both sides', () => {
    const port = run(harbourStart({ windDirDeg: 45, twsKn: 15 }), 30);
    const heading = wrap180(port.boat.headingDeg);
    expect(heading).toBeGreaterThan(-40);
    expect(heading).toBeLessThan(-25);
    const mirror = run(harbourStart({ windDirDeg: -45, twsKn: 15 }), 30);
    expect(wrap180(mirror.boat.headingDeg)).toBeCloseTo(-heading, 1);
  });
});

describe('PT-27 prop walk', () => {
  const astern = (lever: number, seconds: number) =>
    run(harbourStart({ engine: { running: true, leverPct: lever } }), seconds);

  it('PT-27 astern the stern walks to port: the bow turns to starboard', () => {
    const half = astern(-50, 15);
    expect(wrap180(half.boat.headingDeg)).toBeGreaterThan(4.0);
    expect(wrap180(half.boat.headingDeg)).toBeLessThan(8.5);
    expect(half.boat.speedMps).toBeLessThan(0);
    const slow = astern(-30, 15);
    expect(wrap180(slow.boat.headingDeg)).toBeGreaterThan(2.5);
    expect(wrap180(slow.boat.headingDeg)).toBeLessThan(6.0);
  });

  it('PT-27 the side is one data value', () => {
    const before = lowSpeed.propWalkSide;
    try {
      const normal = wrap180(astern(-50, 15).boat.headingDeg);
      lowSpeed.propWalkSide = -1;
      expect(wrap180(astern(-50, 15).boat.headingDeg)).toBeCloseTo(-normal, 1);
    } finally {
      lowSpeed.propWalkSide = before;
    }
  });

  it('PT-27 ahead there is no walk', () => {
    const ahead = astern(50, 15);
    expect(Math.abs(wrap180(ahead.boat.headingDeg))).toBeLessThan(0.01);
  });
});

describe('PT-48 kick ahead', () => {
  const kick = (rudder: number) => {
    let s = harbourStart({ rudderDeg: rudder, engine: { running: true, leverPct: 0 } });
    s = run(s, 1);
    s = act(s, { type: 'engine', command: { leverPct: 60 } });
    s = run(s, 3);
    s = act(s, { type: 'engine', command: { leverPct: 0 } });
    return run(s, 5);
  };

  it('PT-48 a burst ahead with the wheel over turns a stopped boat', () => {
    const s = kick(35);
    expect(wrap180(s.boat.headingDeg)).toBeGreaterThan(4.5);
    expect(wrap180(s.boat.headingDeg)).toBeLessThan(8.5);
    expect(mpsToKn(s.boat.speedMps)).toBeGreaterThan(0.45);
    expect(mpsToKn(s.boat.speedMps)).toBeLessThan(0.75);
    expect(Math.abs(wrap180(kick(0).boat.headingDeg))).toBeLessThan(0.01);
    expect(wrap180(kick(-35).boat.headingDeg)).toBeCloseTo(-wrap180(s.boat.headingDeg), 1);
  });

  it('PT-48 without the water over the rudder she turns much less', () => {
    const before = lowSpeed.propWashFraction;
    try {
      lowSpeed.propWashFraction = 0;
      expect(wrap180(kick(35).boat.headingDeg)).toBeLessThan(4.0);
    } finally {
      lowSpeed.propWashFraction = before;
    }
  });
});

describe('PT-49 carrying way', () => {
  const coast = (lever: number) => {
    let s = harbourStart({ speedKn: 4, engine: { running: true, leverPct: lever } });
    const north0 = s.boat.northM;
    let t = 0;
    const limit = lever === 0 ? 0.5 : 0;
    while (t < 600) {
      s = run(s, 0.5, 60);
      t += 0.5;
      const done = lever === 0 ? mpsToKn(s.boat.speedMps) < limit : s.boat.speedMps <= limit;
      if (done) break;
    }
    return { t, distanceM: s.boat.northM - north0 };
  };

  it('PT-49 in neutral she keeps going for minutes and well over a hundred metres', () => {
    const r = coast(0);
    expect(r.t).toBeGreaterThan(190);
    expect(r.t).toBeLessThan(270);
    expect(r.distanceM).toBeGreaterThan(140);
    expect(r.distanceM).toBeLessThan(200);
  });

  it('PT-49 astern stops her within about 25 s and 25 m', () => {
    const r = coast(-50);
    expect(r.t).toBeGreaterThan(21);
    expect(r.t).toBeLessThan(30);
    expect(r.distanceM).toBeGreaterThan(20);
    expect(r.distanceM).toBeLessThan(29);
  });
});
