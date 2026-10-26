import { describe, expect, it } from 'vitest';
import { initialState, reduce, type AppState } from '../src/app/store';
import { parseUrlState, serializeUrlState } from '../src/app/urlState';
import { boat as boatData, HANSE_508, useBoat, type BoatData } from '../src/model/boat';
import { harbourForces } from '../src/model/harbourForces';
import {
  hasThruster,
  thrusterTunnelPlace,
  THRUSTERS_OFF,
  thrusterForces,
  thrusterSpeedFactor,
} from '../src/model/thrusters';
import { knToMps, mpsToKn } from '../src/model/angles';
import type { BoatState } from '../src/model/motion';
import { act, harbourStart, run } from './motionHelpers';

const still = (speedMps = 0): BoatState => ({ ...harbourStart({}).boat, speedMps });

describe('thrusterSpeedFactor (PHASE7_SPEC 7.8 test 1)', () => {
  it('fades with speed', () => {
    expect(thrusterSpeedFactor(0)).toBeCloseTo(1, 9);
    expect(thrusterSpeedFactor(knToMps(1.5))).toBeCloseTo(0.75, 9);
    expect(thrusterSpeedFactor(knToMps(4))).toBeCloseTo(0.3, 9);
    expect(thrusterSpeedFactor(knToMps(10))).toBeCloseTo(0.2, 9);
    expect(thrusterSpeedFactor(-knToMps(4))).toBeCloseTo(0.3, 9);
  });
});

describe('thrusterForces (test 2)', () => {
  it('a push at the bow, at the stern, and both ways', () => {
    const bow = thrusterForces({ bow: 1, stern: 0 }, still());
    expect(bow.sideN).toBeCloseTo(1300, 6);
    expect(bow.momentNm).toBeCloseTo(6890, 6);
    expect(bow.surgeN).toBeCloseTo(0, 9);
    const stern = thrusterForces({ bow: 0, stern: 1 }, still());
    expect(stern.sideN).toBeCloseTo(1000, 6);
    expect(stern.momentNm).toBeCloseTo(-5200, 6);
    const spin = thrusterForces({ bow: 1, stern: -1 }, still());
    expect(spin.sideN).toBeCloseTo(300, 6);
    expect(spin.momentNm).toBeCloseTo(12090, 6);
  });

  it('off is zero, and the push follows the speed factor', () => {
    expect(thrusterForces(THRUSTERS_OFF, still()).sideN).toBe(0);
    const fast = thrusterForces({ bow: -1, stern: 0 }, still(knToMps(4)));
    expect(fast.sideN).toBeCloseTo(-1300 * 0.3, 6);
  });

  it('harbourForces gives the same force through the hook', () => {
    const boat = still();
    const hook = harbourForces({
      thrusters: { bow: 1, stern: -1 },
      obstacles: [],
      fenders: { out: false, lost: [] },
    });
    expect(hook(boat)).toEqual(thrusterForces({ bow: 1, stern: -1 }, boat));
  });
});

describe('where they are (PHASE7_SPEC 7.2; owner: both are tunnels, PR #99)', () => {
  it('each tunnel is halfway to the hull bottom and has a hole on each side', () => {
    const bow = thrusterTunnelPlace('bow');
    expect(bow.x).toBe(4.3);
    expect(bow.y).toBeCloseTo(-0.15, 1);
    expect(bow.halfWidthM).toBeGreaterThan(0.1);
    expect(bow.halfWidthM).toBeLessThan(1);
    const stern = thrusterTunnelPlace('stern');
    expect(stern.x).toBe(-6.2);
    expect(stern.y).toBeLessThan(0);
    expect(stern.y - stern.diameter / 2).toBeGreaterThan(-0.3);
    expect(stern.halfWidthM).toBeGreaterThan(0.1);
    expect(boatData.hull.thrusters.map((t) => t.id)).toEqual([
      'part_bow_thruster',
      'part_stern_thruster',
    ]);
  });
});

