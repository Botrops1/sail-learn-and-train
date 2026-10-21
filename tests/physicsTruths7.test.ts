import { describe, expect, it } from 'vitest';
import { boat as boatData } from '../src/model/boat';
import { mpsToKn, wrap180 } from '../src/model/angles';
import type { AppState } from '../src/app/store';
import {
  contactForces,
  contactSeverity,
  hullContactPoints,
  type Obstacle,
} from '../src/model/contact';
import { DEFAULT_HARBOUR } from '../src/model/harbour';
import type { ContactHit } from '../src/model/lowSpeed';
import { pointToMap } from '../src/model/lowSpeed';
import { stepBoat, type BoatState } from '../src/model/motion';
import { depthAt, type SeabedType } from '../src/model/seabed';
import { lineForces, NO_LINES } from '../src/model/mooringLines';
import {
  ANCHOR_STOWED,
  chainForces,
  scopeNeededM,
  stepAnchor,
  type AnchorState,
  type SeabedEnv,
} from '../src/model/anchor';
import { engineThrustN, initialEngine, stepEngine } from '../src/model/engine';
import { initialWindMode, windAt } from '../src/model/windModes';
import { reduce } from '../src/app/store';
import { act, berthLines, harbourStart, initialState, run } from './motionHelpers';

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
    expect(wrap180(mirror.boat.headingDeg)).toBeCloseTo(-heading, 2);
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
      expect(wrap180(astern(-50, 15).boat.headingDeg)).toBeCloseTo(-normal, 2);
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
    expect(wrap180(kick(-35).boat.headingDeg)).toBeCloseTo(-wrap180(s.boat.headingDeg), 2);
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

describe('PT-33 thrusters', () => {
  const thrust = (bow: -1 | 0 | 1, stern: -1 | 0 | 1, s: AppState = harbourStart({})): AppState =>
    act(
      s,
      { type: 'thruster', which: 'bow', dir: bow },
      { type: 'thruster', which: 'stern', dir: stern },
    );

  it('PT-33 at rest the bow thruster turns her, the stern thruster the other way, together they spin her', () => {
    const bow = run(thrust(1, 0), 10);
    expect(wrap180(bow.boat.headingDeg)).toBeGreaterThan(28);
    expect(wrap180(bow.boat.headingDeg)).toBeLessThan(44);
    expect(bow.boat.swayMps).toBeGreaterThan(0);
    const stern = run(thrust(0, 1), 10);
    expect(wrap180(stern.boat.headingDeg)).toBeGreaterThan(-36);
    expect(wrap180(stern.boat.headingDeg)).toBeLessThan(-22);
    const spin = run(thrust(1, -1), 10);
    expect(wrap180(spin.boat.headingDeg)).toBeGreaterThan(44);
    expect(wrap180(spin.boat.headingDeg)).toBeLessThan(64);
  });

  it('PT-33 both the same way slide her sideways with little turn', () => {
    const slide = run(thrust(1, 1), 10);
    expect(Math.abs(wrap180(slide.boat.headingDeg))).toBeLessThan(16);
    expect(slide.boat.swayMps).toBeGreaterThan(0.35);
    expect(slide.boat.swayMps).toBeLessThan(0.55);
  });

  it('PT-33 at speed the bow thruster has little effect', () => {
    const start = () => harbourStart({ speedKn: 4, engine: { running: true, leverPct: 40 } });
    const rest = wrap180(run(thrust(1, 0), 10).boat.headingDeg);
    const withThruster = wrap180(run(thrust(1, 0, start()), 10).boat.headingDeg);
    const without = wrap180(run(start(), 10).boat.headingDeg);
    expect(Math.abs(withThruster - without)).toBeLessThan(0.2 * rest);
    expect(Math.abs(withThruster - without)).toBeGreaterThan(0);
  });

  it('PT-33 in 10 knots of wind from the west both thrusters win, in 25 knots the wind wins', () => {
    const west = (tws: number) =>
      run(thrust(-1, -1, harbourStart({ windDirDeg: -90, twsKn: tws })), 30);
    expect(west(10).boat.eastM).toBeLessThan(0);
    expect(west(25).boat.eastM).toBeGreaterThan(0);
  });
});

