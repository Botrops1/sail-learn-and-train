import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WIDE_LAYOUT,
  completeLayout,
  layoutIndex,
  moveSection,
  parseLayout,
  serializeLayout,
} from '../src/ui/sectionLayout';
import { SECTION_IDS } from '../src/ui/modes';

describe('M54: section layout (PHASE8_SPEC 12.5)', () => {
  it('completeLayout(null) is the default', () => {
    expect(completeLayout(null)).toEqual(DEFAULT_WIDE_LAYOUT);
  });

  it('drops unknown and repeated ids and adds the missing ones where the default puts them', () => {
    const layout = completeLayout({ columns: [['learn', 'ropes', 'ropes', 'bogus'], []] });
    expect(layout.columns[0].slice(0, 2)).toEqual(['learn', 'ropes']);
    expect(layout.columns[0]).not.toContain('bogus' as never);
    expect(layout.columns[0].filter((id) => id === 'ropes')).toHaveLength(1);
    expect(layout.columns[1]).toContain('conditions');
    const all = [...layout.columns[0], ...layout.columns[1]].sort();
    const wide = SECTION_IDS.filter((id) => id !== 'mode' && id !== 'settings').sort();
    expect(all).toEqual(wide);
  });

  it('moves a section to the top of the other column', () => {
    const next = moveSection(DEFAULT_WIDE_LAYOUT, 'conditions', 0, 0);
    expect(next.columns[0][0]).toBe('conditions');
    expect(next.columns[1]).toEqual(['learn']);
  });

  it('clamps an index that is too large to the end', () => {
    const next = moveSection(DEFAULT_WIDE_LAYOUT, 'ropes', 0, 99);
    expect(next.columns[0][next.columns[0].length - 1]).toBe('ropes');
  });

  it('round-trips through serialize and parse, and refuses wrong shapes', () => {
    expect(parseLayout(serializeLayout(DEFAULT_WIDE_LAYOUT))).toEqual(DEFAULT_WIDE_LAYOUT);
    for (const bad of [
      '{"v":2,"c":[[],[]]}',
      '{"v":1,"c":[[]]}',
      '{"v":1,"c":[[1],[]]}',
      '[]',
      'nope',
      null,
    ]) {
      expect(parseLayout(bad), String(bad)).toBeNull();
    }
  });

  it('moves a section within its column', () => {
    const next = moveSection(DEFAULT_WIDE_LAYOUT, 'sails', 0, 0);
    expect(next.columns[0].slice(0, 2)).toEqual(['sails', 'exercises']);
  });

  it('layoutIndex skips hidden sections', () => {
    const column = ['ropes', 'helm', 'sails'] as const;
    const visible = ['ropes', 'sails'] as const;
    expect(layoutIndex(column, visible, 0)).toBe(0);
    expect(layoutIndex(column, visible, 1)).toBe(2);
    expect(layoutIndex(column, visible, 2)).toBe(3);
  });

  it('completeLayout returns new arrays, never the default itself', () => {
    const layout = completeLayout(null);
    expect(layout).not.toBe(DEFAULT_WIDE_LAYOUT);
    expect(layout.columns).not.toBe(DEFAULT_WIDE_LAYOUT.columns);
    expect(layout.columns[0]).not.toBe(DEFAULT_WIDE_LAYOUT.columns[0]);
    expect(layout.columns[1]).not.toBe(DEFAULT_WIDE_LAYOUT.columns[1]);
  });
});
