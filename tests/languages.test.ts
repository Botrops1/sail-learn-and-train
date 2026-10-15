import { afterEach, describe, expect, it } from 'vitest';
import registry from '../content/registry/parts.json';
import { AREAS } from '../src/model/area';
import { GLOSSARIES, GROUPS, glossaryText, type GlossaryText } from '../src/model/glossary';
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  UI_STRINGS,
  isLanguage,
  languageName,
  latinAllowed,
} from '../src/model/languages';
import { formatThousands, part, quoted, setLanguage, t, type StringKey } from '../src/ui/i18n';
import { QUOTED_UI_LABELS } from './quotedLabels';

const PLACEHOLDER = /\{\w+\}/g;
/** Runs of two or more Latin letters (PHASE4_SPEC 9.6, test 3). */
const LATIN_RUN = /[A-Za-zÀ-ÿ&]{2,}/g;
const HAS_LATIN = /[A-Za-zÀ-ÿ]/;

const en = UI_STRINGS.en as Readonly<Record<string, string>>;
const placeholders = (text: string): string[] =>
  [...text.matchAll(PLACEHOLDER)].map((m) => m[0]).sort();

/** Every text field of a glossary entry that is shown on screen, with a label for messages. */
function glossaryFields(id: string, text: GlossaryText): [string, string][] {
  const fields: [string, string][] = [[`${id}.name`, text.name]];
  text.alternatives.forEach((alt, i) => {
    fields.push([`${id}.alternatives[${i}].term`, alt.term]);
    if (alt.note) fields.push([`${id}.alternatives[${i}].note`, alt.note]);
  });
  for (const key of ['short', 'what', 'onThisBoat', 'showMe'] as const) {
    const value = text[key];
    if (value !== undefined) fields.push([`${id}.${key}`, value]);
  }
  (text.mistakes ?? []).forEach((m, i) => {
    fields.push([`${id}.mistakes[${i}].mistake`, m.mistake], [`${id}.mistakes[${i}].fix`, m.fix]);
  });
  return fields;
}

/** UI values of a language that are not scanned or compared (the debug overlay stays English). */
const uiEntries = (code: string): [string, string][] =>
  Object.entries(UI_STRINGS[code] ?? {}).filter(([key]) => !key.startsWith('debug.'));

/** Languages whose own name has no Latin letter: the Latin scan applies to them (9.6, test 3). */
const NON_LATIN = LANGUAGES.filter((code) => !HAS_LATIN.test(languageName(code)));

/**
 * `ru` values that are identical to English on purpose (9.6, test 3), each with its reason.
 * The six of the spec, plus two the Russian strings turned out to share with English.
 */
const SAME_AS_ENGLISH: Record<string, string> = {
  'view.step.option': 'a number and a percent sign only',
  'instruments.timeScale': 'a multiplication sign and a number only',
  'instrument.aws': 'printed on the boat’s instrument display',
  'instrument.tws': 'printed on the boat’s instrument display',
  'real.gearbox.in': 'printed on the gearbox switch',
  'real.gearbox.out': 'printed on the gearbox switch',
  'clock.zone': 'only placeholders, a dot and the time-zone letters (UTC)',
  'learn.alternativeWithNote': 'only placeholders and brackets',
};

afterEach(() => setLanguage(DEFAULT_LANGUAGE));

