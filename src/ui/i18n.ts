import en from '../../content/i18n/en.json';

export type StringKey = keyof typeof en;
export type Language = 'en';

const STRINGS: Record<Language, Record<StringKey, string>> = { en };

let language: Language = 'en';

export function setLanguage(next: Language): void {
  language = next;
}

/** Looks up a UI string and fills `{name}` placeholders. Phase 1 ships English only. */
export function t(key: StringKey, params: Record<string, string | number> = {}): string {
  const template = STRINGS[language][key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
