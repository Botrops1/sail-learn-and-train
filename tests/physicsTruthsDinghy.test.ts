import { afterEach, describe, expect, it } from 'vitest';
import { mpsToKn } from '../src/model/angles';
import { DINGHY, HANSE_508, useBoat } from '../src/model/boat';
import { defaultControls, type Controls } from '../src/model/controls';
import { steadyState, type SteadyState } from '../src/model/motion';
import {
  crewMomentNm,
  initialDinghy,
  nextSailorSide,
  type DinghyState,
  type Sit,
} from '../src/model/dinghy';
import { initialState, reduce, type AppState } from '../src/app/store';
import { crewOutShare } from '../src/model/dinghy';
import { parseUrlState, serializeUrlState } from '../src/app/urlState';
import { MODE_LAYOUTS, sectionAvailable } from '../src/ui/modes';
import { completeLayout } from '../src/ui/sectionLayout';
import type { BoatState } from '../src/model/motion';

/**
 * PHASE_DINGHY_SPEC 8.4 and 8.7: the dinghy's sailing rules (PT-76 … PT-80, the default wind) and
 * that the Hanse is untouched. Each test puts the dinghy in place and the Hanse back after.
 */
afterEach(() => {
  useBoat(HANSE_508.meta.id, HANSE_508.meta.name, HANSE_508);
});

function useDinghy(): void {
  useBoat(DINGHY.id, DINGHY.name, DINGHY.data);
}

interface Case {
  wd: number;
  ws: number;
  sheet: number;
  sit?: Sit;
  board?: number;
  outhaul?: number;
}

/** The steady state of the dinghy heading 0 (so `twa` = wind direction), the wind over starboard. */
function steady(c: Case): SteadyState {
  const controls: Controls = {
    ...defaultControls(DINGHY.data),
    ctl_wind_dir: c.wd,
    ctl_wind_speed: c.ws,
    ctl_mainsheet: c.sheet,
  };
  return steadyState(controls, 0, DINGHY.data, {
    heel: true,
    dinghy: { sit: c.sit ?? 'in', boardPct: c.board ?? 100, outhaulPct: c.outhaul ?? 100 },
  });
}

const kn = (s: SteadyState) => mpsToKn(s.speedMps, DINGHY.data);

describe('PT-76 Leaning out keeps a dinghy flatter', () => {
  it('16 kn abeam, sheet 55: sit in capsizes to leeward; on the side about -8; leaning out about +5', () => {
    useDinghy();
    const base = { wd: 90, ws: 16, sheet: 55 };
    expect(steady({ ...base, sit: 'in' }).capsize).toBe('leeward');
    const side = steady({ ...base, sit: 'side' });
    expect(side.capsize).toBe('none');
    expect(side.heelDeg).toBeGreaterThan(-11);
    expect(side.heelDeg).toBeLessThan(-5);
    expect(kn(side)).toBeGreaterThan(6.3);
    expect(kn(side)).toBeLessThan(8.3);
    const out = steady({ ...base, sit: 'out' });
    expect(out.heelDeg).toBeGreaterThan(2);
    expect(out.heelDeg).toBeLessThan(8);
  });
});

describe('PT-77 In light wind, sit in', () => {
  it('3 kn abeam, sheet 50: sit in about +3.5; on the side or leaning out she goes over to windward', () => {
    useDinghy();
    const base = { wd: 90, ws: 3, sheet: 50 };
    const inn = steady({ ...base, sit: 'in' });
    expect(inn.capsize).toBe('none');
    expect(inn.heelDeg).toBeGreaterThan(1.5);
    expect(inn.heelDeg).toBeLessThan(5.5);
    expect(steady({ ...base, sit: 'side' }).capsize).toBe('windward');
    expect(steady({ ...base, sit: 'out' }).capsize).toBe('windward');
  });
});

