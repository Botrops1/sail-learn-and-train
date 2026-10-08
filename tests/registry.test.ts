import { describe, expect, it } from 'vitest';
import registry from '../content/registry/parts.json';
import { isRegisteredPartId, partInfo, requirePartId } from '../src/model/registry';

describe('part registry', () => {
  it('ids are unique', () => {
    const ids = registry.entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry has an English name, a one-liner and a status', () => {
    for (const entry of registry.entries) {
      expect(entry.names.en.trim(), entry.id).not.toBe('');
      expect(entry.short.en.trim(), entry.id).not.toBe('');
      expect(Object.keys(registry.statusValues), entry.id).toContain(entry.status.en);
    }
  });

  it('an invented id fails loudly', () => {
    expect(() => requirePartId('part_made_up')).toThrow(/parts\.json/);
    expect(isRegisteredPartId('part_made_up')).toBe(false);
  });

  it('partInfo gives the name, the labels on the boat and the one-liner', () => {
    const info = partInfo('rope_topping_lift');
    expect(info?.name).toBe('Topping lift');
    expect(info?.boatLabels).toEqual(['Boom lift']);
    expect(info?.short).toMatch(/boom/i);
    expect(partInfo('part_mast')?.boatLabels).toEqual([]);
    expect(partInfo('part_made_up')).toBeUndefined();
  });
});