describe('languages (PHASE4_SPEC 9.3)', () => {
  it('1. the app has English and Russian, each named in its own language', () => {
    expect([...LANGUAGES]).toEqual(['en', 'ru']);
    expect(languageName('en')).toBe('English');
    expect(languageName('ru')).toBe('Русский');
    expect(isLanguage('ru')).toBe(true);
    expect(isLanguage('xx')).toBe(false);
  });

  it('2. every language has exactly the keys of English, non-empty, with the same placeholders', () => {
    for (const code of LANGUAGES) {
      const strings = UI_STRINGS[code] ?? {};
      expect(Object.keys(strings), code).toEqual(Object.keys(en));
      for (const [key, value] of Object.entries(strings)) {
        // trim() removes U+00A0, so the thousands separator only needs a length.
        if (key === 'number.thousandsSeparator')
          expect(value.length, `${code}/${key}`).toBeGreaterThan(0);
        else expect(value.trim(), `${code}/${key}`).not.toBe('');
        expect(placeholders(value), `${code}/${key}`).toEqual(placeholders(en[key] ?? ''));
      }
    }
  });

  it('3. a language with another script shows no stray Latin words and no curly quotes', () => {
    expect(NON_LATIN).toContain('ru');
    const allowed = latinAllowed();
    for (const code of NON_LATIN) {
      const values: [string, string][] = uiEntries(code).map(([key, value]) => [
        `${code}/ui/${key}`,
        value,
      ]);
      for (const [id, text] of Object.entries(GLOSSARIES[code]?.entries ?? {})) {
        for (const [label, value] of glossaryFields(id, text))
          values.push([`${code}/${label}`, value]);
      }
      for (const [label, value] of values) {
        const plain = value.replace(PLACEHOLDER, '').normalize('NFC');
        for (const word of plain.match(LATIN_RUN) ?? []) {
          expect(
            allowed.has(word.toLowerCase()),
            `${label}: "${word}" is not in latin-words.json`,
          ).toBe(true);
        }
      }
    }
    for (const code of LANGUAGES.filter((c) => c !== DEFAULT_LANGUAGE)) {
      for (const [key, value] of uiEntries(code)) {
        expect(value, `${code}/ui/${key}`).not.toMatch(/[“”]/);
      }
      for (const [id, text] of Object.entries(GLOSSARIES[code]?.entries ?? {})) {
        for (const [label, value] of glossaryFields(id, text)) {
          expect(value, `${code}/${label}`).not.toMatch(/[“”]/);
        }
      }
    }
  });

  it('3b. Russian values equal to English are few, and each is listed with its reason', () => {
    const russian = UI_STRINGS.ru ?? {};
    const same = uiEntries('ru')
      .filter(([key, value]) => value === en[key])
      .map(([key]) => key);
    expect(same.length).toBeLessThan(20);
    expect(same.sort()).toEqual(Object.keys(SAME_AS_ENGLISH).sort());
    expect(Object.keys(russian).length).toBeGreaterThan(0);
  });

  it('4. the Russian UI uses the wording that the glossary texts quote', () => {
    for (const [key, wording] of Object.entries(QUOTED_UI_LABELS)) {
      expect(UI_STRINGS.ru?.[key], key).toContain(wording);
    }
  });

  it('5. the Learn tab’s groups, kinds, statuses and the area have strings in every language', () => {
    const kinds = new Set(registry.entries.map((entry) => entry.kind));
    const statuses = Object.keys(registry.statusValues);
    for (const code of LANGUAGES) {
      const strings = UI_STRINGS[code] ?? {};
      for (const group of GROUPS)
        expect(strings[`learn.group.${group}`], `${code}/${group}`).toBeDefined();
      for (const kind of kinds)
        expect(strings[`learn.kind.${kind}`], `${code}/${kind}`).toBeDefined();
      for (const status of statuses) {
        expect(strings[`learn.status.${status}`], `${code}/${status}`).toBeDefined();
      }
      for (const id of Object.keys(AREAS))
        expect(strings[`area.${id}`], `${code}/${id}`).toBeDefined();
    }
  });

  it('6. t() and part() follow the language; an unknown code gives English', () => {
    expect(t('tab.ropes')).toBe('Ropes');
    setLanguage('ru');
    expect(t('tab.ropes')).toBe('Концы');
    expect(t('tab.learn')).toBe('Обучение');
    expect(part('rope_vang')?.name).toBe('оттяжка гика');
    expect(quoted('Vang')).toBe('«Vang»');
    setLanguage('xx');
    expect(t('tab.ropes')).toBe('Ropes');
    expect(part('rope_vang')?.name).toBe('Vang');
    expect(quoted('Vang')).toBe('“Vang”');
  });

  it('6b. thousands use the language’s separator', () => {
    expect(formatThousands(2500)).toBe('2,500');
    expect(formatThousands(950)).toBe('950');
    expect(formatThousands(1234567)).toBe('1,234,567');
    setLanguage('ru');
    expect(formatThousands(2500)).toBe('2 500');
    expect(formatThousands(1860)).toBe('1 860');
  });

  it('6c. the date and the area name come from the strings', () => {
    setLanguage('ru');
    expect(t('clock.date', { weekday: 'среда', day: 1, month: 'июня', year: 2026 })).toBe(
      'среда, 1 июня 2026',
    );
    expect(t('area.adriatic' as StringKey)).toBe('Адриатика (Сплит)');
    expect(t('map.scale', { metres: 100 })).toBe('100 м');
  });

  it('8. the Russian names checked against the sources (9.2.1)', () => {
    const names: Record<string, [string, { term: string; note?: string }[]]> = {
      sail_gennaker: ['геннакер', [{ term: 'генакер', note: 'другое написание' }]],
      rope_spi_halyard: ['фал геннакера', [{ term: 'спинакер-фал' }]],
      rope_jib_furling_line: ['линь закрутки стакселя', []],
      rope_main_furling_line: ['линь закрутки грота', []],
      part_gooseneck: ['вертлюг гика', [{ term: 'гусёк', note: 'так тоже говорят на яхтах' }]],
      term_reef: ['взятие рифов', [{ term: 'брать рифы' }]],
      term_round_up: [
        'брочинг',
        [{ term: 'приведение', note: 'резкое неуправляемое приведение к ветру' }],
      ],
    };
    for (const [id, [name, alternatives]] of Object.entries(names)) {
      const text = glossaryText(id, 'ru');
      expect(text?.name, id).toBe(name);
      expect(text?.alternatives, id).toEqual(alternatives);
    }
    const added: Record<string, { term: string; note?: string }[]> = {
      term_close_hauled: [{ term: 'острый бейдевинд' }],
      term_beam_reach: [{ term: 'галфинд', note: 'другое написание' }, { term: 'полветра' }],
      term_run: [{ term: 'полный ветер', note: 'так говорят: «идти полным ветром»' }],
      term_gybe: [{ term: 'поворот через фордевинд' }],
      term_trim: [{ term: 'добрать', note: 'выбрать до конца' }],
      engine_control: [{ term: 'РУД', note: 'ручка управления двигателем' }],
      part_jib_furler: [
        {
          term: 'барабан закрутки',
          note: 'так называют нижнюю часть закрутки, на которую наматывается линь',
        },
      ],
    };
    for (const [id, alternatives] of Object.entries(added)) {
      const own = glossaryText(id, 'ru')?.alternatives ?? [];
      expect(own.slice(-alternatives.length), id).toEqual(alternatives);
    }
    // The old words may stay only as alternatives (the name and the texts use the new ones).
    const old = /генакер|закруточн|рифлени|гусёк/i;
    for (const [id, text] of Object.entries(GLOSSARIES.ru?.entries ?? {})) {
      for (const [label, value] of glossaryFields(id, text)) {
        if (label.includes('.alternatives[')) continue;
        expect(value, label).not.toMatch(old);
      }
    }
    for (const key of ['close_hauled', 'close_reach', 'beam_reach', 'broad_reach', 'run']) {
      const name = glossaryText(`term_${key}`, 'ru')?.name ?? '';
      expect(UI_STRINGS.ru?.[`pos.${key}`], key).toBe(name.charAt(0).toUpperCase() + name.slice(1));
    }
    expect(UI_STRINGS.ru?.['tab.view']).toBe('Вид');
    expect(UI_STRINGS.ru?.['tab.learn']).toBe('Обучение');
  });
});
