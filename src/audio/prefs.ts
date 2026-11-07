import type { SoundPrefs } from './types';

/**
 * The sound setting of this device (PHASE_AUDIO_SPEC 3.1, 3.2). It is not app state and never in
 * the link or the setup file: a shared link must not start sound on someone else's phone. Pure
 * apart from `localStorage`, which every call wraps in try/catch (blocked storage, node).
 */

export const SOUND_KEY = 'sail-learn.sound';

export const DEFAULT_SOUND_PREFS: SoundPrefs = {
  on: false,
  music: true,
  surroundings: true,
  boat: true,
  volume: 70,
};

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function clampVolume(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** JSON → prefs: each missing or wrong-typed field takes its default; bad JSON gives the defaults. */
export function parseSoundPrefs(text: string | null): SoundPrefs {
  if (text === null) return { ...DEFAULT_SOUND_PREFS };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ...DEFAULT_SOUND_PREFS };
  }
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_SOUND_PREFS };
  const o = raw as Record<string, unknown>;
  return {
    on: bool(o.on, DEFAULT_SOUND_PREFS.on),
    music: bool(o.music, DEFAULT_SOUND_PREFS.music),
    surroundings: bool(o.surroundings, DEFAULT_SOUND_PREFS.surroundings),
    boat: bool(o.boat, DEFAULT_SOUND_PREFS.boat),
    volume:
      typeof o.volume === 'number' && Number.isFinite(o.volume)
        ? clampVolume(o.volume)
        : DEFAULT_SOUND_PREFS.volume,
  };
}

let current: SoundPrefs | undefined;
const listeners = new Set<(prefs: SoundPrefs) => void>();

function readStored(): string | null {
  try {
    return globalThis.localStorage?.getItem(SOUND_KEY) ?? null;
  } catch {
    return null;
  }
}

/** The prefs now (read from storage once, on the first call). */
export function getSoundPrefs(): SoundPrefs {
  current ??= parseSoundPrefs(readStored());
  return current;
}

/** Merges, clamps, writes storage, then calls every listener synchronously (so the engine can start in the same tap). */
export function setSoundPrefs(patch: Partial<SoundPrefs>): SoundPrefs {
  const merged = { ...getSoundPrefs(), ...patch };
  current = {
    on: merged.on === true,
    music: merged.music === true,
    surroundings: merged.surroundings === true,
    boat: merged.boat === true,
    volume: Number.isFinite(merged.volume)
      ? clampVolume(merged.volume)
      : DEFAULT_SOUND_PREFS.volume,
  };
  try {
    globalThis.localStorage?.setItem(SOUND_KEY, JSON.stringify(current));
  } catch {
    // Blocked storage: the sound plays for this visit and starts silent on the next.
  }
  for (const listener of [...listeners]) listener(current);
  return current;
}

/** Subscribe; returns the unsubscribe. */
export function onSoundPrefs(listener: (prefs: SoundPrefs) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