describe('store (test 3)', () => {
  it('the thruster action sets and clears, and returns the same state if unchanged', () => {
    const s0 = initialState();
    const s1 = reduce(s0, { type: 'thruster', which: 'bow', dir: 1 });
    expect(s1.thrusters).toEqual({ bow: 1, stern: 0 });
    expect(reduce(s1, { type: 'thruster', which: 'bow', dir: 1 })).toBe(s1);
    const s2 = reduce(s1, { type: 'thruster', which: 'stern', dir: -1 });
    expect(s2.thrusters).toEqual({ bow: 1, stern: -1 });
    expect(reduce(s2, { type: 'thruster', which: 'bow', dir: 0 }).thrusters).toEqual({
      bow: 0,
      stern: -1,
    });
  });

  it('reset and load give THRUSTERS_OFF', () => {
    const on = reduce(initialState(), { type: 'thruster', which: 'bow', dir: 1 });
    expect(reduce(on, { type: 'reset' }).thrusters).toEqual(THRUSTERS_OFF);
    expect(reduce(on, { type: 'load', state: initialState() }).thrusters).toEqual(THRUSTERS_OFF);
  });

  it('Held still with a thruster on: the boat does not move in 5 s', () => {
    let s: AppState = harbourStart({});
    s = act(s, { type: 'setBoatMode', mode: 'held' });
    s = act(s, { type: 'thruster', which: 'bow', dir: 1 });
    const before = s.boat;
    s = run(s, 5);
    expect(s.boat.headingDeg).toBe(before.headingDeg);
    expect(s.boat.eastM).toBe(before.eastM);
    expect(s.boat.northM).toBe(before.northM);
    expect(s.boat.swayMps).toBe(0);
  });

  it('a thruster on a stopped boat moves her; with all thrusters off nothing extra runs', () => {
    const idle = run(harbourStart({}), 5);
    expect(idle.boat.headingDeg).toBeCloseTo(0, 9);
    expect(idle.boat.swayMps).toBe(0);
    const pushed = run(act(harbourStart({}), { type: 'thruster', which: 'bow', dir: 1 }), 5);
    expect(pushed.boat.headingDeg).toBeGreaterThan(5);
  });
});

describe('Harbour mode and the link (test 4)', () => {
  it('m=harbour round-trips and keeps the ropes mode', () => {
    const state = parseUrlState('?m=harbour&mode=realistic');
    expect(state.appMode).toBe('harbour');
    expect(state.settings.ropesMode).toBe('realistic');
    expect(serializeUrlState(state)).toContain('m=harbour');
    expect(parseUrlState(serializeUrlState(state)).appMode).toBe('harbour');
  });

  it('m=harbour wins over learn=, which is dropped', () => {
    const state = parseUrlState('?m=harbour&learn=part_boom');
    expect(state.appMode).toBe('harbour');
    expect(state.learn).toBeNull();
    expect(serializeUrlState(state)).not.toContain('learn=');
  });

  it('a link without m is unchanged: no m key, no thrusters in any link', () => {
    const state = parseUrlState('?wd=60&ws=12');
    expect(state.appMode).toBe('easy');
    const link = serializeUrlState(state);
    expect(link).not.toMatch(/[?&]m=/);
    const on = reduce(state, { type: 'thruster', which: 'bow', dir: 1 });
    expect(serializeUrlState(on)).toBe(link);
  });

  it('choosing Harbour keeps the ropes mode; changing the ropes mode keeps Harbour', () => {
    const real = reduce(initialState(), { type: 'setAppMode', mode: 'realistic' });
    const harbour = reduce(real, { type: 'setAppMode', mode: 'harbour' });
    expect(harbour.appMode).toBe('harbour');
    expect(harbour.settings.ropesMode).toBe('realistic');
    const back = reduce(harbour, { type: 'setRopesMode', mode: 'easy' });
    expect(back.appMode).toBe('harbour');
    expect(back.settings.ropesMode).toBe('easy');
    expect(reduce(harbour, { type: 'setAppMode', mode: 'easy' }).appMode).toBe('easy');
  });
});

