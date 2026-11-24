import { describe, expect, it } from 'vitest';
import registry from '../content/registry/parts.json';
import { BUILT_IN_BOATS } from '../src/model/boat';
import { boatLabelsFor } from '../src/model/boatLabels';
import { isRegisteredPartId, partInfo, partOnBoat, requirePartId } from '../src/model/registry';

describe('part registry', () => {
  it('ids are unique', () => {
    const ids = registry.entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('the boats field, where an entry has one, lists built-in boat ids, each once', () => {
    const builtIn = BUILT_IN_BOATS.map((boat) => boat.id);
    for (const entry of registry.entries as { id: string; boats?: string[] }[]) {
      if (entry.boats === undefined) continue;
      expect(Array.isArray(entry.boats), entry.id).toBe(true);
      expect(entry.boats.length, entry.id).toBeGreaterThan(0);
      expect(new Set(entry.boats).size, entry.id).toBe(entry.boats.length);
      for (const boatOf of entry.boats) expect(builtIn, entry.id).toContain(boatOf);
    }
  });

  it('partOnBoat: an entry without boats is on every boat', () => {
    expect(partOnBoat('fit_winch', 'dinghy')).toBe(false);
    expect(partOnBoat('part_tiller', 'hanse508')).toBe(false);
    expect(partOnBoat('rope_mainsheet', 'dinghy')).toBe(true);
    expect(partOnBoat('term_gybe', 'dinghy')).toBe(true);
    expect(partOnBoat('part_made_up', 'dinghy')).toBe(true);
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

  it('the words on the boat come from the clutches in the boat file (owner, PR #54)', () => {
    const labelled = Object.fromEntries(
      registry.entries
        .map((entry) => [entry.id, boatLabelsFor(entry.id)] as const)
        .filter(([, labels]) => labels.length > 0),
    );
    expect(labelled).toEqual({
      rope_mainsheet: ['Main sheet', 'MAIN SHEET'],
      rope_jib_sheet: ['Genoa sheet'],
      rope_vang: ['Vang'],
      rope_topping_lift: ['Boom lift'],
      rope_outhaul: ['Main outhaul'],
      rope_main_furling_line: ['Main furling'],
      rope_jib_furling_line: ['JIB ROLL'],
      rope_main_halyard: ['Main halyard'],
      rope_spi_halyard: ['SPI HALYARD'],
      clutch_jib_roll: ['JIB ROLL'],
    });
  });
});
