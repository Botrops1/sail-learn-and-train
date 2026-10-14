import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import registry from '../content/registry/parts.json';
import { mpsToKn } from '../src/model/angles';
import { boatLabelsFor } from '../src/model/boatLabels';
import {
  GLOSSARIES,
  GROUPS,
  glossaryText,
  groupEntries,
  learnEntry,
  NOT_DRAWN,
  sourceLink,
  type GlossaryText,
} from '../src/model/glossary';
import { dangerZone } from '../src/model/gybe';
import { entryFor } from '../src/model/panelEntries';
import { significantHeightM, waveTrains } from '../src/model/waves';
import { reduce } from '../src/app/store';
import { parseUrlState, serializeUrlState } from '../src/app/urlState';

/** The entries that are complete in every language (3.2): M20's 18 and M21's 55; M22 adds theirs. */
const COMPLETE_IDS = [
  'rope_mainsheet',
  'rope_jib_sheet',
  'rope_vang',
  'rope_topping_lift',
  'rope_outhaul',
  'rope_main_furling_line',
  'rope_jib_furling_line',
  'rope_main_halyard',
  'rope_spi_halyard',
  'sail_main',
  'sail_jib',
  'sail_gennaker',
  'sailpart_head',
  'sailpart_tack',
  'sailpart_clew',
  'sailpart_luff',
  'sailpart_leech',
  'sailpart_foot',
  'part_hull',
  'part_bow',
  'part_stern',
  'part_deck',
  'part_coachroof',
  'part_cockpit',
  'part_companionway',
  'part_keel',
  'part_rudder',
  'part_saildrive',
  'part_lifelines',
  'part_mast',
  'part_boom',
  'part_gooseneck',
  'part_spreader',
  'part_shroud',
  'part_forestay',
  'part_backstay',
  'part_windex',
  'part_telltale',
  'part_vang_strut',
  'fit_sprayhood',
  'part_main_furling_gearbox',
  'part_jib_furler',
  'fit_mainsheet_boom_blocks',
  'fit_mainsheet_deck_blocks',
  'fit_self_tacking_track',
  'fit_self_tacking_car',
  'fit_clutch',
  'clutch_bank_a',
  'clutch_bank_b',
  'clutch_jib_roll',
  'fit_rope_bin',
  'fit_winch',
  'winch_primary_port',
  'winch_primary_starboard',
  'part_winch_handle',
  'winch_secondary_port',
  'winch_secondary_starboard',
  'helm_port',
  'helm_starboard',
  'fit_compass',
  'engine_control',
  'fit_mast_base_turning_blocks',
  'fit_line_channels',
  'fit_anchor_windlass',
  'fit_bow_roller',
  'fit_mooring_cleat',
  'fit_autopilot_control',
  'fit_instrument_display',
  'env_water',
  'env_wind',
  'env_wake',
  'env_boom_danger_zone',
  'env_buoy',
];

const LANGUAGES = Object.keys(GLOSSARIES);

function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`missing: ${what}`);
  return value;
}
const textOf = (id: string, code: string): GlossaryText =>
  must(glossaryText(id, code), `${code}/${id}`);
const entries = registry.entries as {
  id: string;
  kind: string;
  status: string;
  sources: string[];
  controls?: string[];
  related?: string[];
  showMe?: string;
}[];
const REGISTRY_IDS = entries.map((entry) => entry.id);

const nonEmpty = (text: string | undefined): boolean =>
  typeof text === 'string' && text.trim() !== '';

/** Complete (3.2): `short`, `what`, and everything optional that the English entry has. */
function isComplete(id: string, text: GlossaryText): boolean {
  const en = glossaryText(id, 'en');
  if (!en) return false;
  if (!nonEmpty(text.short) || !nonEmpty(text.what)) return false;
  if (en.onThisBoat !== undefined && !nonEmpty(text.onThisBoat)) return false;
  if (en.mistakes !== undefined && text.mistakes?.length !== en.mistakes.length) return false;
  if (en.showMe !== undefined && !nonEmpty(text.showMe)) return false;
  return true;
}

