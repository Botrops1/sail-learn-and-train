import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import { isControlId } from '../src/model/controls';
import {
  clutchSpots,
  entryFor,
  highlightIds,
  panelEntries,
  type PanelEntry,
} from '../src/model/panelEntries';
import { isRegisteredPartId } from '../src/model/registry';

/** The Ropes tab's entries and clutches, derived from hanse508.json (PHASE1_SPEC 7.2). */

function entry(key: string): PanelEntry {
  const found = panelEntries().find((candidate) => candidate.key === key);
  if (!found) throw new Error(`no entry ${key}`);
  return found;
}

describe('Ropes tab entries (PHASE1_SPEC 7.2)', () => {
  it('every rope control and the wheel has an entry; the static ropes have one each', () => {
    const keys = panelEntries().map((candidate) => candidate.key);
    expect(keys).toEqual([
      'ctl_mainsheet',
      'ctl_jib_sheet',
      'ctl_vang',
      'ctl_topping_lift',
      'ctl_main_furl',
      'ctl_jib_furl',
      'ctl_rudder',
      'rope_main_halyard',
      'rope_spi_halyard',
    ]);
    for (const candidate of panelEntries()) {
      expect(isRegisteredPartId(candidate.selectId), candidate.key).toBe(true);
      for (const id of [...candidate.partIds, ...candidate.openedBy]) {
        expect(isRegisteredPartId(id), id).toBe(true);
      }
      if (candidate.controlId !== null) expect(isControlId(candidate.controlId)).toBe(true);
    }
  });

  it('both main sheet clutches are one rope with two ends', () => {
    expect(entry('ctl_mainsheet')).toMatchObject({
      selectId: 'rope_mainsheet',
      partIds: ['rope_mainsheet'],
      shared: 'twoEnds',
    });
  });

  it('the two furling tails and the outhaul share "Mainsail out" and work against each other', () => {
    const furl = entry('ctl_main_furl');
    expect(furl.selectId).toBe('rope_main_furling_line');
    expect([...furl.partIds].sort()).toEqual(['rope_main_furling_line', 'rope_outhaul']);
    expect(furl.shared).toBe('workAgainst');
    // Selecting either rope opens the same control and lights up both.
    expect(entryFor('rope_outhaul')).toBe(furl);
    expect(highlightIds('rope_outhaul').sort()).toEqual(['rope_main_furling_line', 'rope_outhaul']);
  });

  it('the single-rope controls have no shared hint', () => {
    for (const key of ['ctl_vang', 'ctl_topping_lift', 'ctl_jib_sheet', 'ctl_jib_furl']) {
      expect(entry(key).shared, key).toBeNull();
    }
  });

  it('the JIB ROLL clutch opens the jib furling control', () => {
    expect(entryFor('clutch_jib_roll')?.key).toBe('ctl_jib_furl');
  });

  it('the wheel control is the rudder (part_rudder) and turns both wheels; tapping a wheel opens it', () => {
    const wheel = entry('ctl_rudder');
    expect(wheel.selectId).toBe('part_rudder');
    expect(wheel.partIds).toEqual(['part_rudder', 'helm_port', 'helm_starboard']);
    expect(entryFor('helm_starboard')).toBe(wheel);
    expect(highlightIds('helm_port').sort()).toEqual([
      'helm_port',
      'helm_starboard',
      'part_rudder',
    ]);
  });

  it('static ropes say why they have no control (in-mast furling, gennaker not rigged)', () => {
    expect(entry('rope_main_halyard')).toMatchObject({
      controlId: null,
      staticNote: 'inMastFurling',
    });
    expect(entry('rope_spi_halyard')).toMatchObject({ controlId: null, staticNote: 'notRigged' });
  });

  it('a part without an entry highlights only itself; no selection highlights nothing', () => {
    expect(entryFor('part_mast')).toBeUndefined();
    expect(highlightIds('part_mast')).toEqual(['part_mast']);
    expect(highlightIds(null)).toEqual([]);
  });
});

describe('clutch banks as on the boat (photos, BOAT_REFERENCE 4)', () => {
  const spots = clutchSpots();
  const labels = (bankId: string) =>
    spots
      .filter((spot) => spot.bankId === bankId)
      .sort((a, b) => a.slot - b.slot)
      .map((spot) => spot.label);

  it('bank B is on the port side: SPI HALYARD · Boom lift · Main outhaul · MAIN SHEET · Vang', () => {
    expect(spots.find((spot) => spot.bankId === 'clutch_bank_b')?.side).toBe('port');
    expect(labels('clutch_bank_b')).toEqual([
      'SPI HALYARD',
      'Boom lift',
      'Main outhaul',
      'MAIN SHEET',
      'Vang',
    ]);
  });

  it('bank A is on the starboard side: Main sheet · Main furling · Main furling · Main halyard · Genoa sheet', () => {
    expect(spots.find((spot) => spot.bankId === 'clutch_bank_a')?.side).toBe('starboard');
    expect(labels('clutch_bank_a')).toEqual([
      'Main sheet',
      'Main furling',
      'Main furling',
      'Main halyard',
      'Genoa sheet',
    ]);
  });

  it('JIB ROLL is a single clutch on the port side deck', () => {
    expect(labels('clutch_jib_roll')).toEqual(['JIB ROLL']);
    expect(spots.find((spot) => spot.bankId === 'clutch_jib_roll')?.side).toBe('port');
  });

  it('every clutch opens an entry, and the halyard clutches are the large type', () => {
    for (const spot of spots) expect(spot.entryKey, spot.label).not.toBeNull();
    expect(spots.filter((spot) => spot.large).map((spot) => spot.label)).toEqual([
      'Main halyard',
      'SPI HALYARD',
    ]);
  });

  it('the furling clutches are the "in" (left) and "out" (right) tails', () => {
    const furling = spots.filter((spot) => spot.label === 'Main furling');
    expect(furling.map((spot) => [spot.slot, spot.tail])).toEqual([
      [2, 'furl'],
      [3, 'unfurl'],
    ]);
  });

  it('clutch-panel data only names registered ropes', () => {
    for (const id of boat.clutchPanel.largeClutchRopes) expect(isRegisteredPartId(id)).toBe(true);
    for (const id of Object.keys(boat.clutchPanel.staticRopeNotes)) {
      expect(isRegisteredPartId(id)).toBe(true);
    }
  });
});
