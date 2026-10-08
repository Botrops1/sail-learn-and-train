import registry from '../../content/registry/parts.json';

/** Every id the app may attach to a mesh, rope or control (content/registry/parts.json). */
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
