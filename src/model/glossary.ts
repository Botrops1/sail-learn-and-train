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

/** The Learn list's groups, in the list's order (PHASE4_SPEC 7.2). Every registry entry has exactly one. */
export const GROUPS = [
  'ropes',
  'sails',
  'rig',
  'hull',
  'deck',
  'cockpit',
  'wind',
  'directions',
  'sailing',
  'sea',
] as const;
export type GroupId = (typeof GROUPS)[number];

/** Lower case, accents and other marks removed (NFD, then drop \p{M}), hyphens and dashes as spaces, runs of spaces as one, trimmed. ё → е and й → и follow from dropping the marks. */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[-‐‑‒–—―_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface SearchHit {
  id: string;
  /** The entry's name in the language. */
  name: string;
  /** What matched when it was not the name: an alternative's term or a boat label, as written; null when the name matched. */
  matched: string | null;
}

/** Entries whose name, alternatives (same language only) or boat labels contain the query. Empty query → []. */
export function searchGlossary(query: string, language: string = SOURCE_LANGUAGE): SearchHit[] {
  const q = normalizeSearch(query);
  if (q === '') return [];
  const entries = GLOSSARIES[language]?.entries ?? {};
  const hits: { hit: SearchHit; rank: number }[] = [];
  for (const entry of registry.entries) {
    const text = entries[entry.id];
    if (!text) continue;
    const name = normalizeSearch(text.name);
    let rank = -1;
    let matched: string | null = null;
    if (name.startsWith(q)) rank = 0;
    else if (name.includes(q)) rank = 1;
    else {
      const alternative = text.alternatives.find((alt) => normalizeSearch(alt.term).includes(q));
      if (alternative) {
        rank = 2;
        matched = alternative.term;
      } else {
        const label = boatLabelsFor(entry.id).find((l) => normalizeSearch(l).includes(q));
        if (label !== undefined) {
          rank = 3;
          matched = label;
        }
      }
    }
    if (rank >= 0) hits.push({ hit: { id: entry.id, name: text.name, matched }, rank });
  }
  hits.sort((a, b) => a.rank - b.rank || a.hit.name.localeCompare(b.hit.name, language));
  return hits.map((item) => item.hit);
}

const GROUP_OF: ReadonlyMap<string, string> = new Map(
  (registry.entries as { id: string; group?: string }[]).flatMap((entry) =>
    entry.group ? [[entry.id, entry.group] as const] : [],
  ),
);

/** The ids of a group, sorted by their name in the language (localeCompare with the language code). */
export function groupEntries(group: GroupId, language: string = SOURCE_LANGUAGE): string[] {
  const nameOf = (id: string): string => glossaryText(id, language)?.name ?? id;
  return registry.entries
    .map((entry) => entry.id)
    .filter((id) => GROUP_OF.get(id) === group)
    .sort((a, b) => nameOf(a).localeCompare(nameOf(b), language));
}
