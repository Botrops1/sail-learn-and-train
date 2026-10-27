import { describe, expect, it } from 'vitest';
import { initialState, reduce } from '../src/app/store';
import { parseUrlState, serializeUrlState } from '../src/app/urlState';
import { boat } from '../src/model/boat';
import { DEFAULT_HARBOUR, fenderHintShown, fendersInHintShown } from '../src/model/harbour';
import { marinaGeometry } from '../src/model/marina';

describe('Phase 6, M33: harbour gear (the fenders)', () => {
  it('1. the fenders start in the locker', () => {
    expect(DEFAULT_HARBOUR.fendersOut).toBe(false);
    expect(initialState().harbour.fendersOut).toBe(false);
  });

  it('2. setFenders puts them out and in; nothing changes, the same state comes back', () => {
    const start = initialState();
    expect(reduce(start, { type: 'setFenders', out: false })).toBe(start);
    const out = reduce(start, { type: 'setFenders', out: true });
    expect(out.harbour.fendersOut).toBe(true);
    expect(reduce(out, { type: 'setFenders', out: true })).toBe(out);
    expect(reduce(out, { type: 'setFenders', out: false }).harbour.fendersOut).toBe(false);
  });

  it('2b. it works Held still and Sailing', () => {
    for (const mode of ['held', 'sailing'] as const) {
      const state = reduce(initialState({ boat: { mode } }), { type: 'setFenders', out: true });
      expect(state.harbour.fendersOut).toBe(true);
      expect(state.boat.mode).toBe(mode);
    }
  });

  it('3. reset puts them back in the locker', () => {
    const out = reduce(initialState(), { type: 'setFenders', out: true });
    expect(reduce(out, { type: 'reset' }).harbour.fendersOut).toBe(false);
  });

  it('3b. a loaded state brings its own fenders', () => {
    const out = reduce(initialState(), { type: 'setFenders', out: true });
    expect(reduce(initialState(), { type: 'load', state: out }).harbour.fendersOut).toBe(true);
  });

  it('4. the hint shows only for fenders out and Sailing', () => {
    expect(fenderHintShown({ ...DEFAULT_HARBOUR, fendersOut: true }, 'sailing')).toBe(true);
    expect(fenderHintShown({ ...DEFAULT_HARBOUR, fendersOut: true }, 'held')).toBe(false);
    expect(fenderHintShown({ ...DEFAULT_HARBOUR, fendersOut: false }, 'sailing')).toBe(false);
    expect(fenderHintShown({ ...DEFAULT_HARBOUR, fendersOut: false }, 'held')).toBe(false);
  });

  describe('5. the link', () => {
    const parse = (query: string) => parseUrlState(query, 'low');
    it('fd=1 round-trips', () => {
      const state = parse('?fd=1');
      expect(state.harbour.fendersOut).toBe(true);
      expect(serializeUrlState(state)).toMatch(/[?&]fd=1(&|$)/);
      expect(parse(serializeUrlState(state)).harbour.fendersOut).toBe(true);
    });

    it('a link without fd, or with another value, opens with them in the locker', () => {
      for (const query of ['?wd=60&ws=12', '?fd=0', '?fd=2', '?fd=']) {
        expect(parse(query).harbour.fendersOut, query).toBe(false);
      }
    });

    it('nothing is written while they are in the locker', () => {
      expect(serializeUrlState(parse('?fd=0'))).not.toMatch(/[?&]fd=/);
      expect(serializeUrlState(initialState())).not.toMatch(/[?&]fd=/);
    });

    it('fd=1 comes after the clock keys and before the Realistic keys', () => {
      const keys = [
        ...new URLSearchParams(
          serializeUrlState(parse('?clock=0&fd=1&mode=realistic&st=starboard')),
        ).keys(),
      ];
      expect(keys.indexOf('clock')).toBeGreaterThan(-1);
      expect(keys.indexOf('fd')).toBeGreaterThan(keys.indexOf('clock'));
      expect(keys.indexOf('st')).toBeGreaterThan(keys.indexOf('fd'));
    });
  });
});

describe('Phase 8, M59: the fenders-in hint when backing into the berth', () => {
  const { west, east } = marinaGeometry('medium', 'half').ourRings;
  const ringsEast = (west[0] + east[0]) / 2;
  const ringsNorth = west[1];
  /** A boat heading south (stern to the quay) with its stern `sternM` metres from the rings. */
  const backing = (
    sternM: number,
    fields: { place?: 'open' | 'marina'; out?: boolean; speed?: number },
  ) => {
    const state = initialState();
    return {
      harbour: {
        ...state.harbour,
        place: fields.place ?? 'marina',
        fendersOut: fields.out ?? false,
      },
      boat: {
        ...state.boat,
        eastM: ringsEast,
        northM: ringsNorth - sternM + boat.hull.transomX,
        headingDeg: 180,
        speedMps: fields.speed ?? -0.5,
      },
    };
  };

  it('is false in open water', () => {
    expect(fendersInHintShown(backing(10, { place: 'open' }))).toBe(false);
  });

  it('is false with the fenders out', () => {
    expect(fendersInHintShown(backing(10, { out: true }))).toBe(false);
  });

  it('is false going ahead or lying still', () => {
    expect(fendersInHintShown(backing(10, { speed: 0.5 }))).toBe(false);
    expect(fendersInHintShown(backing(10, { speed: -0.05 }))).toBe(false);
  });

  it('is true going astern 10 m from the rings', () => {
    expect(fendersInHintShown(backing(10, {}))).toBe(true);
  });

  it('is false going astern 20 m from the rings', () => {
    expect(fendersInHintShown(backing(20, {}))).toBe(false);
  });
});