describe('PT-78 Let the mainsheet go to come upright and slow down', () => {
  it('14 kn at 60°, sit in: sheet 30 capsizes, 60 is upright, 100 stops her', () => {
    useDinghy();
    const base = { wd: 60, ws: 14, sit: 'in' as const };
    expect(steady({ ...base, sheet: 30 }).capsize).toBe('leeward');
    const mid = steady({ ...base, sheet: 60 });
    expect(mid.capsize).toBe('none');
    expect(mid.heelDeg).toBeGreaterThan(-3);
    expect(mid.heelDeg).toBeLessThan(2);
    const loose = steady({ ...base, sheet: 100 });
    expect(loose.heelDeg).toBeGreaterThan(0);
    expect(loose.heelDeg).toBeLessThan(4);
    expect(kn(loose)).toBeLessThanOrEqual(0.5);
  });
});

describe('PT-79 Centreboard down to sail towards the wind, up with the wind behind', () => {
  it('10 kn at 45°, sheet 20, sit on the side: leeway 2.6° with the board down, 5° half up, 28° up', () => {
    useDinghy();
    const base = { wd: 45, ws: 10, sheet: 20, sit: 'side' as const };
    const down = steady({ ...base, board: 100 }).leewayDeg;
    const half = steady({ ...base, board: 50 }).leewayDeg;
    const up = steady({ ...base, board: 0 }).leewayDeg;
    expect(down).toBeGreaterThan(1.4);
    expect(down).toBeLessThan(3.8);
    expect(half).toBeGreaterThan(3.5);
    expect(half).toBeLessThan(6.5);
    expect(up).toBeGreaterThan(20);
    expect(up).toBeLessThan(36);
  });

  it('10 kn from 160°, sheet 90, sit in: board 0 is strictly faster than board 100', () => {
    useDinghy();
    const base = { wd: 160, ws: 10, sheet: 90, sit: 'in' as const };
    expect(kn(steady({ ...base, board: 0 }))).toBeGreaterThan(kn(steady({ ...base, board: 100 })));
  });
});

describe('dinghy default wind', () => {
  it('8 kn, sit in, the fastest sheet at every angle: no capsize, heel -16…+6', () => {
    useDinghy();
    for (const wd of [45, 60, 90, 120, 150, 170]) {
      let best: SteadyState | null = null;
      for (let sheet = 0; sheet <= 100; sheet += 5) {
        const s = steady({ wd, ws: 8, sheet, sit: 'in' });
        if (best === null || s.speedMps > best.speedMps) best = s;
      }
      expect(best?.capsize).toBe('none');
      expect(best?.heelDeg).toBeGreaterThan(-16);
      expect(best?.heelDeg).toBeLessThan(6);
      if (wd === 90) {
        expect(kn(best as SteadyState)).toBeGreaterThan(4.0);
        expect(kn(best as SteadyState)).toBeLessThan(5.1);
      }
    }
  });
});

describe('The Hanse is untouched', () => {
  it('steadyState at 12 kn, 60°, the M8 controls: the speed and heel as before M114 (to 1e-9), no capsize', () => {
    const controls: Controls = {
      ...defaultControls(),
      ctl_wind_dir: 60,
      ctl_wind_speed: 12,
    };
    const s = steadyState(controls, 0, undefined, { heel: true });
    // Values recorded from the code before M114.
    expect(Math.abs(s.speedMps - 3.508645707430156)).toBeLessThan(1e-9);
    expect(Math.abs(s.heelDeg - -10.4299294296695)).toBeLessThan(1e-9);
    expect(s.capsize).toBe('none');
    expect(s.leewayDeg).toBe(0);
  });
});

/** Runs the store for `seconds` in steps of 0.1 s, calling `each` after every step. */
function run(
  start: AppState,
  seconds: number,
  each?: (state: AppState, t: number) => boolean | undefined,
): AppState {
  let state = start;
  const steps = Math.round(seconds / 0.1);
  for (let i = 0; i < steps; i += 1) {
    state = reduce(state, { type: 'step', dt: 0.1 });
    if (each?.(state, (i + 1) * 0.1) === true) break;
  }
  return state;
}

function dinghyState(
  controls: Partial<Controls>,
  dinghy: Partial<DinghyState>,
  boat: Partial<BoatState> = {},
): AppState {
  useDinghy();
  return initialState({
    controls: { ...defaultControls(DINGHY.data), ...controls },
    dinghy: { ...initialDinghy(), ...dinghy },
    boat,
  });
}

