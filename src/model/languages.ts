import registry from '../../content/registry/parts.json';
import latinWords from '../../content/lang/latin-words.json';
import { boatLabelsFor } from './boatLabels';
import { GLOSSARIES } from './glossary';

/**
 * The app's languages (PHASE4_SPEC 9.3). A language is a folder `content/lang/<code>/` with
 * `ui.json` and `glossary.json`; both are found without a list, so a new folder needs no code.
 * Pure data: no DOM, no three.js.
 */
const files = import.meta.glob<Record<string, string>>('../../content/lang/*/ui.json', {
  eager: true,
  import: 'default',
});

/** content/lang/<code>/ui.json, by code (the folder name). */
export const UI_STRINGS: Readonly<Record<string, Readonly<Record<string, string>>>> =
  Object.fromEntries(
    Object.entries(files).map(([path, strings]) => {
      const code = /lang\/([^/]+)\/ui\.json$/.exec(path)?.[1] ?? path;
      return [code, strings];
    }),
  );

export const DEFAULT_LANGUAGE = 'en';

/** Codes that have both ui.json and glossary.json: 'en' first, then the others sorted. */
export const LANGUAGES: readonly string[] = Object.keys(UI_STRINGS)
  .filter((code) => code in GLOSSARIES)
  .sort((a, b) => (a === DEFAULT_LANGUAGE ? -1 : b === DEFAULT_LANGUAGE ? 1 : a.localeCompare(b)));

export function isLanguage(code: string): boolean {
  return LANGUAGES.includes(code);
}

/** A language's own name (its ui.json "language.name"). */
export function languageName(code: string): string {
  return UI_STRINGS[code]?.['language.name'] ?? code;
}

/**
 * Latin words allowed on a screen in a language with another script: `latin-words.json` plus every
 * word of every label printed on the boat (`boatLabelsFor`). Lower case, to compare ignoring case.
 */
export function latinAllowed(): ReadonlySet<string> {
  const allowed = new Set<string>(latinWords.words.map((word) => word.toLowerCase()));
  for (const entry of registry.entries) {
    for (const label of boatLabelsFor(entry.id)) {
      for (const word of label.match(/[A-Za-zÀ-ÿ&]+/g) ?? []) allowed.add(word.toLowerCase());
    }
  }
  return allowed;
}