describe('glossary files (PHASE4_SPEC 6.8)', () => {
  it('1. every registry id has an entry in every glossary, and no glossary has another id', () => {
    expect(LANGUAGES).toContain('en');
    expect(LANGUAGES).toContain('ru');
    for (const code of LANGUAGES) {
      const file = must(GLOSSARIES[code], code);
      expect(file.language, code).toBe(code);
      expect(Object.keys(file.entries), code).toEqual(REGISTRY_IDS);
    }
  });

  it('2. names, alternatives and text status are well formed', () => {
    for (const code of LANGUAGES) {
      for (const entry of entries) {
        const text = textOf(entry.id, code);
        const where = `${code}/${entry.id}`;
        expect(nonEmpty(text.name), where).toBe(true);
        expect(Array.isArray(text.alternatives), where).toBe(true);
        const seen = new Set<string>([
          text.name.toLowerCase(),
          ...boatLabelsFor(entry.id).map((label) => label.toLowerCase()),
        ]);
        for (const alt of text.alternatives) {
          expect(nonEmpty(alt.term), where).toBe(true);
          if (alt.note !== undefined) expect(nonEmpty(alt.note), where).toBe(true);
          expect(seen.has(alt.term.toLowerCase()), `${where}: "${alt.term}" repeats`).toBe(false);
          seen.add(alt.term.toLowerCase());
        }
        expect(['draft', 'sailor-reviewed'], where).toContain(text.textStatus);
      }
    }
  });

  it('3. English has a one-liner everywhere; the complete entries are complete in every language', () => {
    for (const entry of entries) {
      expect(nonEmpty(glossaryText(entry.id, 'en')?.short), entry.id).toBe(true);
    }
    for (const code of LANGUAGES) {
      for (const id of COMPLETE_IDS) {
        expect(isComplete(id, textOf(id, code)), `${code}/${id}`).toBe(true);
      }
    }
  });

  it('4. show-me text exactly where the registry has a scene', () => {
    for (const entry of entries) {
      for (const code of LANGUAGES) {
        const text = textOf(entry.id, code);
        if (entry.showMe === undefined) {
          expect(text.showMe, `${code}/${entry.id}`).toBeUndefined();
        } else if (isComplete(entry.id, text)) {
          expect(nonEmpty(text.showMe), `${code}/${entry.id}`).toBe(true);
        }
      }
    }
  });

  it('5. registry facts: version 2, statuses, sources, controls and related', () => {
    expect(registry.schemaVersion).toBe(2);
    const idSet = new Set(REGISTRY_IDS);
    for (const entry of entries) {
      expect(Object.keys(registry.statusValues), entry.id).toContain(entry.status);
      for (const key of entry.sources) {
        expect(Object.keys(registry.sourceKeys), `${entry.id}: ${key}`).toContain(key);
        expect(sourceLink(key, 'https://example.org/repo'), `${entry.id}: ${key}`).toBeDefined();
      }
      for (const id of entry.controls ?? []) {
        expect(entryFor(id), `${entry.id} controls ${id}`).toBeDefined();
      }
      const related = entry.related ?? [];
      expect(new Set(related).size, `${entry.id} related repeats`).toBe(related.length);
      for (const id of related) {
        expect(idSet.has(id), `${entry.id} related ${id}`).toBe(true);
        expect(id, `${entry.id} relates to itself`).not.toBe(entry.id);
      }
      // The words on the boat come from the boat file (owner, PR #54), not the registry.
      for (const old of ['names', 'aliases', 'short', 'boatLabel']) {
        expect(old in entry, entry.id).toBe(false);
      }
    }
  });

  it('sourceLink shows each kind of key', () => {
    const repo = 'https://github.com/o/r';
    expect(sourceLink('brochure', repo)).toEqual({ kind: 'brochure' });
    expect(sourceLink('owner', repo)).toEqual({ kind: 'owner' });
    expect(sourceLink('photo:vang', repo)).toEqual({
      kind: 'photo',
      href: `${repo}/blob/main/docs/reference/photos/mast-gooseneck-vang-outhaul.jpg`,
      name: 'mast-gooseneck-vang-outhaul',
    });
    expect(sourceLink('wiki:point-of-sail', repo)).toEqual({
      kind: 'url',
      href: 'https://en.wikipedia.org/wiki/Point_of_sail',
      text: 'en.wikipedia.org/wiki/Point_of_sail',
    });
    expect(sourceLink('no-such-key', repo)).toBeUndefined();
  });

  it('learnEntry joins the registry facts and the text', () => {
    const vang = learnEntry('rope_vang');
    expect(vang?.text.name).toBe('Vang');
    expect(vang?.boatLabels).toEqual(['Vang']);
    expect(vang?.status).toBe('photo-confirmed');
    expect(vang?.controls).toEqual(['rope_vang']);
    expect(vang?.showMeQuery).toMatch(/^\?wd=90/);
    expect(learnEntry('sail_gennaker')?.showMeQuery).toBeNull();
    expect(learnEntry('part_made_up')).toBeUndefined();
    expect(learnEntry('rope_vang', 'xx')).toBeUndefined();
    expect(learnEntry('rope_vang', 'ru')?.text.name).toBe('оттяжка гика');
  });
});