describe('PT-77 In light wind, sit in (the boat in motion)', () => {
  it('0.5 kn, sit on the side, 20 s from upright: heel +40 or more and the windwardHeel alert', () => {
    const start = dinghyState(
      { ctl_wind_dir: 90, ctl_wind_speed: 0.5, ctl_mainsheet: 50 },
      { sit: 'side', outhaulPct: 100 },
      { headingDeg: 0, heelDeg: 0, speedMps: 0 },
    );
    expect(start.boat.heelDeg).toBe(0);
    const end = run(start, 20);
    expect(end.boat.heelDeg).toBeGreaterThanOrEqual(40);
    expect(end.alerts.entries.map((e) => e.kind)).toContain('windwardHeel');
    // It is not the "overpowered" warning: the heel is towards the sailor.
    expect(end.alerts.entries.map((e) => e.kind)).not.toContain('overpowered');
  });
});

describe('PT-79 Centreboard (the boat in motion)', () => {
  it('10 kn at 45°, sheet 20, sit on the side, 60 s from 2 m/s: board up slides at least 5 times as far', () => {
    const meanSlip = (boardPct: number): number => {
      const start = dinghyState(
        { ctl_wind_dir: 45, ctl_wind_speed: 10, ctl_mainsheet: 20 },
        { sit: 'side', outhaulPct: 100, boardPct },
        { headingDeg: 0, speedMps: 2 },
      );
      const angles: number[] = [];
      run(start, 60, (state, t) => {
        if (t > 50) angles.push(Math.atan2(state.boat.swayMps, state.boat.speedMps));
        return false;
      });
      return Math.abs(angles.reduce((a, b) => a + b, 0) / angles.length);
    };
    expect(meanSlip(0)).toBeGreaterThanOrEqual(5 * meanSlip(100));
  });
});

describe('PT-80 The sailor sits opposite the boom', () => {
  it('nextSailorSide swaps the side', () => {
    expect(nextSailorSide(-1)).toBe(1);
    expect(nextSailorSide(1)).toBe(-1);
  });

  it('wind from the other side (a tack): the boom crosses, the sailor and his weight with it', () => {
    // Decided in the M114 PR: the model cannot yet steer the dinghy through the wind (the issue
    // "After M114: review findings for later"), so the test changes the wind's side instead.
    const start = dinghyState(
      { ctl_wind_dir: 60, ctl_wind_speed: 12, ctl_mainsheet: 40 },
      {},
      { headingDeg: 0 },
    );
    expect(start.dinghy.sailorSide).toBe(1);
    const sign = (s: AppState) =>
      Math.sign(crewMomentNm(s.boat.heelDeg, s.dinghy.sit, s.dinghy.sailorSide));
    expect(sign(start)).toBe(1);
    let state = reduce(start, { type: 'setControls', values: { ctl_wind_dir: -60 } });
    state = run(state, 30, (s) => (s.motion?.awaDeg ?? 0) < -20 && s.rig.solution.side === 1);
    expect(state.motion?.awaDeg ?? 0).toBeLessThan(-20);
    expect(state.dinghy.sailorSide).toBe(-1);
    expect(sign(state)).toBe(-1);
  });
});

describe('PT-80 The sailor comes through the middle in a tack (issue #283, M115)', () => {
  it('crewOutShare: out on his side beyond 25 degrees, in the middle within 10, smooth between', () => {
    useDinghy();
    expect(crewOutShare(40, DINGHY.data)).toBe(1);
    expect(crewOutShare(-25, DINGHY.data)).toBe(1);
    expect(crewOutShare(0, DINGHY.data)).toBe(0);
    expect(crewOutShare(-10, DINGHY.data)).toBe(0);
    const mid = crewOutShare(17.5, DINGHY.data);
    expect(mid).toBeGreaterThan(0.4);
    expect(mid).toBeLessThan(0.6);
    expect(crewMomentNm(0, 'side', 1, DINGHY.data, 5)).toBe(0);
    expect(crewMomentNm(0, 'side', 1, DINGHY.data, 60)).toBe(
      crewMomentNm(0, 'side', 1, DINGHY.data),
    );
  });

  it('steering through the wind: close-hauled, the tiller at +30, she tacks and the sailor crosses', () => {
    useDinghy();
    const link = '?boat=dinghy&wd=0&ws=10&hdg=315&ms=15&sp=side&rd=30&sea=flat';
    const start = parseUrlState(link, 'low');
    expect(start.dinghy.sailorSide).toBe(1);
    let crossedAt = -1;
    let maxHeel = 0;
    const end = run(start, 12, (s, t) => {
      maxHeel = Math.max(maxHeel, Math.abs(s.boat.heelDeg));
      if (crossedAt < 0 && s.dinghy.sailorSide === -1) crossedAt = t;
      return undefined;
    });
    expect(crossedAt).toBeGreaterThan(0);
    expect(crossedAt).toBeLessThan(8);
    expect(end.dinghy.sailorSide).toBe(-1);
    expect(end.motion?.awaDeg ?? 0).toBeLessThan(0);
    // She does not go over on the way: the sailor is in the middle while the sail is empty.
    expect(maxHeel).toBeLessThan(45);
  });
});

