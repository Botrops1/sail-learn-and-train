import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import registry from '../content/registry/parts.json';

/** M100: the English text says "line" for the boat's ropes, "trim" for sheets, "ease" instead of "let out". */

const read = (file: string): unknown =>
  JSON.parse(readFileSync(new URL(`../content/lang/en/${file}.json`, import.meta.url), 'utf8'));

/** Every string a learner reads: skips `$comment`, `$status`, `alternatives` and the `term_line` entry. Round brackets and {placeholders} (code names such as {rope}) are removed. */
function readableStrings(): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [];
  const walk = (value: unknown, path: string, file: string): void => {
    if (typeof value === 'string') {
      out.push({
        path: `${file}:${path}`,
        text: value.replace(/\([^)]*\)/g, '').replace(/\{[^}]*\}/g, ''),
      });
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => walk(v, `${path}[${i}]`, file));
    } else if (value && typeof value === 'object') {
      for (const [key, v] of Object.entries(value)) {
        if (
          key === '$comment' ||
          key === '$status' ||
          key === 'alternatives' ||
          key === 'term_line'
        )
          continue;
        walk(v, path ? `${path}.${key}` : key, file);
      }
    }
  };
  walk(read('ui'), '', 'ui');
  walk((read('glossary') as { entries: unknown }).entries, 'entries', 'glossary');
  walk(read('exercises'), '', 'exercises');
  return out;
}

const strings = readableStrings();

describe('M100 sailor words', () => {
  it('M100 no "rope" in English text', () => {
    const hits = strings.filter((s) => /\bropes?\b/i.test(s.text)).map((s) => s.path);
    expect(hits).toEqual([]);
  });

  it('M100 no "haul" / "let out" in English text', () => {
    const haul = /(?<![-\w])haul(s|ed|ing)?\b/i;
    const letOut = /\blet(s|ting)?\s+(it\s+|them\s+)?out\b/i;
    const hits = strings.filter((s) => haul.test(s.text) || letOut.test(s.text)).map((s) => s.path);
    expect(hits).toEqual([]);
  });

  it('M100 new terms exist in the registry (draft) and in every glossary', () => {
    const entries = registry.entries as { id: string; status: string }[];
    for (const id of ['term_line', 'term_cunningham']) {
      const entry = entries.find((e) => e.id === id);
      expect(entry, id).toBeDefined();
      expect(entry?.status, id).toBe('draft');
      for (const lang of ['en', 'de', 'no', 'ru']) {
        const glossary = JSON.parse(
          readFileSync(new URL(`../content/lang/${lang}/glossary.json`, import.meta.url), 'utf8'),
        ) as { entries: Record<string, { name: string; textStatus?: string }> };
        expect(glossary.entries[id]?.name, `${lang} ${id}`).toBeTruthy();
        expect(glossary.entries[id]?.textStatus, `${lang} ${id}`).toBe('draft');
      }
    }
  });
});