/** The west face of the wall in the PT-50 tests, metres east. */
const WALL_WEST_M = 2.875;

describe('PT-50 fenders take a slow contact', () => {
  const wall: Obstacle = {
    id: 'wall',
    partId: 'env_quay',
    polygon: [
      [2.875, -20],
      [10, -20],
      [10, 20],
      [2.875, 20],
    ],
  };

  /** Pushes the boat into the wall at `swayMps` (4 s at 60 fps) and returns the first hit and the deepest point. */
  function bump(swayMps: number, out: boolean) {
    const state = harbourStart({});
    let boat: BoatState = {
      ...state.boat,
      eastM: 0,
      northM: 0,
      headingDeg: 0,
      swayMps,
    };
    const fenders = { out, lost: [] as number[] };
    const inputs = {
      windDirDeg: 0,
      twsKn: 0,
      rudderDeg: 0,
      rig: state.rig,
      controls: state.controls,
      engineThrustN: 0,
      external: (b: BoatState) => contactForces(b, [wall], fenders),
    };
    let first: ContactHit[] | null = null;
    let deepest = 0;
    for (let i = 0; i < 240; i += 1) {
      const moved = stepBoat(boat, inputs, 1 / 60);
      boat = moved.boat;
      if (moved.report.contacts.length > 0) first ??= moved.report.contacts;
      // How far into the wall the hull goes: the deepest of its starboard points.
      for (const p of hullContactPoints()) {
        const [east] = pointToMap(boat, p.x, p.z + (out && p.z > 0 ? 0.24 : 0));
        deepest = Math.max(deepest, east - WALL_WEST_M);
      }
    }
    return { first, deepest };
  }

  it('PT-50 a gentle bump with fenders in is a bump, and the hull goes in only a little', () => {
    const { first, deepest } = bump(0.3, false);
    const approach = Math.max(...(first ?? []).map((h) => h.approachMps));
    expect(approach).toBeGreaterThan(0.22);
    expect(approach).toBeLessThan(0.28);
    expect(contactSeverity(approach, false)).toBe('bump');
    expect(deepest).toBeLessThan(0.03);
  });

  it('PT-50 fenders out take the same bump: no hull contact, "the fender took it"', () => {
    const { first } = bump(0.3, true);
    expect(first?.every((h) => h.fender)).toBe(true);
    const approach = Math.max(...(first ?? []).map((h) => h.approachMps));
    expect(approach).toBeGreaterThan(0.24);
    expect(approach).toBeLessThan(0.3);
    expect(contactSeverity(approach, true)).toBe('fender');
  });

  it('PT-50 at 1.0 m/s (about 2 knots) even the fenders do not help: a hard hit', () => {
    const { first } = bump(1.0, true);
    const approach = Math.max(...(first ?? []).map((h) => h.approachMps));
    expect(approach).toBeGreaterThan(0.85);
    expect(approach).toBeLessThan(0.97);
    expect(contactSeverity(approach, true)).toBe('hit');
  });
});

describe('PT-34 fenders come in before sailing', () => {
  const motoring = (fd: boolean) =>
    initialState({
      engine: { running: true, leverPct: 66 },
      harbour: { ...DEFAULT_HARBOUR, fendersOut: fd },
      controls: { ctl_wind_speed: 0 },
    });

  it('PT-34 fenders left out at speed are torn off, the first after 30 s, then every 20 s', () => {
    const lost = (seconds: number) => run(motoring(true), seconds).harbour.fendersLost.length;
    expect(lost(29)).toBe(0);
    expect(lost(31)).toBe(1);
    expect(lost(71)).toBe(3);
  });

  it('PT-34 fenders in the locker stay', () => {
    expect(run(motoring(false), 71).harbour.fendersLost).toHaveLength(0);
  });
});