describe('the dinghy store action and the Hanse', () => {
  it('the action sets the seat, the board and the outhaul, clamped to 0…100', () => {
    useDinghy();
    let state = initialState();
    state = reduce(state, { type: 'dinghy', command: { kind: 'sit', sit: 'out' } });
    state = reduce(state, { type: 'dinghy', command: { kind: 'board', pct: -20 } });
    state = reduce(state, { type: 'dinghy', command: { kind: 'outhaul', pct: 140 } });
    expect(state.dinghy).toMatchObject({ sit: 'out', boardPct: 0, outhaulPct: 100 });
  });

  it('is ignored on the Hanse, whose state it never changes', () => {
    const state = initialState();
    expect(reduce(state, { type: 'dinghy', command: { kind: 'sit', sit: 'out' } })).toBe(state);
  });

  it("the Hanse takes no dinghy terms: stepBoat gives today's heel with a dinghy input absent", () => {
    const state = initialState({
      controls: { ...defaultControls(), ctl_wind_dir: 60, ctl_wind_speed: 12 },
    });
    const after = run(state, 5);
    expect(after.boat.windwardHeelS).toBe(0);
    expect(after.alerts.entries.map((e) => e.kind)).not.toContain('windwardHeel');
  });
});

describe('M114: the link and the panel', () => {
  it('sp, cb and oh are read and written on the dinghy, only when they differ', () => {
    useDinghy();
    const state = parseUrlState('?boat=dinghy&sp=side&cb=40&oh=10', 'low');
    expect(state.dinghy).toMatchObject({ sit: 'side', boardPct: 40, outhaulPct: 10 });
    const params = new URLSearchParams(serializeUrlState(state));
    expect([params.get('sp'), params.get('cb'), params.get('oh')]).toEqual(['side', '40', '10']);
    const plain = new URLSearchParams(serializeUrlState(parseUrlState('?boat=dinghy', 'low')));
    for (const key of ['sp', 'cb', 'oh']) expect(plain.has(key), key).toBe(false);
    // Anything else in them is the default.
    const bad = parseUrlState('?boat=dinghy&sp=up&cb=140&oh=x', 'low');
    expect(bad.dinghy).toMatchObject({ sit: 'in', boardPct: 100, outhaulPct: 50 });
  });

  it('the Hanse never reads or writes them', () => {
    const state = parseUrlState('?sp=out&cb=0&oh=0', 'low');
    expect(state.dinghy).toMatchObject({ sit: 'in', boardPct: 100, outhaulPct: 50 });
    const params = new URLSearchParams(serializeUrlState(state));
    for (const key of ['sp', 'cb', 'oh']) expect(params.has(key), key).toBe(false);
  });

  it('the Balance section is only on the dinghy, after Ropes in every mode', () => {
    expect(sectionAvailable('dinghy', initialState())).toBe(false);
    useDinghy();
    expect(sectionAvailable('dinghy', initialState())).toBe(true);
    for (const mode of Object.values(MODE_LAYOUTS)) {
      const order = mode.order;
      if (order.includes('ropes')) {
        expect(order.indexOf('dinghy')).toBe(order.indexOf('ropes') + 1);
      }
    }
    // A saved arrangement from before this section gets it right after Ropes.
    const saved = completeLayout({ columns: [['ropes', 'sails'], []] });
    expect(saved.columns[0].slice(0, 3)).toEqual(['ropes', 'dinghy', 'sails']);
  });
});