describe('show-me links (PHASE4_SPEC 3.5, 6.8)', () => {
  const withScene = entries.filter((entry) => entry.showMe !== undefined);

  it('6. every link is canonical and keeps the viewer’s own keys out', () => {
    expect(withScene.length).toBeGreaterThan(0);
    for (const entry of withScene) {
      const query = must(entry.showMe, entry.id);
      expect(query.startsWith('?'), entry.id).toBe(true);
      const back = new URLSearchParams(serializeUrlState(parseUrlState(query, 'low')));
      for (const [key, value] of new URLSearchParams(query)) {
        expect(back.get(key), `${entry.id}: ${key}`).toBe(value);
        expect(['learn', 'detail', 'debug', 'lang'], `${entry.id}: ${key}`).not.toContain(key);
      }
    }
  });
});

/** A scene as the Show me button opens it, stepped for `seconds` (5 s unless said). */
function scene(query: string, seconds = 5) {
  let state = parseUrlState(query, 'low');
  for (let i = 0; i < seconds * 60; i++) state = reduce(state, { type: 'step', dt: 1 / 60 });
  return state;
}
const showMe = (id: string): string => must(entries.find((entry) => entry.id === id)?.showMe, id);
const between = (value: number, low: number, high: number) => {
  expect(value).toBeGreaterThanOrEqual(low);
  expect(value).toBeLessThanOrEqual(high);
};

describe('7. show-me scenes show what their text says', () => {
  it('rope_mainsheet: the boom is out, and in at ms=0', () => {
    const out = scene(showMe('rope_mainsheet'));
    between(Math.abs(out.rig.theta.value), 44, 54);
    const inn = scene(showMe('rope_mainsheet').replace('ms=60', 'ms=0'));
    expect(Math.abs(inn.rig.theta.value)).toBeLessThan(2);
  });

  it('rope_jib_sheet: about 30° out, and about 14° with the sheet in', () => {
    between(Math.abs(scene(showMe('rope_jib_sheet')).rig.jibSolution.headingDeg), 29, 33);
    const inn = scene(showMe('rope_jib_sheet').replace('js=100', 'js=0'));
    between(Math.abs(inn.rig.jibSolution.headingDeg), 12, 16);
  });

  it('rope_vang: the boom end lifts when the vang is eased', () => {
    expect(scene(showMe('rope_vang')).rig.psi.value).toBeGreaterThanOrEqual(8);
    expect(scene(showMe('rope_vang').replace('vg=100', 'vg=0')).rig.psi.value).toBeLessThanOrEqual(
      0,
    );
  });

  it('rope_topping_lift: the two ropes fight', () => {
    const { solution } = scene(showMe('rope_topping_lift')).rig;
    expect(solution.vang.state).toBe('fighting');
    expect(solution.toppingLift.state).toBe('fighting');
  });

  it('rope_jib_furling_line: the jib is 40 % out', () => {
    between(scene(showMe('rope_jib_furling_line')).rig.jibSolution.unfurled, 0.38, 0.42);
  });

  it('sail_main: she sails at about 7 kn', () => {
    between(mpsToKn(scene(showMe('sail_main'), 10).boat.speedMps), 6.8, 7.8);
  });

  it('sail_jib: the car is on the lee side, and crosses with the wind', () => {
    expect(scene(showMe('sail_jib')).rig.jibSolution.side).toBe(-1);
    expect(scene(showMe('sail_jib').replace('wd=30', 'wd=-30')).rig.jibSolution.side).toBe(1);
  });
});

