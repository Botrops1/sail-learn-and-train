/**
 * The device's ticks and best times for the exercises (PHASE10_SPEC 6.3): kept in `localStorage`
 * (read and written in try/catch, as boatStore.ts). No scores, only a tick and the best time.
 */
export const PROGRESS_KEY = 'sail-learn.exercises';

export interface ExerciseProgress {
  v: 1;
  done: Readonly<Record<string, { bestS: number; at: string }>>;
}

const EMPTY: ExerciseProgress = { v: 1, done: {} };

/** Junk or null give the empty progress. */
export function parseProgress(text: string | null): ExerciseProgress {
  if (text === null) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null) return EMPTY;
    const done = (parsed as { done?: unknown }).done;
    if (typeof done !== 'object' || done === null) return EMPTY;
    const kept: Record<string, { bestS: number; at: string }> = {};
    for (const [id, value] of Object.entries(done)) {
      const entry = value as { bestS?: unknown; at?: unknown } | null;
      if (
        entry &&
        typeof entry.bestS === 'number' &&
        Number.isFinite(entry.bestS) &&
        entry.bestS >= 0
      ) {
        kept[id] = { bestS: entry.bestS, at: typeof entry.at === 'string' ? entry.at : '' };
      }
    }
    return { v: 1, done: kept };
  } catch {
    return EMPTY;
  }
}

/** Keeps the smaller `bestS` and the date of the best. */
export function withDone(
  progress: ExerciseProgress,
  id: string,
  elapsedS: number,
  dateIso: string,
): ExerciseProgress {
  const old = progress.done[id];
  if (old && old.bestS <= elapsedS) return progress;
  return { v: 1, done: { ...progress.done, [id]: { bestS: elapsedS, at: dateIso } } };
}

export function readProgress(): ExerciseProgress {
  try {
    return parseProgress(globalThis.localStorage?.getItem(PROGRESS_KEY) ?? null);
  } catch {
    return EMPTY;
  }
}

/** Reads, adds this run with today's date (YYYY-MM-DD), writes, returns. */
export function recordDone(id: string, elapsedS: number): ExerciseProgress {
  const next = withDone(readProgress(), id, elapsedS, new Date().toISOString().slice(0, 10));
  try {
    globalThis.localStorage?.setItem(PROGRESS_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: the tick is only for this visit.
  }
  return next;
}
