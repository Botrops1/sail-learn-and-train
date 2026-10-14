import { describe, expect, it } from 'vitest';
import { initialState, reduce } from '../src/app/store';
import { parseUrlState, serializeUrlState } from '../src/app/urlState';

describe('Learn state (PHASE4_SPEC 6.5)', () => {
  it('openLearn sets, clears and refuses', () => {
    const state = initialState();
    expect(state.learn).toBeNull();
    const open = reduce(state, { type: 'openLearn', id: 'rope_vang' });
    expect(open.learn).toBe('rope_vang');
    expect(reduce(open, { type: 'openLearn', id: 'part_made_up' })).toBe(open);
    expect(reduce(open, { type: 'openLearn', id: 'rope_vang' })).toBe(open);
    expect(reduce(open, { type: 'openLearn', id: null }).learn).toBeNull();
    expect(reduce(open, { type: 'reset' }).learn).toBeNull();
  });

  it('opening an entry changes nothing else', () => {
    const state = initialState();
    const open = reduce(state, { type: 'openLearn', id: 'sail_main' });
    expect({ ...open, learn: null }).toEqual(state);
  });
});

describe('the learn link key', () => {
  it('?learn= opens that entry; unknown ids are ignored', () => {
    expect(parseUrlState('?learn=rope_vang', 'low').learn).toBe('rope_vang');
    expect(parseUrlState('?learn=part_made_up', 'low').learn).toBeNull();
    expect(parseUrlState('?wd=60', 'low').learn).toBeNull();
  });

  it('is written right after sel, and only when an entry is open', () => {
    const state = parseUrlState('?sel=rope_vang&learn=rope_vang', 'low');
    const link = serializeUrlState(state);
    expect(link).toMatch(/&sel=rope_vang&learn=rope_vang&step=/);
    expect(serializeUrlState(parseUrlState('?sel=rope_vang', 'low'))).not.toContain('learn');
  });

  it('round-trips', () => {
    const state = parseUrlState('?learn=sail_jib&cam=bow', 'low');
    expect(parseUrlState(serializeUrlState(state), 'low').learn).toBe('sail_jib');
  });
});
