/**
 * The device's ticks and best times for the exercises (PHASE10_SPEC 6.3): kept in `localStorage`
 * (read and written in try/catch, as boatStore.ts). No scores, only a tick and the best time.
 */
export const PROGRESS_KEY = 'sail-learn.exercises';

export interface ExerciseProgress {
  v: 1;
  done: Readonly<Record<string, { bestS: number; at: string }>>;
  /** M81: exercises the app played for the learner (Watch); not a tick. */
  watched: Readonly<Record<string, { at: string }>>;
}

const EMPTY: ExerciseProgress = { v: 1, done: {}, watched: {} };

/** Junk or null give the empty progress. */
export function parseProgress(text: string | null): ExerciseProgress {
  if (text === null) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null) return EMPTY;
    const { done: rawDone, watched: rawWatched } = parsed as { done?: unknown; watched?: unknown };
    const done = typeof rawDone === 'object' && rawDone !== null ? rawDone : {};
    const kept: Record<string, { bestS: number; at: string }> = {};
    const seen: Record<string, { at: string }> = {};
    if (typeof rawWatched === 'object' && rawWatched !== null) {
      for (const [id, value] of Object.entries(rawWatched)) {
        const entry = value as { at?: unknown } | null;
        if (entry) seen[id] = { at: typeof entry.at === 'string' ? entry.at : '' };
      }
    }
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
    return { v: 1, done: kept, watched: seen };
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
  return {
    v: 1,
    done: { ...progress.done, [id]: { bestS: elapsedS, at: dateIso } },
    watched: progress.watched,
  };
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
  return store(withDone(readProgress(), id, elapsedS, new Date().toISOString().slice(0, 10)));
}

/** Reads, adds the Watched mark with today's date, writes, returns (M81). */
export function recordWatched(id: string): ExerciseProgress {
  const old = readProgress();
  return store({
    ...old,
    watched: { ...old.watched, [id]: { at: new Date().toISOString().slice(0, 10) } },
  });
}

function store(next: ExerciseProgress): ExerciseProgress {
  try {
    globalThis.localStorage?.setItem(PROGRESS_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: the mark is only for this visit.
  }
  return next;
}
