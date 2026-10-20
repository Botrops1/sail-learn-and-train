import { describe, expect, it } from 'vitest';
import {
  ANCHOR_STOWED,
  chainForces,
  chainPull,
  chainWeightNPerM,
  holdingN,
  rollerPoint,
  scopeNeededM,
  stepAnchor,
  stepWindlass,
  type AnchorState,
  type SeabedEnv,
} from '../src/model/anchor';
import { boat as boatData } from '../src/model/boat';
import { pointToMap } from '../src/model/lowSpeed';
import type { BoatState } from '../src/model/motion';
import type { SeabedType } from '../src/model/seabed';
import { EMPTY_ALERTS, recordAlerts } from '../src/model/alerts';
import { reduce, type AppState } from '../src/app/store';
import { initialState } from './motionHelpers';

/** M46 (PHASE7_SPEC 12.8): the anchor and the windlass, in a flat 5 m environment. */

const flat = (seabed: SeabedType = 'sand'): SeabedEnv => ({
  depthAt: () => 5,
  seabedAt: () => seabed,
});

/** A boat at (0, 0) heading north with the roller at the origin of the tests' chain. */
function boatAt(eastM: number, northM: number): BoatState {
  return { ...initialState().boat, eastM, northM, headingDeg: 0, speedMps: 0, swayMps: 0 };
}

const roller = rollerPoint();
/** The map position of the roller for a boat at (0, 0), heading 0. */
const rollerMap = (b: BoatState) => pointToMap(b, roller.x, roller.z);

function press(state: AnchorState, motion: 'down' | 'up' | 'off'): AnchorState {
  return { ...state, windlass: motion, cutOut: false };
}

describe('chain physics', () => {
  it('chain weight in water is 18.77 N/m', () => {
    expect(chainWeightNPerM()).toBeCloseTo(18.77, 1);
  });

  it('the roller is where the chain leaves the top of the roller', () => {
    expect(roller.x).toBeCloseTo(6.92, 2);
    expect(roller.y).toBeCloseTo(1.8, 2);
    expect(roller.z).toBeCloseTo(0.2, 2);
  });

  it('chainPull matches the worked values (L 30, D 6)', () => {
    const near = (value: number, want: number) =>
      expect(Math.abs(value - want) / want).toBeLessThan(0.01);
    near(chainPull(30, 6, 27).pullN, 68);
    near(chainPull(30, 6, 29).pullN, 869);
    near(chainPull(30, 6, 29.5).pullN, 7484);
  });

  it('no pull while the chain lies on the bottom, and a chain shorter than the depth is lifted', () => {
    expect(chainPull(30, 6, 24).pullN).toBe(0);
    expect(chainPull(30, 6, 24).lifted).toBe(false);
    const short = chainPull(5, 6, 3);
    expect(short.pullN).toBe(0);
    expect(short.lifted).toBe(true);
  });

  it('a chain stretched past its lift point is lifted and pulls hard', () => {
    const taut = chainPull(30, 6, 35);
    expect(taut.lifted).toBe(true);
    expect(taut.pullN).toBeGreaterThan(5000);
  });
});

describe('holding', () => {
  const set: AnchorState = { ...ANCHOR_STOWED, phase: 'set', chainOutM: 34 };

  it('a set anchor on sand at scope 5 holds 40·g·25·0.9', () => {
    const want = 40 * 9.81 * 25 * 0.9;
    expect(Math.abs(holdingN(set, 6.8, false, 'sand') - want) / want).toBeLessThan(0.01);
  });

  it('an unset anchor holds 15 %, a lifted one 30 %', () => {
    const full = holdingN(set, 6.8, false, 'sand');
    expect(holdingN({ ...set, phase: 'bottom' }, 6.8, false, 'sand')).toBeCloseTo(full * 0.15, 3);
    expect(holdingN(set, 6.8, true, 'sand')).toBeCloseTo(full * 0.3, 3);
  });

  it('weed and rock hold less than sand and mud', () => {
    const at = (seabed: SeabedType) => holdingN(set, 6.8, false, seabed);
    expect(at('sand')).toBeGreaterThan(at('mud'));
    expect(at('mud')).toBeGreaterThan(at('weed'));
    expect(at('weed')).toBeGreaterThan(at('rock'));
  });
});