/** The boat in our berth (PHASE7_SPEC 10.7): the marina, medium layout, no other yachts, at rest. */
function inBerth(engine = initialEngine({ running: false, leverPct: 0 })): AppState {
  const state = reduce(harbourStart({}), { type: 'goToPlace', place: 'marina' });
  return {
    ...state,
    harbour: { ...state.harbour, traffic: 'empty' },
    engine,
    boat: { ...state.boat, eastM: 2.75, northM: 1490.4, headingDeg: 180, speedMps: 0, swayMps: 0 },
  };
}

describe('PT-51 stern-to, the bow must be held', () => {
  /** 120 s at 60 fps with only the lines pulling; the wind from the east. */
  function lie(twsKn: number, lazy: 'handTight' | null) {
    const state = inBerth();
    const lines = berthLines(state, { sternSlackM: 0.3, lazy });
    const transom = () => pointToMap(boat, boatData.hull.transomX, 0);
    let boat: BoatState = state.boat;
    const start = transom();
    const inputs = {
      windDirDeg: 90,
      twsKn,
      rudderDeg: 0,
      rig: state.rig,
      controls: state.controls,
      engineThrustN: 0,
      external: (b: BoatState) => lineForces(lines, b),
    };
    let swing = 0;
    for (let i = 0; i < 120 * 60; i += 1) {
      boat = stepBoat(boat, inputs, 1 / 60).boat;
      swing = Math.max(swing, Math.abs(wrap180(boat.headingDeg - 180)));
    }
    const end = transom();
    return { swing, driftM: Math.hypot(end[0] - start[0], end[1] - start[1]) };
  }

  it('PT-51 a lazy line holds the bow: 15 kn swings her up to 12°, 25 kn up to 15°, and the transom stays within 1 m', () => {
    const light = lie(15, 'handTight');
    expect(light.swing).toBeLessThanOrEqual(12);
    expect(light.driftM).toBeLessThan(1.0);
    const strong = lie(25, 'handTight');
    expect(strong.swing).toBeLessThanOrEqual(15);
    expect(strong.driftM).toBeLessThan(1.0);
  });

  it('PT-51 without the lazy line the bow swings more than 35° at 15 kn', () => {
    expect(lie(15, null).swing).toBeGreaterThan(35);
  });
});

describe('PT-52 a slack line near the propeller fouls it', () => {
  const slack = (leverPct: number) => {
    const state = inBerth(initialEngine({ running: true, leverPct }));
    return {
      ...state,
      lines: { ...NO_LINES, lines: berthLines(state, { sternSlackM: 2.0, lazy: null }) },
    };
  };

  it('PT-52 with the lever astern the engine is stopped and fouled after 3 s', () => {
    const after = run(slack(-30), 3);
    expect(after.lines.fouled).toBe(true);
    expect(after.engine.running).toBe(false);
  });

  it('PT-52 with the lever in neutral nothing is caught, even after 10 s', () => {
    const after = run(slack(0), 10);
    expect(after.lines.fouled).toBe(false);
    expect(after.engine.running).toBe(true);
  });
});

