import { describe, expect, it } from 'vitest';
import registry from '../content/registry/parts.json';
import { hullBounds } from '../src/model/boat';
import { isRegisteredPartId, requirePartId } from '../src/model/registry';

describe('part registry', () => {
  it('ids are unique', () => {
    const ids = registry.entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ids used by the M0 scene exist', () => {
    for (const id of ['part_hull', 'env_water']) expect(isRegisteredPartId(id)).toBe(true);
  });

  it('an invented id fails loudly', () => {
    expect(() => requirePartId('part_made_up')).toThrow(/parts\.json/);
  });
});

describe('boat data', () => {
  it('hull bounds come from hanse508.json and are sane', () => {
    const { min, max } = hullBounds();
    const length = max[0] - min[0];
    const beam = max[2] - min[2];
    expect(length).toBeCloseTo(14.9, 1);
    expect(beam).toBeCloseTo(4.75, 2);
    expect(min[1]).toBeLessThan(0);
    expect(max[1]).toBeGreaterThan(1);
  });
});
