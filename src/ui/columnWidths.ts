/**
 * Widths of the two panel columns on the wide layout (M39, issue #89; PHASE5_SPEC 17): pure
 * rules, so the limits and the saved text are tested without a browser. A collapsed column keeps
 * nothing (its chip over the 3D view opens it again); the 3D view always keeps at least
 * `VIEW_MIN_PX`.
 */

/** A column cannot be dragged narrower or wider than this, px. */
export const COLUMN_MIN_PX = 300;
export const COLUMN_MAX_PX = 560;
/** The 3D view keeps at least this much of the window, px. */
export const VIEW_MIN_PX = 480;
/** The widths before anything was dragged: they add up to the 760 px of M29. */
export const COLUMN_DEFAULT_PX: readonly [number, number] = [400, 360];
/** Where the widths and the folds are remembered on this device (not in the link). */
export const COLUMNS_KEY = 'sail-learn.columns';
/** One arrow key press, and with Shift, px. */
export const COLUMN_KEY_STEP_PX = 16;
export const COLUMN_KEY_BIG_STEP_PX = 64;

export interface ColumnState {
  /** The widths the owner chose (kept while a column is collapsed). */
  widths: [number, number];
  collapsed: [boolean, boolean];
}

export function defaultColumns(): ColumnState {
  return {
    widths: [COLUMN_DEFAULT_PX[0], COLUMN_DEFAULT_PX[1]],
    collapsed: [false, false],
  };
}

const limit = (value: number): number => Math.min(COLUMN_MAX_PX, Math.max(COLUMN_MIN_PX, value));

/**
 * What each column takes now: its chosen width within the limits, or nothing when collapsed.
 * When the window leaves less than `VIEW_MIN_PX` for the 3D view, the second column gives way
 * first, then the first, never below the minimum (the saved widths are not changed).
 */
export function effectiveWidths(state: ColumnState, windowWidth: number): [number, number] {
  const widths: [number, number] = [
    state.collapsed[0] ? 0 : limit(state.widths[0]),
    state.collapsed[1] ? 0 : limit(state.widths[1]),
  ];
  let excess = widths[0] + widths[1] - Math.max(0, windowWidth - VIEW_MIN_PX);
  for (const index of [1, 0] as const) {
    if (excess <= 0 || state.collapsed[index]) continue;
    const cut = Math.min(excess, widths[index] - COLUMN_MIN_PX);
    widths[index] -= cut;
    excess -= cut;
  }
  return widths;
}

/** The widest a column can be dragged now, given the other column's width, px. */
export function maxColumnWidth(windowWidth: number, otherWidth: number): number {
  return Math.max(COLUMN_MIN_PX, Math.min(COLUMN_MAX_PX, windowWidth - VIEW_MIN_PX - otherWidth));
}

/** A dragged or typed width, held to the limits and to what the window leaves, whole pixels. */
export function clampColumnWidth(width: number, windowWidth: number, otherWidth: number): number {
  if (!Number.isFinite(width)) return COLUMN_MIN_PX;
  return Math.round(
    Math.min(maxColumnWidth(windowWidth, otherWidth), Math.max(COLUMN_MIN_PX, width)),
  );
}

export function serializeColumns(state: ColumnState): string {
  return JSON.stringify({ w: state.widths, c: state.collapsed.map((c) => (c ? 1 : 0)) });
}

/** Reads the saved text; anything unreadable gives the defaults (a stored value is never trusted). */
export function parseColumns(raw: string | null): ColumnState {
  const state = defaultColumns();
  if (!raw) return state;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return state;
    const { w, c } = data as { w?: unknown; c?: unknown };
    for (const index of [0, 1] as const) {
      const width = Array.isArray(w) ? (w as unknown[])[index] : undefined;
      if (typeof width === 'number' && Number.isFinite(width)) state.widths[index] = limit(width);
      const flag = Array.isArray(c) ? (c as unknown[])[index] : undefined;
      state.collapsed[index] = flag === 1 || flag === true;
    }
  } catch {
    return defaultColumns();
  }
  return state;
}
