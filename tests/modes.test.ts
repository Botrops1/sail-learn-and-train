import { describe, expect, it } from 'vitest';
import { APP_MODES } from '../src/app/appMode';
import { initialState, reduce, type AppState } from '../src/app/store';
import { parseUrlState, serializeUrlState } from '../src/app/urlState';
import { GROUPS, groupEntries, learnEntry } from '../src/model/glossary';
import { MODE_LAYOUTS, SECTION_IDS, sectionAvailable } from '../src/ui/modes';

describe('MODE_LAYOUTS (PHASE5_SPEC 4.4, 8.8 test 1)', () => {
  for (const mode of APP_MODES) {
    it(`${mode}: every section once; second is a subset`, () => {
      const layout = MODE_LAYOUTS[mode];
      expect([...layout.order].sort()).toEqual([...SECTION_IDS].sort());
      expect(new Set(layout.order).size).toBe(layout.order.length);
      for (const id of layout.second) expect(layout.order, `${mode}: ${id}`).toContain(id);
      expect(layout.second).toHaveLength(2);
    });
  }
});

describe('sectionAvailable (8.8 test 2)', () => {
  it('autopilot and engine only in Easy; legend follows its setting; the rest always', () => {
    const easy = initialState();
    const real = reduce(easy, { type: 'setAppMode', mode: 'realistic' });
    for (const id of ['autopilot', 'engine'] as const) {
      expect(sectionAvailable(id, easy)).toBe(true);
      expect(sectionAvailable(id, real)).toBe(false);
    }
    const noLegend = reduce(easy, { type: 'setLegend', legend: false });
    expect(sectionAvailable('legend', noLegend)).toBe(false);
    expect(sectionAvailable('legend', reduce(noLegend, { type: 'setLegend', legend: true }))).toBe(
      true,
    );
    for (const id of ['ropes', 'sails', 'conditions', 'learn', 'harbour'] as const) {
      expect(sectionAvailable(id, easy)).toBe(true);
      expect(sectionAvailable(id, real)).toBe(true);
    }
  });
});

describe('the mode in the store (8.8 test 3)', () => {
  it('follows the ropes mode, except in Learn', () => {
    const state = initialState();
    expect(state.appMode).toBe('easy');
    const real = reduce(state, { type: 'setAppMode', mode: 'realistic' });
    expect(real.appMode).toBe('realistic');
    expect(real.settings.ropesMode).toBe('realistic');
    const learn = reduce(real, { type: 'setAppMode', mode: 'learn' });
    expect(learn.appMode).toBe('learn');
    expect(learn.settings.ropesMode).toBe('realistic');
    const easyRopes = reduce(learn, { type: 'setRopesMode', mode: 'easy' });
    expect(easyRopes.settings.ropesMode).toBe('easy');
    expect(easyRopes.appMode).toBe('learn');
    expect(reduce(state, { type: 'setRopesMode', mode: 'realistic' }).appMode).toBe('realistic');
    expect(reduce(learn, { type: 'reset' }).appMode).toBe('easy');
    expect(reduce(state, { type: 'setAppMode', mode: 'easy' })).toBe(state);
    expect(reduce(learn, { type: 'setAppMode', mode: 'learn' })).toBe(learn);
  });

  it('keeps the invariant: learn, or the ropes mode', () => {
    let state: AppState = initialState();
    for (const mode of ['realistic', 'learn', 'easy', 'learn', 'realistic'] as const) {
      state = reduce(state, { type: 'setAppMode', mode });
      expect(state.appMode === 'learn' || state.appMode === state.settings.ropesMode).toBe(true);
    }
  });
});

describe('the mode in the link (8.8 test 4)', () => {
  const parse = (query: string) => parseUrlState(query, 'low');
  it('parses m and the old learn links', () => {
    expect(parse('?m=learn').appMode).toBe('learn');
    expect(parse('?m=learn').learn).toBeNull();
    expect(parse('?learn=rope_vang').appMode).toBe('learn');
    expect(parse('?learn=part_made_up').appMode).toBe('easy');
    expect(parse('?mode=realistic').appMode).toBe('realistic');
    const both = parse('?mode=realistic&learn=rope_vang');
    expect(both.appMode).toBe('learn');
    expect(both.settings.ropesMode).toBe('realistic');
    expect(parse('?m=easy').appMode).toBe('easy');
    expect(parse('?m=easy&mode=realistic').appMode).toBe('realistic');
  });

  it('writes m=learn right after cam, and learn= only in Learn mode', () => {
    const learn = reduce(initialState(), { type: 'setAppMode', mode: 'learn' });
    expect(serializeUrlState(learn)).toContain('&cam=side-port&m=learn&');
    const open = reduce(learn, { type: 'openLearn', id: 'rope_vang' });
    const link = serializeUrlState(open);
    expect(link).toContain('&m=learn');
    expect(link).toContain('learn=rope_vang');
    const easy = reduce(open, { type: 'setAppMode', mode: 'easy' });
    expect(easy.learn).toBe('rope_vang');
    const easyLink = serializeUrlState(easy);
    expect(easyLink).not.toMatch(/[?&]m=/);
    expect(easyLink).not.toMatch(/[?&]learn=/);
  });

  it('round-trips the three modes', () => {
    for (const mode of APP_MODES) {
      const state = reduce(initialState(), { type: 'setAppMode', mode });
      expect(parseUrlState(serializeUrlState(state), 'low').appMode).toBe(mode);
    }
  });
});

describe('Show me links (8.8 test 5)', () => {
  it('still round-trip and never carry m=', () => {
    let checked = 0;
    for (const group of GROUPS) {
      for (const id of groupEntries(group, 'en')) {
        const query = learnEntry(id, 'en')?.showMeQuery;
        if (!query) continue;
        checked++;
        expect(query, id).not.toMatch(/[?&]m=/);
        const back = new URLSearchParams(serializeUrlState(parseUrlState(query, 'low')));
        for (const [key, value] of new URLSearchParams(query)) {
          expect(back.get(key), `${id}: ${key}`).toBe(value);
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});
