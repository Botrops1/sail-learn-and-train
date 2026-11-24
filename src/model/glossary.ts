import registry from '../../content/registry/parts.json';
import { boatLabelsFor } from './boatLabels';
import { HANSE_508, boatId, builtInBoat } from './boat';

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

type RegistryEntry = (typeof registry.entries)[number] & {
  controls?: string[];
  related?: string[];
  showMe?: string;
  boats?: string[];
};

const ENTRIES: ReadonlyMap<string, RegistryEntry> = new Map(
  (registry.entries as RegistryEntry[]).map((entry) => [entry.id, entry]),
);

/** Whether a registry id is on a boat (M117): its `boats` list, and every boat when it has none. */
export function partOnBoat(id: string, onBoatId: string): boolean {
  const boats = ENTRIES.get(id)?.boats;
  return boats === undefined || boats.includes(onBoatId);
}

/**
 * The text of one entry in one language; undefined if that language or entry is missing (no
 * fallback). The boat in use may have its own text for the entry (`<id>@<boatId>`, M117), which
 * replaces the whole entry. On a built-in boat other than the Hanse 508, an entry without one has
 * no "On this boat" block: its Hanse text would be wrong there.
 */
export function glossaryText(
  id: string,
  language: string = SOURCE_LANGUAGE,
): GlossaryText | undefined {
  const entries = GLOSSARIES[language]?.entries;
  const own = entries?.[`${id}@${boatId}`];
  if (own) return own;
  const text = entries?.[id];
  if (text?.onThisBoat === undefined || boatId === HANSE_508.meta.id || !builtInBoat(boatId)) {
    return text;
  }
  const withoutHanseText = { ...text };
  delete withoutHanseText.onThisBoat;
  return withoutHanseText;
}

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

/** The entry of an id on the boat in use; undefined for an id that is not on it (M117). Controls and related ids not on the boat are left out. */
export function learnEntry(id: string, language: string = SOURCE_LANGUAGE): LearnEntry | undefined {
  const entry = ENTRIES.get(id);
  const text = glossaryText(id, language);
  if (!entry || !text || !partOnBoat(id, boatId)) return undefined;
  return {
    id,
    kind: entry.kind,
    status: entry.status as FactStatus,
    sources: [...entry.sources],
    boatLabels: boatLabelsFor(id),
    controls: (entry.controls ?? []).filter((other) => partOnBoat(other, boatId)),
    related: (entry.related ?? []).filter((other) => partOnBoat(other, boatId)),
    showMeQuery: entry.showMe ?? null,
    text,
  };
}

/** Ids that no mesh or rope carries: there is nothing to light up for "Show on the boat". */
export const NOT_DRAWN: ReadonlySet<string> = new Set([
  'sailpart_head',
  'sailpart_tack',
  'sailpart_clew',
  'sailpart_luff',
  'sailpart_leech',
  'sailpart_foot',
  'fit_clutch',
  'fit_winch',
]);

/** Drawn, but too far away for "Where is it?" to fly to (the entry's Show it working shows it instead). */
export const FAR_AWAY: ReadonlySet<string> = new Set(['env_distant_land']);

/** Ids drawn only inside a picture (M109): Learn hides "Where is it?" for them; Show it working shows the picture. */
export const PICTURE_ONLY: ReadonlySet<string> = new Set([
  'sail_spinnaker',
  'part_spinnaker_pole',
  'rope_spinnaker_sheet',
  'rope_spinnaker_guy',
  'rope_pole_lift',
  'rope_pole_downhaul',
  'sail_code_zero',
  'part_code_zero_furler',
  'rope_code_zero_sheet',
  'part_traveller_track',
  'part_traveller_car',
  'rope_traveller_mainsheet',
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
  'harbour',
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
  const hits: { hit: SearchHit; rank: number }[] = [];
  for (const entry of registry.entries) {
    const text = glossaryText(entry.id, language);
    if (!text || !partOnBoat(entry.id, boatId)) continue;
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

/** The ids of a group on the boat in use, sorted by their name in the language (localeCompare with the language code). */
export function groupEntries(group: GroupId, language: string = SOURCE_LANGUAGE): string[] {
  const nameOf = (id: string): string => glossaryText(id, language)?.name ?? id;
  return registry.entries
    .map((entry) => entry.id)
    .filter((id) => GROUP_OF.get(id) === group && partOnBoat(id, boatId))
    .sort((a, b) => nameOf(a).localeCompare(nameOf(b), language));
}
