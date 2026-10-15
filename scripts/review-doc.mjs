// M24: the review document for a sailor who reads one language (PHASE4_SPEC 10.2).
// `node scripts/review-doc.mjs ru` (or `npm run review-doc -- ru`) writes docs/review/<code>.md.
// `buildReviewDoc(code)` returns the Markdown text; tests/glossary.test.ts checks that the
// committed file is up to date. Reads the JSON files directly (no build); the output has no date.
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** GitHub shows Markdown files larger than this as raw text. */
const MAX_BYTES = 450 * 1024;
const SOURCE_LANGUAGE = 'en';

/**
 * The fixed wording of each review document, by language code. A later language adds its own
 * entry here (docs/LANGUAGES.md); the rest of this file does not change.
 */
const WORDING = {
  ru: {
    title: '# Проверка русского текста',
    intro:
      'Это черновой перевод, сделанный ИИ. Пожалуйста, проверьте названия, другие названия (варианты) и тексты. Для каждой записи напишите «ок» или как правильно, указав её код (например: term_north — ок). Особенно важно: принятые на яхтах русские термины и слова голландского происхождения.',
    field: 'Поле',
    english: 'English',
    translated: 'Русский',
    rows: {
      name: 'Название',
      alternatives: 'Другие названия',
      short: 'Коротко',
      what: 'Что делает / что значит',
      onThisBoat: 'На этой яхте',
      mistakes: 'Типичные ошибки',
      showMe: '«Покажи»',
      factStatus: 'Достоверность',
      textStatus: 'Статус текста',
      check: 'Проверка (ок / как правильно)',
    },
    textStatuses: { draft: 'черновик', 'sailor-reviewed': 'проверен моряком' },
    uiHeading: '## Кнопки и подсказки',
    uiKey: 'key',
  },
};

const NONE = '—';

const readJson = (relative) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf8'));

/** One table cell: `|` is escaped and line breaks become `<br>`. */
const cell = (text) => String(text).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');

const empty = (value) => value === undefined || value === null || value === '';

/** The text of a string field, or NONE when it is missing. */
const textCell = (value) => (empty(value) ? NONE : cell(value));

const alternativesCell = (alternatives) =>
  !alternatives || alternatives.length === 0
    ? NONE
    : alternatives
        .map((alt) => cell(alt.note ? `${alt.term} — ${alt.note}` : alt.term))
        .join('<br>');

const mistakesCell = (mistakes) =>
  !mistakes || mistakes.length === 0
    ? NONE
    : mistakes.map((item) => `${cell(item.mistake)} → ${cell(item.fix)}`).join('<br>');

/** A value that is only white space is written as its code point. */
const uiCell = (value) => {
  if (value === undefined) return NONE;
  if (value.trim() === '') {
    return [...value]
      .map((char) => `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`)
      .join(' ');
  }
  return cell(value);
};

export function buildReviewDoc(code) {
  const wording = WORDING[code];
  if (!wording) {
    throw new Error(`no review wording for ${code}; add one to scripts/review-doc.mjs`);
  }
  const registry = readJson('content/registry/parts.json');
  const source = readJson(`content/lang/${SOURCE_LANGUAGE}/glossary.json`).entries;
  const target = readJson(`content/lang/${code}/glossary.json`).entries;
  const sourceUi = readJson(`content/lang/${SOURCE_LANGUAGE}/ui.json`);
  const targetUi = readJson(`content/lang/${code}/ui.json`);

  // The groups, in the Learn list's order (the order of the `learn.group.*` strings, which
  // tests/glossary.test.ts pins to GROUPS).
  const groups = Object.keys(targetUi)
    .filter((key) => key.startsWith('learn.group.'))
    .map((key) => key.slice('learn.group.'.length));

  const lines = [wording.title, '', wording.intro, ''];
  const header = [
    `| ${wording.field} | ${wording.english} | ${wording.translated} |`,
    '|---|---|---|',
  ];

  for (const group of groups) {
    const label = targetUi[`learn.group.${group}`].replace(/\s*\(?\{count\}\)?/, '').trim();
    lines.push(`## ${label}`, '');
    const entries = registry.entries
      .filter((entry) => entry.group === group)
      .map((entry) => ({ entry, text: target[entry.id] }))
      .sort((a, b) => (a.text?.name ?? '').localeCompare(b.text?.name ?? '', code));
    for (const { entry, text } of entries) {
      const id = entry.id;
      const en = source[id];
      if (!text) throw new Error(`${id}: no ${code} entry`);
      if (!en) throw new Error(`${id}: no ${SOURCE_LANGUAGE} entry`);
      for (const field of ['name', 'short', 'what', 'onThisBoat', 'showMe']) {
        if (!empty(en[field]) && empty(text[field])) {
          throw new Error(`${id}: ${code} lacks the field ${field}`);
        }
      }
      // Alternatives are each language's own traditional terms (owner, PHASE4_SPEC 12): an
      // empty list is a valid answer, so only the mistakes are required here.
      if ((en.mistakes?.length ?? 0) > 0 && (text.mistakes?.length ?? 0) === 0) {
        throw new Error(`${id}: ${code} lacks the field mistakes`);
      }
      const status = (ui, key) => ui[`learn.status.${key}`];
      const rows = [
        [wording.rows.name, textCell(en.name), textCell(text.name)],
        [
          wording.rows.alternatives,
          alternativesCell(en.alternatives),
          alternativesCell(text.alternatives),
        ],
        [wording.rows.short, textCell(en.short), textCell(text.short)],
        [wording.rows.what, textCell(en.what), textCell(text.what)],
        [wording.rows.onThisBoat, textCell(en.onThisBoat), textCell(text.onThisBoat)],
        [wording.rows.mistakes, mistakesCell(en.mistakes), mistakesCell(text.mistakes)],
        [wording.rows.showMe, textCell(en.showMe), textCell(text.showMe)],
        [
          wording.rows.factStatus,
          textCell(status(sourceUi, entry.status)),
          textCell(status(targetUi, entry.status)),
        ],
        [wording.rows.textStatus, NONE, textCell(wording.textStatuses[text.textStatus])],
        [wording.rows.check, '', ''],
      ];
      lines.push(`### ${cell(text.name)} (\`${id}\`)`, '', ...header);
      for (const [field, left, right] of rows) lines.push(`| ${field} | ${left} | ${right} |`);
      lines.push('');
    }
  }

  lines.push(
    wording.uiHeading,
    '',
    `| ${wording.uiKey} | ${wording.english} | ${wording.translated} |`,
    '|---|---|---|',
  );
  for (const key of Object.keys(targetUi)) {
    lines.push(`| ${cell(key)} | ${uiCell(sourceUi[key])} | ${uiCell(targetUi[key])} |`);
  }
  lines.push('');

  const text = lines.join('\n');
  const bytes = Buffer.byteLength(text, 'utf8');
  if (bytes > MAX_BYTES) {
    throw new Error(`the review document is ${bytes} bytes, more than ${MAX_BYTES}`);
  }
  return text;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const code = process.argv[2];
  try {
    if (!code) throw new Error('usage: node scripts/review-doc.mjs <code>');
    const text = buildReviewDoc(code);
    const folder = new URL('../docs/review/', import.meta.url);
    await mkdir(folder, { recursive: true });
    await writeFile(new URL(`${code}.md`, folder), text);
    console.log(`docs/review/${code}.md written (${Buffer.byteLength(text, 'utf8')} bytes)`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
