import { describe, expect, it } from 'vitest';
import { BLOCK_IDS } from '../src/ui/console';
import { SECTION_IDS, consolePlace, type DrawerId } from '../src/ui/modes';

const DRAWERS: DrawerId[] = [
  'exercises',
  'learn',
  'lines',
  'harbour',
  'conditions',
  'place',
  'status',
];

describe('M119: where the sections are on the console (PHASE_CONSOLE_SPEC 7.4)', () => {
  it('every section has a place defined for both ropes modes', () => {
    for (const id of SECTION_IDS) {
      for (const ropes of ['easy', 'realistic'] as const) {
        expect(consolePlace(id, ropes), `${id} ${ropes}`).not.toBeUndefined();
      }
    }
  });

  it('every drawer is the place of at least one section', () => {
    for (const drawer of DRAWERS) {
      const used = SECTION_IDS.some((id) => {
        const place = consolePlace(id, 'easy') ?? consolePlace(id, 'realistic');
        return place !== null && 'drawer' in place && place.drawer === drawer;
      });
      expect(used, drawer).toBe(true);
    }
  });

  it('no section is in a block and a drawer at once, and every block is a known one', () => {
    for (const id of SECTION_IDS) {
      for (const ropes of ['easy', 'realistic'] as const) {
        const place = consolePlace(id, ropes);
        if (!place) continue;
        expect(Object.keys(place), `${id} ${ropes}`).toHaveLength(1);
        if ('block' in place) expect(BLOCK_IDS).toContain(place.block);
      }
    }
  });
});
