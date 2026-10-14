import registry from '../../content/registry/parts.json';
import { boatLabelsFor } from './boatLabels';

/** The facts' status (one per entry, language-neutral) and the text's (one per entry and language). */
export type FactStatus = 'draft' | 'source-checked' | 'photo-confirmed' | 'sailor-reviewed';
export type TextStatus = 'draft' | 'sailor-reviewed';
export interface Alternative {
  term: string;
  note?: string;
}
export interface Mistake {
  mistake: string;
  fix: string;
}
export interface GlossaryText {
  name: string;
  alternatives: Alternative[];
  short?: string;
  what?: string;
  onThisBoat?: string;
  mistakes?: Mistake[];
  showMe?: string;
  textStatus: TextStatus;
}
export interface GlossaryFile {
  language: string;
  entries: Record<string, GlossaryText>;
}

export const SOURCE_LANGUAGE = 'en';

const files = import.meta.glob<GlossaryFile>('../../content/lang/*/glossary.json', {
  eager: true,
  import: 'default',
});

/** Every content/lang/<code>/glossary.json, by code (the folder name). A new folder needs no code. */
export const GLOSSARIES: Readonly<Record<string, GlossaryFile>> = Object.fromEntries(
  Object.entries(files).flatMap(([path, file]) => {
    const code = /lang\/([^/]+)\/glossary\.json$/.exec(path)?.[1];
    return code ? [[code, file] as const] : [];
  }),
);

/** The text of one entry in one language; undefined if that language or entry is missing (no fallback). */
export function glossaryText(
  id: string,
  language: string = SOURCE_LANGUAGE,
): GlossaryText | undefined {
  return GLOSSARIES[language]?.entries[id];
}

type RegistryEntry = (typeof registry.entries)[number] & {
  controls?: string[];
  related?: string[];
  showMe?: string;
};

const ENTRIES: ReadonlyMap<string, RegistryEntry> = new Map(
  (registry.entries as RegistryEntry[]).map((entry) => [entry.id, entry]),
);

/** Everything the Learn tab shows for an entry: registry facts plus the text in one language. */
export interface LearnEntry {
  id: string;
  kind: string;
  status: FactStatus;
  sources: string[];
  boatLabels: string[];
  controls: string[];
  related: string[];
  showMeQuery: string | null;
  text: GlossaryText;
}

export function learnEntry(id: string, language: string = SOURCE_LANGUAGE): LearnEntry | undefined {
  const entry = ENTRIES.get(id);
  const text = glossaryText(id, language);
  if (!entry || !text) return undefined;
  return {
    id,
    kind: entry.kind,
    status: entry.status as FactStatus,
    sources: [...entry.sources],
    boatLabels: boatLabelsFor(id),
    controls: [...(entry.controls ?? [])],
    related: [...(entry.related ?? [])],
    showMeQuery: entry.showMe ?? null,
    text,
  };
}

/** Ids that no mesh or rope carries: there is nothing to light up for "Show on the boat". */
export const NOT_DRAWN: ReadonlySet<string> = new Set([
  'sail_gennaker',
  'sailpart_head',
  'sailpart_tack',
  'sailpart_clew',
  'sailpart_luff',
  'sailpart_leech',
  'sailpart_foot',
  'fit_clutch',
  'fit_winch',
  'fit_compass',
  'fit_anchor_windlass',
  'fit_bow_roller',
  'fit_mooring_cleat',
]);

export type SourceLink =
  | { kind: 'url'; href: string; text: string }
  | { kind: 'photo'; href: string; name: string }
  | { kind: 'brochure' }
  | { kind: 'owner' };

/** How the Learn tab shows a source key; undefined for a key not in `sourceKeys`. */
export function sourceLink(key: string, repoUrl: string): SourceLink | undefined {
  const value = (registry.sourceKeys as Record<string, string>)[key];
  if (value === undefined) return undefined;
  if (key === 'brochure') return { kind: 'brochure' };
  if (key === 'owner') return { kind: 'owner' };
  if (value.startsWith('http')) {
    return { kind: 'url', href: value, text: decodeURI(value.replace(/^https:\/\/(www\.)?/, '')) };
  }
  if (value.startsWith('docs/reference/photos/')) {
    return {
      kind: 'photo',
      href: `${repoUrl}/blob/main/${value}`,
      name: value.slice(value.lastIndexOf('/') + 1).replace(/\.jpg$/, ''),
    };
  }
  return undefined;
}