describe('PT-53 the keel touches where the water is shallower than the draft', () => {
  /** The bay, heading 270 (west, towards the shore), the keel 1 m east of the line where the depth is 2.4 m. */
  function inBay(speedKn: number): AppState {
    const state = reduce(harbourStart({}), { type: 'goToPlace', place: 'bay' });
    return {
      ...state,
      boat: {
        ...state.boat,
        eastM: -1676.4,
        northM: 0,
        headingDeg: 270,
        speedMps: speedKn * 0.514444,
        swayMps: 0,
      },
    };
  }

  /** 45 s at 60 fps; at 15 s the lever goes full astern. */
  function touch(speedKn: number) {
    let state = inBay(speedKn);
    const draft = boatData.dimensions.draft;
    const keelDepth = (s: AppState) => {
      const [east, north] = pointToMap(s.boat, boatData.physics.ground.keelX, 0);
      return depthAt(east, north);
    };
    let tooDeep = 0;
    let impact: { part: string; impactMps: number; severity: string } | undefined;
    let astern = state.boat.eastM;
    for (let i = 0; i < 45 * 60; i += 1) {
      if (i === 15 * 60) {
        state = reduce(state, { type: 'engine', command: { leverPct: -100 } });
        astern = state.boat.eastM;
      }
      state = reduce(state, { type: 'step', dt: 1 / 60 });
      tooDeep = Math.max(tooDeep, draft - keelDepth(state));
      const first = state.contact.reports.at(-1);
      if (first && !impact && first.obstacleId === 'bottom') {
        impact = { part: first.part, impactMps: first.impactMps, severity: first.severity };
      }
    }
    return {
      tooDeep,
      impact,
      backM: state.boat.eastM - astern,
      offBy: keelDepth(state) - draft,
    };
  }

  it('PT-53 touching at 1 kn: the keel goes a little too deep, the report names the keel, full astern gets her off', () => {
    const gentle = touch(1);
    expect(gentle.tooDeep).toBeGreaterThanOrEqual(0.07);
    expect(gentle.tooDeep).toBeLessThanOrEqual(0.14);
    expect(gentle.impact?.part).toBe('keel');
    expect(gentle.impact?.impactMps).toBeGreaterThanOrEqual(0.4);
    expect(gentle.impact?.impactMps).toBeLessThanOrEqual(0.53);
    expect(gentle.impact?.severity).toBe('knock');
    expect(gentle.offBy).toBeGreaterThanOrEqual(0);
    expect(gentle.backM).toBeGreaterThan(20);
  });

  it('PT-53 touching at 3 kn: deeper in, severity hit, still aground after 45 s', () => {
    const fast = touch(3);
    expect(fast.tooDeep).toBeGreaterThanOrEqual(0.25);
    expect(fast.tooDeep).toBeLessThanOrEqual(0.37);
    expect(fast.impact?.severity).toBe('hit');
    expect(fast.offBy).toBeLessThan(0);
    expect(fast.backM).toBeLessThan(3);
  });
});

