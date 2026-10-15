import en from '../../content/lang/en/ui.json';
import { DEFAULT_LANGUAGE, UI_STRINGS, isLanguage } from '../model/languages';
import { partInfo, type PartInfo } from '../model/registry';

export type StringKey = keyof typeof en;

let language = DEFAULT_LANGUAGE;

/** Sets the language for t() and part(); an unknown code gives 'en' (PHASE4_SPEC 9.3). */
export function setLanguage(code: string): void {
  language = isLanguage(code) ? code : DEFAULT_LANGUAGE;
}

export function currentLanguage(): string {
  return language;
}

/**
 * Looks up a UI string in the current language and fills `{name}` placeholders. The English string
 * is only a safety net for a missing key, which the tests rule out.
 */
export function t(key: StringKey, params: Record<string, string | number> = {}): string {
  const template = UI_STRINGS[language]?.[key] ?? en[key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** partInfo in the current language. Every UI caller uses this instead of partInfo. */
export function part(id: string): PartInfo | undefined {
  return partInfo(id, language);
}

/** Puts a name or label in the quote marks of the current language (“ ” in English, « » in Russian). */
export function quoted(text: string): string {
  return t('quote.label', { text });
}

/** A whole number with the language's thousands separator: en 2,500; ru 2 500 (no-break space). */
export function formatThousands(value: number): string {
  const separator = t('number.thousandsSeparator');
  const [sign, digits] =
    value < 0 ? ['-', String(Math.round(-value))] : ['', String(Math.round(value))];
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}
