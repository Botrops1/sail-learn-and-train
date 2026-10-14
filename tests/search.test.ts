import { describe, expect, it } from 'vitest';
import { groupEntries, normalizeSearch, searchGlossary } from '../src/model/glossary';

describe('normalizeSearch (PHASE4_SPEC 7.3)', () => {
  it('1. lower case, marks dropped, dashes as spaces, runs of spaces as one', () => {
    expect(normalizeSearch('  Гика-Шкот ')).toBe('гика шкот');
    expect(normalizeSearch('ЁЛКА')).toBe('елка');
    expect(normalizeSearch('Seldén')).toBe('selden');
  });

  it('every dash and the underscore become a space', () => {
    expect(normalizeSearch('a-b‐c‑d‒e–f—g―h_i')).toBe('a b c d e f g h i');
    expect(normalizeSearch('й')).toBe('и');
  });
});

describe('searchGlossary (PHASE4_SPEC 7.3, 7.6)', () => {
  it('2. "vang": the entry named Vang comes first, the rigid vang strut is also a hit', () => {
    const hits = searchGlossary('vang');
    expect(hits[0]?.id).toBe('rope_vang');
    expect(hits[0]?.matched).toBeNull();
    expect(hits.map((hit) => hit.id)).toContain('part_vang_strut');
  });

  it('3. "kicker": found through an alternative name, one hit per entry', () => {
    const hits = searchGlossary('kicker');
    const vang = hits.find((hit) => hit.id === 'rope_vang');
    expect(vang?.matched).toBe('kicker');
    expect(hits.filter((hit) => hit.id === 'rope_vang')).toHaveLength(1);
    expect(hits.find((hit) => hit.id === 'part_vang_strut')?.matched).toBe('rigid kicker');
  });

  it('4. "genoa": found through a word printed on the boat', () => {
    const hit = searchGlossary('genoa').find((item) => item.id === 'rope_jib_sheet');
    expect(hit?.matched).toBe('Genoa sheet');
  });

  it('5. Russian search uses Russian words and the boat’s labels, never English names', () => {
    const ids = searchGlossary('шкот', 'ru').map((hit) => hit.id);
    expect(ids).toContain('rope_mainsheet');
    expect(ids).toContain('rope_jib_sheet');
    expect(searchGlossary('mainsheet', 'ru')).toEqual([]);
    expect(searchGlossary('main sheet', 'ru').map((hit) => hit.id)).toContain('rope_mainsheet');
  });

  it('6. an empty or blank query, or a word nobody uses, finds nothing', () => {
    expect(searchGlossary('')).toEqual([]);
    expect(searchGlossary('   ')).toEqual([]);
    expect(searchGlossary('zzzz')).toEqual([]);
  });

  it('names that start with the query come before names that contain it', () => {
    const hits = searchGlossary('mast');
    expect(hits[0]?.id).toBe('part_mast');
    const first = hits.findIndex((hit) => hit.matched !== null || !/^mast/i.test(hit.name));
    const lastStart = hits.map((hit) => /^mast/i.test(hit.name)).lastIndexOf(true);
    expect(lastStart).toBeLessThan(first === -1 ? Infinity : first);
  });
});

describe('groupEntries (PHASE4_SPEC 7.3, 7.6)', () => {
  it('7. the ropes group has 9 ids, sorted by English name', () => {
    const ids = groupEntries('ropes');
    expect(ids).toHaveLength(9);
    expect(ids[0]).toBe('rope_spi_halyard');
    expect(ids[ids.length - 1]).toBe('rope_vang');
  });
});

describe('searchGlossary, M22 words (PHASE4_SPEC 8.5)', () => {
  it('Russian alternatives are found: норд → term_north, бакборт → term_port', () => {
    const north = searchGlossary('норд', 'ru').find((hit) => hit.id === 'term_north');
    expect(north?.matched).toBe('норд');
    expect(searchGlossary('бакборт', 'ru').map((hit) => hit.id)).toContain('term_port');
  });

  it('"jibe" finds the gybe', () => {
    expect(searchGlossary('jibe').map((hit) => hit.id)).toContain('term_gybe');
  });

  it('English words are not found in Russian', () => {
    expect(searchGlossary('north', 'ru')).toEqual([]);
  });
});