describe('M21 scenes (PHASE4_SPEC 7.6)', () => {
  it('env_boom_danger_zone: the faint outline at about 4 s, the boom’s sweep at about 6.5 s', () => {
    let state = parseUrlState(showMe('env_boom_danger_zone'), 'low');
    const first: Record<string, number> = {};
    for (let i = 1; i <= 8 * 60; i++) {
      state = reduce(state, { type: 'step', dt: 1 / 60 });
      const kind = dangerZone(state.rig)?.kind;
      if (kind && !(kind in first)) first[kind] = i / 60;
    }
    between(first.risk ?? -1, 4.0, 4.2);
    between(first.sweep ?? -1, 6.0, 7.0);
  });

  it('part_rudder: the wheel is at 25°', () => {
    expect(scene(showMe('part_rudder')).rig.applied.rudder).toBe(25);
  });

  it('engine_control: after 30 s she motors at about 8 kn and 1,850 rpm', () => {
    const state = scene(showMe('engine_control'), 30);
    between(mpsToKn(state.boat.speedMps), 7.6, 8.2);
    between(state.engine.rpm, 1800, 1900);
  });

  it('env_water: the waves are about 2.04 m high', () => {
    between(significantHeightM(waveTrains(scene(showMe('env_water')).sea)), 2.03, 2.04);
  });

  it('fit_self_tacking_track: the car is on the lee side', () => {
    expect(scene(showMe('fit_self_tacking_track')).rig.jibSolution.side).toBe(-1);
  });
});

describe('groups (PHASE4_SPEC 7.2, 7.6)', () => {
  it('every entry is in exactly one group, from GROUPS', () => {
    for (const entry of entries as { id: string; group?: string }[]) {
      expect(GROUPS as readonly string[], entry.id).toContain(entry.group);
    }
  });

  it('the groups have the expected sizes and members', () => {
    expect(GROUPS.map((group) => groupEntries(group).length)).toEqual([
      9, 10, 13, 6, 12, 18, 3, 4, 20, 3,
    ]);
    const samples: Record<string, string> = {
      rope_vang: 'ropes',
      part_telltale: 'sails',
      part_mast: 'rig',
      part_keel: 'hull',
      part_deck: 'deck',
      fit_winch: 'cockpit',
      env_wind: 'wind',
      term_port: 'directions',
      term_gybe: 'sailing',
      env_water: 'sea',
    };
    for (const [id, group] of Object.entries(samples)) {
      expect(groupEntries(group as (typeof GROUPS)[number]), id).toContain(id);
    }
  });
});

describe('11. NOT_DRAWN lists exactly the ids that no mesh or rope carries', () => {
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? files(path) : [path];
    });
  // glossary.ts itself lists the NOT_DRAWN ids.
  const text = [...files('src'), ...files('content/boat')]
    .filter((path) => !path.endsWith(join('model', 'glossary.ts')))
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');

  it('every listed id is a registry id', () => {
    for (const id of NOT_DRAWN) expect(REGISTRY_IDS, id).toContain(id);
  });

  it('every other id that is not a word appears in the code or the boat data; no listed id does', () => {
    for (const entry of entries) {
      if (entry.kind === 'term') continue;
      const found = text.includes(`'${entry.id}'`) || text.includes(`"${entry.id}"`);
      expect(found, entry.id).toBe(!NOT_DRAWN.has(entry.id));
    }
  });
});