describe('the anchor (PT-31, PT-54 … PT-57)', () => {
  const flat = (seabed: SeabedType): SeabedEnv => ({ depthAt: () => 5, seabedAt: () => seabed });

  /**
   * 300 s at 60 fps: the boat at (0, 0) heading 10, sails away, the engine running in neutral
   * (or the lever as `lever` says between 30 s and 50 s), the wind from the north, the anchor
   * on the bottom 0.8·L ahead of her; only the chain pulls (PHASE7_SPEC 12.8).
   */
  function lie(o: {
    seabed: SeabedType;
    chainM: number;
    twsKn: number;
    gusty?: boolean;
    lever?: number;
  }) {
    const state = harbourStart({ headingDeg: 10, engine: { running: true, leverPct: 0 } });
    const env = flat(o.seabed);
    const windMode = initialWindMode(o.gusty ? { mode: 'gusty', seed: 1 } : {});
    let boat: BoatState = { ...state.boat, eastM: 0, northM: 0, headingDeg: 10 };
    let anchor: AnchorState = {
      ...ANCHOR_STOWED,
      phase: 'bottom',
      chainOutM: o.chainM,
      eastM: 0,
      northM: 0.8 * o.chainM,
    };
    let engine = initialEngine({ running: true, leverPct: 0 });
    let timeS = 0;
    let setAtS: number | null = null;
    let swing = 0;
    for (let i = 0; i < 300 * 60; i += 1) {
      const dt = 1 / 60;
      if (o.lever !== undefined) {
        engine = { ...engine, leverPct: timeS >= 30 && timeS < 50 ? o.lever : 0 };
      }
      engine = stepEngine(engine, dt);
      const wind = windAt(0, o.twsKn, windMode, timeS);
      const anchored = anchor;
      boat = stepBoat(
        boat,
        {
          windDirDeg: wind.dirDeg,
          twsKn: wind.twsKn,
          rudderDeg: 0,
          rig: state.rig,
          controls: state.controls,
          engineThrustN: engineThrustN(engine),
          external: (b: BoatState) => chainForces(anchored, b, env),
        },
        dt,
      ).boat;
      anchor = stepAnchor(anchor, boat, env, dt);
      timeS += dt;
      if (setAtS === null && anchor.phase === 'set') setAtS = timeS;
      swing = wrap180(boat.headingDeg - 0);
    }
    return { anchor, headingErrDeg: Math.abs(swing), setAtS };
  }

  it('PT-54 a short scope on weed in 25 knots of gusts drags, with the alarm', () => {
    const short = lie({ seabed: 'weed', chainM: 20, twsKn: 25, gusty: true });
    expect(short.anchor.draggedM).toBeGreaterThanOrEqual(10);
    expect(short.anchor.draggedM).toBeLessThanOrEqual(30);
    expect(short.anchor.alarm).toBe(true);
  });

  it('PT-54 more chain holds: 47 m (scope 6.9) drags less than 3 m, 34 m (scope 5.0) 1.5 to 5 m', () => {
    expect(
      lie({ seabed: 'weed', chainM: 47, twsKn: 25, gusty: true }).anchor.draggedM,
    ).toBeLessThan(3);
    const middle = lie({ seabed: 'weed', chainM: 34, twsKn: 25, gusty: true }).anchor.draggedM;
    expect(middle).toBeGreaterThanOrEqual(1.5);
    expect(middle).toBeLessThanOrEqual(5);
  });

  it('PT-55 the bottom matters: sand holds the short chain, rock drags and never sets', () => {
    expect(
      lie({ seabed: 'sand', chainM: 20, twsKn: 25, gusty: true }).anchor.draggedM,
    ).toBeLessThan(2);
    const rock = lie({ seabed: 'rock', chainM: 34, twsKn: 15, lever: -60 });
    expect(rock.anchor.phase).toBe('bottom');
    expect(rock.anchor.draggedM).toBeGreaterThanOrEqual(4);
    expect(rock.anchor.draggedM).toBeLessThanOrEqual(12);
  });

  it('PT-56 an anchored boat swings to the wind: after 300 s her bow is within 35° of it', () => {
    const swung = lie({ seabed: 'sand', chainM: 34, twsKn: 15 });
    expect(swung.headingErrDeg).toBeLessThanOrEqual(35);
  });

  it('PT-57 the anchor has to be set: without the engine it stays unset, a third astern for 20 s sets it', () => {
    expect(lie({ seabed: 'sand', chainM: 34, twsKn: 15 }).anchor.phase).toBe('bottom');
    const backed = lie({ seabed: 'sand', chainM: 34, twsKn: 15, lever: -40 });
    expect(backed.anchor.phase).toBe('set');
    expect(backed.setAtS).not.toBeNull();
    expect(backed.setAtS as number).toBeLessThanOrEqual(120);
    expect(backed.anchor.draggedM).toBeGreaterThanOrEqual(1);
    expect(backed.anchor.draggedM).toBeLessThanOrEqual(2);
  });

  it('PT-31 the rules ask for 4 × the depth with the roller (more in a strong wind), and not less than 3 boat lengths', () => {
    expect(scopeNeededM(5, 10)).toBeCloseTo(46.65, 2);
    expect(scopeNeededM(15, 10)).toBeCloseTo(67.2, 1);
    expect(scopeNeededM(5, 25)).toBeCloseTo(58.3, 1);
  });
});
