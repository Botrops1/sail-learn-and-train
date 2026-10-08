import registry from '../../content/registry/parts.json';

/** Every id the app may attach to a mesh or rope (content/registry/parts.json). */
const KNOWN_IDS: ReadonlySet<string> = new Set(registry.entries.map((entry) => entry.id));

export function isRegisteredPartId(id: string): boolean {
  return KNOWN_IDS.has(id);
}

/**
 * Returns the id unchanged if it is in the registry, otherwise throws.
 * Use it wherever an id is attached to something, so an invented id fails loudly.
 */
export function requirePartId(id: string): string {
  if (!KNOWN_IDS.has(id)) {
    throw new Error(`Unknown part id "${id}": add it to content/registry/parts.json first.`);
  }
  return id;
}

/** What the tap-to-identify card shows for a part (PHASE1_SPEC 3, item 9). */
export interface PartInfo {
  id: string;
  /** Canonical name in the requested language. */
  name: string;
  /** Labels exactly as written on the boat (may be empty). */
  boatLabels: string[];
  /** One-line explanation in the requested language. */
  short: string;
}

type Entry = (typeof registry.entries)[number];

function pick(texts: Partial<Record<string, string>> | undefined, language: string): string {
  return texts?.[language] ?? texts?.en ?? '';
}

/** Name, boat label and one-liner for a registered id, by language code (Phase 1: 'en'). */
export function partInfo(id: string, language = 'en'): PartInfo | undefined {
  const entry: Entry | undefined = registry.entries.find((candidate) => candidate.id === id);
  if (!entry) return undefined;
  const labels = 'boatLabel' in entry ? entry.boatLabel : undefined;
  return {
    id,
    name: pick(entry.names, language),
    boatLabels: Array.isArray(labels) ? [...labels] : [],
    short: pick('short' in entry ? entry.short : undefined, language),
  };
}
