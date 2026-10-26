import { SECTION_IDS, type SectionId } from './modes';

/** M54 (issue #110): which of the two columns of the wide layout holds each section, top to bottom. */
export type WideSectionId = Exclude<SectionId, 'mode' | 'settings'>;
export interface SectionLayout {
  columns: [WideSectionId[], WideSectionId[]];
}
/** What parseLayout reads: ids not yet checked. */
export interface RawLayout {
  columns: [string[], string[]];
}

/** Where the arrangement is remembered on this device (not in the link). */
export const LAYOUT_KEY = 'sail-learn.layout';

/** The first-time arrangement (the Easy mode's columns before M54). */
export const DEFAULT_WIDE_LAYOUT: SectionLayout = {
  columns: [
    ['ropes', 'helm', 'sails', 'autopilot', 'engine', 'place', 'anchor', 'harbour', 'status'],
    ['conditions', 'learn'],
  ],
};

const WIDE_IDS: readonly WideSectionId[] = SECTION_IDS.filter(
  (id): id is WideSectionId => id !== 'mode' && id !== 'settings',
);

function isWideId(id: string): id is WideSectionId {
  return (WIDE_IDS as readonly string[]).includes(id);
}

/**
 * Every wide section exactly once: unknown and repeated ids dropped (first kept), missing ones
 * added at the end of the column DEFAULT_WIDE_LAYOUT puts them in. Always returns new arrays.
 */
export function completeLayout(layout: RawLayout | SectionLayout | null): SectionLayout {
  const result: SectionLayout = { columns: [[], []] };
  const seen = new Set<string>();
  for (const column of [0, 1] as const) {
    for (const id of layout?.columns[column] ?? []) {
      if (isWideId(id) && !seen.has(id)) {
        seen.add(id);
        result.columns[column].push(id);
      }
    }
  }
  for (const column of [0, 1] as const) {
    for (const id of DEFAULT_WIDE_LAYOUT.columns[column]) {
      if (!seen.has(id)) {
        seen.add(id);
        result.columns[column].push(id);
      }
    }
  }
  return result;
}

/** Takes `id` out and puts it at `index` (0…length, clamped) of `column`, counted after taking it out. */
export function moveSection(
  layout: SectionLayout,
  id: WideSectionId,
  column: 0 | 1,
  index: number,
): SectionLayout {
  const columns: SectionLayout['columns'] = [
    layout.columns[0].filter((other) => other !== id),
    layout.columns[1].filter((other) => other !== id),
  ];
  const target = columns[column];
  const at = Math.max(0, Math.min(target.length, Math.trunc(index)));
  target.splice(at, 0, id);
  return { columns };
}

/**
 * The array index in `column` (with `id` already taken out) for visible position `visiblePos`
 * among `visibleIds` (the column's visible ids, without `id`).
 */
export function layoutIndex(
  column: readonly WideSectionId[],
  visibleIds: readonly WideSectionId[],
  visiblePos: number,
): number {
  const before = visibleIds[visiblePos];
  return before === undefined ? column.length : column.indexOf(before);
}

/** `{"v":1,"c":[[…],[…]]}`. */
export function serializeLayout(layout: SectionLayout): string {
  return JSON.stringify({ v: 1, c: layout.columns });
}

/** Null unless the text is JSON `{ v: 1, c: [array, array] }` with exactly two arrays whose members are all strings. */
export function parseLayout(raw: string | null): RawLayout | null {
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const { v, c } = value as { v?: unknown; c?: unknown };
  if (v !== 1 || !Array.isArray(c) || c.length !== 2) return null;
  const [first, second] = c as unknown[];
  const strings = (list: unknown): list is string[] =>
    Array.isArray(list) && list.every((item) => typeof item === 'string');
  if (!strings(first) || !strings(second)) return null;
  return { columns: [first, second] };
}