describe('the windlass', () => {
  const boat = boatAt(0, 0);
  const env = flat();

  it('letting out from stowed: 10 s gives 5 m, hanging; at 6.8 m it lands below the roller', () => {
    let state = press(ANCHOR_STOWED, 'down');
    for (let i = 0; i < 100; i += 1) state = stepWindlass(state, boat, env, 0.1);
    expect(state.chainOutM).toBeCloseTo(5, 6);
    expect(state.phase).toBe('hanging');
    for (let i = 0; i < 40; i += 1) state = stepWindlass(state, boat, env, 0.1);
    expect(state.phase).toBe('bottom');
    expect(state.eastM).toBeCloseTo(rollerMap(boat)[0], 6);
    expect(state.northM).toBeCloseTo(rollerMap(boat)[1], 6);
    expect(state.draggedM).toBe(0);
  });

  it('the chain stops at its full length', () => {
    let state = press({ ...ANCHOR_STOWED, phase: 'hanging', chainOutM: 69.9 }, 'down');
    state = stepWindlass(state, boat, env, 1);
    expect(state.chainOutM).toBe(70);
    expect(state.windlass).toBe('off');
  });

  it('under a pull of about 9,900 N the windlass cuts out; the next press clears it', () => {
    const [east, north] = rollerMap(boat);
    const state = press(
      { ...ANCHOR_STOWED, phase: 'set', chainOutM: 30, eastM: east, northM: north + 29.4 },
      'up',
    );
    const cut = stepWindlass(state, boat, env, 0.1);
    expect(cut.cutOut).toBe(true);
    expect(cut.windlass).toBe('off');
    expect(cut.chainOutM).toBe(30);
    expect(press(cut, 'down').cutOut).toBe(false);
  });

  it('bringing the chain in: the anchor breaks out at 7.3 m, then it is stowed at 0', () => {
    const [east, north] = rollerMap(boat);
    let state = press(
      { ...ANCHOR_STOWED, phase: 'bottom', chainOutM: 10, eastM: east, northM: north },
      'up',
    );
    let seconds = 0;
    while (state.phase === 'bottom') {
      state = stepWindlass(state, boat, env, 0.1);
      seconds += 0.1;
    }
    expect(state.phase).toBe('hanging');
    expect(state.chainOutM).toBeLessThanOrEqual(7.3 + 1e-9);
    expect(seconds).toBeCloseTo(7, 0);
    while (state.phase !== 'stowed') {
      state = stepWindlass(state, boat, env, 0.1);
      seconds += 0.1;
    }
    expect(state.chainOutM).toBe(0);
    expect(seconds).toBeCloseTo(25, 0);
  });

  it('a hanging anchor over shallower water than the chain lands by itself', () => {
    const deep = { depthAt: () => 12, seabedAt: () => 'sand' as const };
    const shallow = flat();
    const hanging: AnchorState = { ...ANCHOR_STOWED, phase: 'hanging', chainOutM: 10 };
    expect(stepWindlass(hanging, boat, deep, 0.1)).toBe(hanging);
    expect(stepWindlass(hanging, boat, shallow, 0.1).phase).toBe('bottom');
  });

  it('with nothing to do the state is the same object', () => {
    expect(stepWindlass(ANCHOR_STOWED, boat, env, 0.1)).toBe(ANCHOR_STOWED);
  });
});

describe('chain forces', () => {
  const boat = boatAt(0, 0);

  it('none while the anchor hangs or the chain lies slack', () => {
    const [east, north] = rollerMap(boat);
    const hanging: AnchorState = { ...ANCHOR_STOWED, phase: 'hanging', chainOutM: 20 };
    expect(chainForces(hanging, boat, flat()).surgeN).toBe(0);
    const slack: AnchorState = {
      ...ANCHOR_STOWED,
      phase: 'set',
      chainOutM: 40,
      eastM: east,
      northM: north + 10,
    };
    expect(chainForces(slack, boat, flat()).surgeN).toBe(0);
  });

  it('a taut chain pulls the bow towards the anchor and, off to one side, turns her', () => {
    const [east, north] = rollerMap(boat);
    const ahead: AnchorState = {
      ...ANCHOR_STOWED,
      phase: 'set',
      chainOutM: 30,
      eastM: east,
      northM: north + 29,
    };
    const f = chainForces(ahead, boat, flat());
    expect(f.surgeN).toBeGreaterThan(500);
    expect(Math.abs(f.sideN)).toBeLessThan(1e-6);
    const beside = chainForces({ ...ahead, eastM: east + 8, northM: north + 28 }, boat, flat());
    expect(beside.sideN).toBeGreaterThan(0);
    expect(beside.momentNm).not.toBe(0);
  });

  it('an anchor in water of no depth pulls nothing and does not move', () => {
    const land: SeabedEnv = { depthAt: () => 0, seabedAt: () => 'rock' };
    const [east, north] = rollerMap(boat);
    const state: AnchorState = {
      ...ANCHOR_STOWED,
      phase: 'set',
      chainOutM: 30,
      eastM: east,
      northM: north + 29,
    };
    expect(chainForces(state, boat, land).surgeN).toBe(0);
    expect(stepAnchor(state, boat, land, 1)).toBe(state);
  });
});