/** A lighter boat with only the bow thruster (PHASE8_SPEC 3.5, 15.7). */
function lightBowOnly(): BoatData {
  const clone = structuredClone(HANSE_508);
  clone.dimensions.massesKg.lightCraftStandardKeel *= 0.6;
  clone.dimensions.displacementTonnes *= 0.6;
  clone.hull.thrusters = clone.hull.thrusters.filter((thruster) => thruster.end === 'bow');
  return clone;
}

describe('hasThruster (M57 test 11)', () => {
  it('both ends on the Hanse 508; only the bow on the light boat', () => {
    expect(hasThruster('bow')).toBe(true);
    expect(hasThruster('stern')).toBe(true);
    const clone = lightBowOnly();
    expect(hasThruster('bow', clone)).toBe(true);
    expect(hasThruster('stern', clone)).toBe(false);
  });

  it('a missing thruster adds no force and does not throw', () => {
    const clone = lightBowOnly();
    const both = thrusterForces({ bow: 1, stern: 1 }, still(), clone);
    expect(both).toEqual(thrusterForces({ bow: 1, stern: 0 }, still(), clone));
    expect(both.sideN).toBeCloseTo(1300, 6);
    const hook = harbourForces(
      {
        thrusters: { bow: 1, stern: 1 },
        obstacles: [],
        fenders: { out: false, lost: [] },
      },
      clone,
    );
    expect(() => hook(still())).not.toThrow();
    const none = lightBowOnly();
    none.hull.thrusters = [];
    expect(thrusterForces({ bow: 1, stern: 1 }, still(), none)).toEqual(
      thrusterForces(THRUSTERS_OFF, still(), none),
    );
  });
});

describe('another boat sails (M57 tests 9 and 10)', () => {
  it('9. a lighter boat with a bow thruster only sails sensibly, the Hanse 508 as before', () => {
    const reference = run(initialState(), 120, 30);
    expect(mpsToKn(reference.boat.speedMps)).toBeCloseTo(6.81, 1);
    expect(Math.abs(mpsToKn(reference.boat.speedMps) - 6.81)).toBeLessThan(0.01);
    try {
      useBoat('light-test', 'Light test', lightBowOnly());
      const light = run(initialState(), 120, 30);
      const speedKn = mpsToKn(light.boat.speedMps);
      expect(speedKn).toBeGreaterThan(6.6);
      expect(speedKn).toBeLessThan(7.2);
      expect(light.boat.heelDeg).toBeGreaterThan(-11.0);
      expect(light.boat.heelDeg).toBeLessThan(-8.6);
      for (const value of Object.values(light.boat)) {
        if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
      }
    } finally {
      useBoat('hanse508', 'Hanse 508', HANSE_508);
    }
    expect(mpsToKn(run(initialState(), 120, 30).boat.speedMps)).toBeCloseTo(
      mpsToKn(reference.boat.speedMps),
      9,
    );
  });

  it('10. a boat without a stern thruster ignores its joystick and still works the bow one', () => {
    try {
      useBoat('light-test', 'Light test', lightBowOnly());
      const start = harbourStart({});
      const stern = reduce(start, { type: 'thruster', which: 'stern', dir: 1 });
      expect(stern.thrusters.stern).toBe(0);
      const bow = reduce(start, { type: 'thruster', which: 'bow', dir: 1 });
      expect(bow.thrusters.bow).toBe(1);
      let after = bow;
      expect(() => {
        after = run(bow, 5, 30);
      }).not.toThrow();
      expect(after.boat.swayMps).not.toBe(0);
    } finally {
      useBoat('hanse508', 'Hanse 508', HANSE_508);
    }
  });
});
