import { describe, expect, it } from 'vitest';
import { initialState, reduce } from '../src/app/store';
import { parseUrlState, serializeUrlState } from '../src/app/urlState';
import { DEFAULT_HARBOUR, fenderHintShown } from '../src/model/harbour';

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
    expect(fenderHintShown({ fendersOut: true }, 'sailing')).toBe(true);
    expect(fenderHintShown({ fendersOut: true }, 'held')).toBe(false);
    expect(fenderHintShown({ fendersOut: false }, 'sailing')).toBe(false);
    expect(fenderHintShown({ fendersOut: false }, 'held')).toBe(false);
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