describe('dragging and setting', () => {
  const boat = boatAt(0, 0);
  const [east, north] = rollerMap(boat);

  /** The boat keeps the chain at the same stretch while the anchor drags (the wind keeps blowing her back). */
  function drag(seabed: SeabedType, seconds: number, stretchM: number): AnchorState {
    let state: AnchorState = {
      ...ANCHOR_STOWED,
      phase: 'bottom',
      chainOutM: 30,
      eastM: east,
      northM: north + stretchM,
    };
    for (let i = 0; i < seconds * 10; i += 1) {
      state = stepAnchor(state, boatAt(0, state.northM - stretchM - roller.x), flat(seabed), 0.1);
    }
    return state;
  }

  it('an anchor that holds stays where it is', () => {
    const state: AnchorState = {
      ...ANCHOR_STOWED,
      phase: 'set',
      chainOutM: 34,
      eastM: east,
      northM: north + 27.3,
    };
    expect(stepAnchor(state, boat, flat(), 0.1)).toBe(state);
  });

  it('a pull stronger than the holding drags it, and on sand it sets after a metre', () => {
    const state = drag('sand', 5, 29.2);
    expect(state.phase).toBe('set');
    expect(state.draggedM).toBeGreaterThanOrEqual(1);
    expect(state.dragging).toBe(true);
  });

  it('on rock it never sets, and a long drag sounds the alarm', () => {
    const early = drag('rock', 4, 29.2);
    expect(early.phase).toBe('bottom');
    expect(early.alarm).toBe(false);
    const late = drag('rock', 20, 29.2);
    expect(late.phase).toBe('bottom');
    expect(late.draggedM).toBeGreaterThanOrEqual(5);
    expect(late.alarm).toBe(true);
  });
});

describe('PT-31 scope', () => {
  it('scopeNeededM: 4 × the effective depth, more in strong wind, at least 3 boat lengths', () => {
    expect(scopeNeededM(5, 10)).toBeCloseTo(3 * boatData.dimensions.loa, 2);
    expect(scopeNeededM(15, 10)).toBeCloseTo(67.2, 1);
    expect(scopeNeededM(5, 25)).toBeCloseTo(58.3, 1);
  });
});

describe('the anchor in the store', () => {
  const bay = () => reduce(initialState(), { type: 'goToPlace', place: 'bay' }) as AppState;
  const hold = (state: AppState, motion: 'down' | 'up' | 'off') =>
    reduce(state, { type: 'windlass', motion });
  const run = (state: AppState, seconds: number) => {
    let s = state;
    for (let i = 0; i < seconds * 10; i += 1) s = reduce(s, { type: 'step', dt: 0.1 });
    return s;
  };

  it('starts stowed, and a place or Reset puts it back', () => {
    expect(initialState().anchor).toBe(ANCHOR_STOWED);
    const down = run(hold(bay(), 'down'), 3);
    expect(down.anchor.phase).toBe('hanging');
    expect(reduce(down, { type: 'goToPlace', place: 'bay' }).anchor).toBe(ANCHOR_STOWED);
    expect(reduce(down, { type: 'reset' }).anchor).toBe(ANCHOR_STOWED);
  });

  it('holding Chain out lets the chain out, letting go stops it', () => {
    let state = run(hold(bay(), 'down'), 4);
    expect(state.anchor.chainOutM).toBeGreaterThan(1.9);
    state = hold(state, 'off');
    const stopped = state.anchor.chainOutM;
    expect(run(state, 3).anchor.chainOutM).toBe(stopped);
  });

  it('the windlass works in Held still too; the anchor does not drag there', () => {
    let state = reduce(bay(), { type: 'setBoatMode', mode: 'held' });
    state = run(hold(state, 'down'), 2);
    expect(state.anchor.chainOutM).toBeGreaterThan(0.9);
  });

  it('a press clears the alarm and the cut-out notice, a release does not; the alarm can be silenced', () => {
    const base = bay();
    const alarm: AppState = {
      ...base,
      anchor: { ...ANCHOR_STOWED, phase: 'set', chainOutM: 20, alarm: true, cutOut: true },
    };
    expect(hold(alarm, 'off').anchor).toMatchObject({ alarm: true, cutOut: true });
    expect(hold(alarm, 'down').anchor).toMatchObject({ alarm: false, cutOut: false });
    const silenced = reduce(alarm, { type: 'silenceAnchorAlarm' });
    expect(silenced.anchor.alarm).toBe(false);
    expect(reduce(silenced, { type: 'silenceAnchorAlarm' })).toBe(silenced);
  });

  it('the alarm is written to the alert history once, when it starts', () => {
    const quiet = bay();
    const loud: AppState = { ...quiet, anchor: { ...quiet.anchor, alarm: true } };
    const log = recordAlerts(EMPTY_ALERTS, quiet, loud);
    expect(log.entries.map((e) => e.kind)).toEqual(['anchorAlarm']);
    expect(log.entries[0]?.severity).toBe('danger');
    expect(recordAlerts(log, loud, loud)).toBe(log);
  });
});
